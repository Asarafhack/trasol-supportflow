import sys
import uuid
import hashlib
import asyncio
from datetime import datetime, timedelta
from starlette.responses import Response

sys.path.insert(0, ".")

from app.core.database import SessionLocal
from app.api.endpoints.auth import (
    register,
    verify_otp,
    resend_otp,
    request_login_otp,
    login,
    generate_secure_otp,
    hash_otp
)
from app.schemas.schemas import (
    UserRegister,
    OTPVerifyRequest,
    OTPResendRequest,
    UserLogin
)
from app.models.entities import User
from app.services.email_service import EmailService

mock_dispatches = []

async def mock_send_email(cls, db, to_email, subject, html_content, recipient_type="customer", email_type="general", ticket_id=None, require_brevo=False):
    mock_dispatches.append({
        "to_email": to_email,
        "subject": subject,
        "email_type": email_type,
        "require_brevo": require_brevo
    })
    return None

EmailService.send_email = classmethod(mock_send_email)

def run():
    db = SessionLocal()
    res = Response()
    test_email = f"customer_{uuid.uuid4().hex[:6]}@trasol.tech"
    test_pass = "SecurePass2026!"
    
    print("\n=======================================================", flush=True)
    print("STARTING BREVO OTP & AUTHENTICATION TEST SUITE", flush=True)
    print("=======================================================\n", flush=True)

    # 1. Test OTP Generation & Hashing
    print("TEST 1: Cryptographic OTP Generation & SHA-256 Hashing...", flush=True)
    raw_otp = generate_secure_otp()
    assert len(raw_otp) == 6, "OTP must be 6 digits"
    assert raw_otp.isdigit(), "OTP must be numeric"
    otp_hash = hash_otp(raw_otp)
    assert len(otp_hash) == 64, "SHA-256 hash must be 64 characters"
    assert otp_hash != raw_otp, "Raw OTP must not equal hash"
    print(f"  [PASS] Generated 6-digit OTP: {raw_otp} -> SHA-256 Hash: {otp_hash[:16]}...", flush=True)

    # 2. Test Customer Registration with OTP
    print("\nTEST 2: Customer Registration with Brevo OTP Dispatch...", flush=True)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    reg_payload = UserRegister(
        full_name="Brevo Test User",
        email=test_email,
        password=test_pass,
        terms_accepted=True
    )
    reg_res = loop.run_until_complete(register(user_in=reg_payload, response=res, db=db))
    print(f"  [PASS] Registration response: status={reg_res.status}, dev_otp={reg_res.dev_otp}", flush=True)
    assert reg_res.status == "OTP_SENT"
    assert reg_res.dev_otp is None, "Security Violation: Raw OTP leaked in response!"
    assert len(mock_dispatches) >= 1
    assert mock_dispatches[-1]["to_email"] == test_email
    assert mock_dispatches[-1]["require_brevo"] == True

    # Inspect User in Database
    user = db.query(User).filter(User.email == test_email).first()
    assert user is not None
    assert user.is_verified == False, "Account must remain unverified until OTP check"
    assert user.verification_otp is not None
    assert len(user.verification_otp) == 64, "Database must store SHA-256 hash, not plain OTP"
    assert user.otp_expires_at is not None
    assert user.failed_otp_attempts == 0
    print(f"  [PASS] User stored in DB: is_verified={user.is_verified}, hash={user.verification_otp[:16]}...", flush=True)

    # 3. Test 60-Second Cooldown Enforcement
    print("\nTEST 3: Resend Cooldown (60 Seconds) Enforcement...", flush=True)
    from fastapi import HTTPException
    try:
        loop.run_until_complete(resend_otp(OTPResendRequest(email=test_email), db))
        assert False, "Expected 429 Too Many Requests within 60s cooldown"
    except HTTPException as ex:
        print(f"  [PASS] Successfully rejected rapid resend: HTTP {ex.status_code} ({ex.detail})", flush=True)
        assert ex.status_code == 429
        assert "seconds before requesting" in ex.detail

    # 4. Test Invalid OTP & Failed Attempts Tracking
    print("\nTEST 4: Invalid OTP Detection & Failed Attempts Tracking...", flush=True)
    class DummyReq:
        client = None
    try:
        loop.run_until_complete(verify_otp(OTPVerifyRequest(email=test_email, otp="000000"), res, DummyReq(), db))
        assert False, "Expected 400 Bad Request on wrong OTP"
    except HTTPException as ex:
        print(f"  [PASS] Correctly rejected wrong OTP: HTTP {ex.status_code} ({ex.detail})", flush=True)
        assert ex.status_code == 400
        assert "attempts remaining" in ex.detail
    
    db.refresh(user)
    assert user.failed_otp_attempts == 1
    print(f"  [PASS] Failed attempts counter incremented: {user.failed_otp_attempts}/5", flush=True)

    # 5. Test Expired OTP Rejection
    print("\nTEST 5: Expired OTP Rejection (5-Minute Window)...", flush=True)
    user.otp_expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.commit()
    try:
        loop.run_until_complete(verify_otp(OTPVerifyRequest(email=test_email, otp="123456"), res, DummyReq(), db))
        assert False, "Expected 400 Bad Request on expired OTP"
    except HTTPException as ex:
        print(f"  [PASS] Correctly rejected expired OTP: HTTP {ex.status_code} ({ex.detail})", flush=True)
        assert ex.status_code == 400
        assert "expired" in ex.detail

    # 6. Test Successful Verification
    print("\nTEST 6: Successful OTP Verification & Invalidation...", flush=True)
    new_otp = "852963"
    user.verification_otp = hash_otp(new_otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
    db.commit()

    ver_token = loop.run_until_complete(verify_otp(OTPVerifyRequest(email=test_email, otp=new_otp), res, DummyReq(), db))
    print(f"  [PASS] Token issued: access_token={bool(ver_token.access_token)}, role={ver_token.user.role}", flush=True)
    assert ver_token.access_token is not None
    assert ver_token.user.is_verified == True

    db.refresh(user)
    assert user.is_verified == True
    assert user.verification_otp is None, "OTP hash must be wiped after verification"
    assert user.otp_expires_at is None
    assert user.failed_otp_attempts == 0
    print(f"  [PASS] User state sanitized: is_verified={user.is_verified}, otp_hash={user.verification_otp}", flush=True)

    # 7. Test Password Login (Method A)
    print("\nTEST 7: Method A – Password Login...", flush=True)
    login_token = loop.run_until_complete(login(UserLogin(email=test_email, password=test_pass), res, DummyReq(), db))
    print(f"  [PASS] Password login successful for: {login_token.user.email}", flush=True)
    assert login_token.access_token is not None

    # 8. Test Email OTP Login (Method B)
    print("\nTEST 8: Method B – Email OTP Login...", flush=True)
    user.otp_last_sent_at = datetime.utcnow() - timedelta(seconds=65)
    db.commit()

    otp_login_req = loop.run_until_complete(request_login_otp(OTPResendRequest(email=test_email), db))
    print(f"  [PASS] Login OTP requested: status={otp_login_req.get('status')}", flush=True)
    assert otp_login_req.get("status") == "OTP_SENT"
    assert "dev_otp" not in otp_login_req or otp_login_req.get("dev_otp") is None

    login_code = "741258"
    user.verification_otp = hash_otp(login_code)
    db.commit()

    otp_login_token = loop.run_until_complete(verify_otp(OTPVerifyRequest(email=test_email, otp=login_code), res, DummyReq(), db))
    print(f"  [PASS] Method B Email OTP Login successful! Role: {otp_login_token.user.role}", flush=True)
    assert otp_login_token.access_token is not None

    # 9. Test Primary Admin Login
    print("\nTEST 9: Primary Admin Login (admin@trasol.com / trasol2026)...", flush=True)
    admin_token = loop.run_until_complete(login(UserLogin(email="admin@trasol.com", password="trasol2026"), res, DummyReq(), db))
    print(f"  [PASS] Admin Login successful! Email: {admin_token.user.email}, Role: {admin_token.user.role}", flush=True)
    assert admin_token.user.role == "admin"

    db.close()
    loop.close()
    print("\n=======================================================", flush=True)
    print(">>> ALL 9 TESTS PASSED 100%! ALL CRITERIA VERIFIED <<<", flush=True)
    print("=======================================================\n", flush=True)

if __name__ == "__main__":
    run()
