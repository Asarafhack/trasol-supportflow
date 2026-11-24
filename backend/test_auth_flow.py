import sys
import asyncio
import uuid
from starlette.responses import Response

from app.core.database import SessionLocal
from app.api.endpoints.auth import register, verify_otp, login, request_login_otp
from app.schemas.schemas import UserRegister, OTPVerifyRequest, UserLogin, OTPResendRequest

async def main():
    print("--- 1. Testing Registration with OTP ---", flush=True)
    db = SessionLocal()
    res = Response()
    test_email = f"user_{uuid.uuid4().hex[:6]}@trasol.test"
    test_pass = "TrasolPass2026!"

    reg_payload = UserRegister(
        full_name="Auto Verified Customer",
        email=test_email,
        password=test_pass,
        terms_accepted=True
    )
    reg_out = await register(reg_payload, res, db)
    print(f"Registration status: {reg_out.status}, Code dispatched: {reg_out.dev_otp}", flush=True)
    assert reg_out.status == "OTP_SENT"
    assert reg_out.dev_otp is not None
    otp_code = reg_out.dev_otp

    print("--- 2. Testing OTP Verification ---", flush=True)
    class DummyReq:
        client = None
    ver_payload = OTPVerifyRequest(email=test_email, otp=otp_code)
    ver_out = await verify_otp(ver_payload, res, DummyReq(), db)
    print(f"OTP Verified! Role: {ver_out.user.role}, Token generated: {bool(ver_out.access_token)}", flush=True)
    assert ver_out.user.is_verified == True
    assert ver_out.access_token is not None

    print("--- 3. Testing Password Login ---", flush=True)
    log_payload = UserLogin(email=test_email, password=test_pass)
    log_out = await login(log_payload, res, DummyReq(), db)
    print(f"Password login success for: {log_out.user.email}", flush=True)
    assert log_out.access_token is not None

    print("--- 4. Testing Email OTP Login Request ---", flush=True)
    req_otp_out = await request_login_otp(OTPResendRequest(email=test_email), db)
    login_otp = req_otp_out.get("dev_otp")
    print(f"Login OTP generated: {login_otp}", flush=True)
    assert login_otp is not None

    print("--- 5. Testing Login with OTP ---", flush=True)
    login_otp_ver = await verify_otp(OTPVerifyRequest(email=test_email, otp=login_otp), res, DummyReq(), db)
    print(f"Login via OTP verified! Role: {login_otp_ver.user.role}", flush=True)
    assert login_otp_ver.access_token is not None

    print("--- 6. Testing Primary Admin Login ---", flush=True)
    admin_log = await login(UserLogin(email="admin@trasol.com", password="trasol2026"), res, DummyReq(), db)
    print(f"Admin login success! Role: {admin_log.user.role}", flush=True)
    assert admin_log.user.role == "admin"

    print("\n=======================================================", flush=True)
    print(">>> ALL 6 AUTHENTICATION & OTP TESTS PASSED 100%! <<<", flush=True)
    print("=======================================================\n", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
