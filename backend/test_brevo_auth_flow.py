import os
import sys
import inspect
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

test_db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_trasol_auth.db").replace("\\", "/")
if os.path.exists(test_db_file):
    try:
        os.remove(test_db_file)
    except Exception:
        pass
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file}"

from app.core.database import SessionLocal, init_db, engine
from app.models.entities import User, EmailLog, CompanySettings
from app.core.config import settings
from app.core.security import get_password_hash
from app.schemas.schemas import UserRegister, OTPVerifyRequest, OTPResendRequest, UserLogin
from app.api.endpoints.auth import (
    register,
    verify_otp,
    resend_otp,
    request_login_otp,
    login,
    generate_secure_otp,
    hash_otp
)
from app.services.email_service import EmailService

def pr(msg=""):
    print(msg, flush=True)

def run_coroutine(coro):
    """Executes a coroutine and its sub-coroutines synchronously without Winsock loopback deadlocks."""
    stack = [coro]
    val = None
    exc = None
    while stack:
        current = stack[-1]
        try:
            if exc:
                future = current.throw(exc)
                exc = None
            else:
                future = current.send(val)
                val = None
            if inspect.iscoroutine(future):
                stack.append(future)
            elif hasattr(future, "__await__"):
                stack.append(future.__await__())
        except StopIteration as e:
            stack.pop()
            val = e.value
        except BaseException as e:
            stack.pop()
            exc = e
    if exc:
        raise exc
    return val

class DummyResponse:
    def __init__(self):
        self.cookies = {}
    def set_cookie(self, key, value, **kwargs):
        self.cookies[key] = value

class DummyClient:
    host = "127.0.0.1"

class DummyRequest:
    client = DummyClient()

captured_http_calls = []

class MockBrevoResponse:
    status_code = 201
    text = '{"messageId":"<brevo-test-msg-12345@smtp-relay.mailin.fr>"}'
    def json(self):
        return {"messageId": "<brevo-test-msg-12345@smtp-relay.mailin.fr>"}

class MockBrevoClient:
    async def post(self, url, **kwargs):
        captured_http_calls.append({"url": url, **kwargs})
        return MockBrevoResponse()

class MockHttpxAsyncClient:
    def __init__(self, **kwargs):
        pass
    async def __aenter__(self):
        return MockBrevoClient()
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

async def suite():
    pr("=" * 65)
    pr("RUNNING TRASOL SUPPORTDESK BREVO & OTP VERIFICATION SUITE")
    pr("=" * 65)
    init_db()
    db = SessionLocal()

    # Seed company settings and primary admin
    comp = CompanySettings(
        company_name="Trasol Technologies",
        owner_notification_email="owner@trasol.tech",
        support_inbox_email="support@trasol.tech",
        brevo_sender_email="support@trasol.tech",
        brevo_sender_name="Trasol SupportDesk"
    )
    db.add(comp)

    admin_user = User(
        email="admin@trasol.com",
        full_name="Trasol Primary Admin",
        hashed_password=get_password_hash("trasol2026"),
        role="superadmin",
        is_active=True,
        is_verified=True
    )
    db.add(admin_user)
    db.commit()

    try:
        # TEST 1: Missing Brevo API Key strictly fails with HTTP 503
        pr("\n--- TEST 1: Missing Brevo Key HTTP 503 Verification ---")
        with patch.object(settings, "BREVO_API_KEY", ""):
            test_user = User(
                email="unconfigured_test@trasol.tech",
                full_name="Unconfigured Brevo User",
                is_verified=False
            )
            try:
                await EmailService.send_registration_otp_email(db, test_user, "123456")
                pr("FAILED: Did not raise expected exception when Brevo key is missing.")
                assert False
            except HTTPException as exc:
                pr(f"PASSED: Correctly caught HTTPException: status={exc.status_code}, detail='{exc.detail}'")
                assert exc.status_code == 503
                assert "BREVO_API_KEY and MAIL_FROM" in exc.detail

        # TEST 2: Brevo Request Payload & Headers Structure
        pr("\n--- TEST 2: Brevo API Dispatch Payload & Headers Verification ---")
        captured_http_calls.clear()
        with patch("httpx.AsyncClient", MockHttpxAsyncClient):
            with patch.object(settings, "BREVO_API_KEY", "xkeysib-mock-api-key-test-123456"):
                with patch.object(settings, "MAIL_FROM", "support@trasol.tech"):
                    with patch.object(settings, "MAIL_FROM_NAME", "Trasol SupportDesk"):
                        test_user_disp = User(
                            email="dispatch_check@trasol.tech",
                            full_name="Dispatch Customer",
                            is_verified=False
                        )
                        log = await EmailService.send_registration_otp_email(db, test_user_disp, "876543")
                        assert len(captured_http_calls) == 1
                        call = captured_http_calls[0]
                        url = call["url"]
                        headers = call["headers"]
                        payload = call["json"]

                        pr(f"Brevo Target URL: {url}")
                        assert url == "https://api.brevo.com/v3/smtp/email"
                        pr(f"Brevo Headers: {headers}")
                        assert headers["api-key"] == "xkeysib-mock-api-key-test-123456"
                        assert headers["Content-Type"] == "application/json"
                        assert headers["Accept"] == "application/json"
                        pr(f"Brevo Sender: {payload['sender']}")
                        assert payload["sender"]["email"] == "support@trasol.tech"
                        assert payload["sender"]["name"] == "Trasol SupportDesk"
                        pr(f"Brevo Recipient: {payload['to']}")
                        assert payload["to"] == [{"email": "dispatch_check@trasol.tech"}]
                        pr(f"Brevo Subject: {payload['subject']}")
                        assert "876543" in payload["subject"]
                        pr(f"Brevo Message ID Saved: {log.message_id}")
                        pr("PASSED: Brevo API specification 100% matched!")

        # TEST 3: Customer Registration Flow with Real OTP Generation
        pr("\n--- TEST 3: Customer Registration Flow & Secure Hashing ---")
        reg_email = "test_customer_brevo@trasol.tech"
        # Clean any existing test user
        old_u = db.query(User).filter(User.email == reg_email).first()
        if old_u:
            db.delete(old_u)
            db.commit()

        captured_otp = []
        async def mock_send_reg(db, user, otp_code):
            captured_otp.append(otp_code)
            return EmailLog(
                ticket_id=None,
                recipient_email=user.email,
                recipient_type="customer",
                email_type="customer_registration_otp",
                subject=f"OTP [{otp_code}]",
                content_preview=f"OTP: {otp_code}",
                delivery_status="SENT",
                provider="brevo",
                message_id=f"msg-mock-{otp_code}"
            )

        with patch.object(EmailService, "send_registration_otp_email", side_effect=mock_send_reg):
            resp = DummyResponse()
            user_in = UserRegister(
                email=reg_email,
                password="SecureCustomerPass123!",
                confirm_password="SecureCustomerPass123!",
                full_name="Aarav Sharma",
                phone="+919876543210"
            )
            reg_result = await register(user_in=user_in, response=resp, db=db)
            pr(f"Registration Result: status={reg_result.status}, message='{reg_result.message}'")
            pr(f"dev_otp in response (must be None): {reg_result.dev_otp}")
            assert reg_result.status == "OTP_SENT"
            assert reg_result.dev_otp is None, "Security violation: OTP must not be exposed!"

            # Check DB record
            db_user = db.query(User).filter(User.email == reg_email).first()
            assert db_user is not None
            pr(f"User in DB: is_verified={db_user.is_verified}, role={db_user.role}")
            assert db_user.is_verified is False
            pr(f"Stored OTP in DB (SHA-256 hash): {db_user.verification_otp}")
            assert db_user.verification_otp != captured_otp[0]
            assert db_user.verification_otp == hash_otp(captured_otp[0])
            pr("PASSED: Registration securely hashed OTP with SHA-256 and never exposed code in response.")

        # TEST 4: 60-Second Cooldown Enforcement
        pr("\n--- TEST 4: 60-Second Resend Cooldown Enforcement ---")
        try:
            await resend_otp(OTPResendRequest(email=reg_email), db=db)
            pr("FAILED: Cooldown was not enforced on immediate resend!")
            assert False
        except HTTPException as exc:
            pr(f"PASSED: Cooldown caught with HTTP {exc.status_code}: '{exc.detail}'")
            assert exc.status_code == 429
            assert "Please wait" in exc.detail

        # TEST 5: Incorrect OTP Attempts & Invalidation
        pr("\n--- TEST 5: Failed Verification Attempts & Invalidation ---")
        req = DummyRequest()
        for attempt in range(1, 5):
            try:
                await verify_otp(OTPVerifyRequest(email=reg_email, otp="000000"), response=resp, request=req, db=db)
                assert False
            except HTTPException as exc:
                pr(f"Attempt {attempt}: caught HTTP {exc.status_code} - '{exc.detail}'")
                assert exc.status_code == 400

        # 5th attempt invalidates OTP
        try:
            await verify_otp(OTPVerifyRequest(email=reg_email, otp="000000"), response=resp, request=req, db=db)
            assert False
        except HTTPException as exc:
            pr(f"Attempt 5 (Lockout): caught HTTP {exc.status_code} - '{exc.detail}'")
            assert exc.status_code == 429
            assert "invalidated" in exc.detail.lower()

        db.refresh(db_user)
        assert db_user.verification_otp is None
        pr("PASSED: OTP was invalidated after 5 failed attempts.")

        # TEST 6: 5-Minute Expiry Enforcement
        pr("\n--- TEST 6: 5-Minute Expiry Enforcement ---")
        # Set an expired OTP
        expired_otp = "998877"
        db_user.verification_otp = hash_otp(expired_otp)
        db_user.otp_expires_at = datetime.utcnow() - timedelta(minutes=1)
        db_user.otp_last_sent_at = datetime.utcnow() - timedelta(minutes=2)
        db.commit()

        try:
            await verify_otp(OTPVerifyRequest(email=reg_email, otp=expired_otp), response=resp, request=req, db=db)
            assert False
        except HTTPException as exc:
            pr(f"PASSED: Expired OTP caught with HTTP {exc.status_code}: '{exc.detail}'")
            assert exc.status_code == 400
            assert "expired" in exc.detail.lower()

        # TEST 7: Successful OTP Verification & Account Activation
        pr("\n--- TEST 7: Successful OTP Verification & Dual Email Dispatch ---")
        active_otp = "654321"
        db_user.verification_otp = hash_otp(active_otp)
        db_user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
        db.commit()

        welcome_emails_sent = []
        async def mock_reg_emails(db, user):
            welcome_emails_sent.append(user.email)
            return []

        with patch.object(EmailService, "send_registration_emails", side_effect=mock_reg_emails):
            auth_token = await verify_otp(OTPVerifyRequest(email=reg_email, otp=active_otp), response=resp, request=req, db=db)
            pr(f"Token Issued: type={auth_token.token_type}, access_token={auth_token.access_token[:20]}...")
            assert auth_token.access_token is not None
            assert len(welcome_emails_sent) == 1
            pr("Dispatched welcome and admin alert emails successfully!")

            db.refresh(db_user)
            pr(f"User state after verification: is_verified={db_user.is_verified}, verification_otp={db_user.verification_otp}")
            assert db_user.is_verified is True
            assert db_user.verification_otp is None
            pr("PASSED: Verification activated account, cleared OTP, and issued tokens.")

        # TEST 8: Dual Login - Method A (Email + Password)
        pr("\n--- TEST 8: Login Method A (Email + Password) ---")
        # 8a. Verified user login succeeds
        resp = DummyResponse()
        login_res = await login(
            credentials=UserLogin(email=reg_email, password="SecureCustomerPass123!"),
            response=resp,
            request=req,
            db=db
        )
        pr(f"Password Login Succeeded for {reg_email}: token={login_res.access_token[:20]}...")
        assert login_res.access_token is not None

        # 8b. Primary admin login succeeds
        admin_login = await login(
            credentials=UserLogin(email="admin@trasol.com", password="trasol2026"),
            response=resp,
            request=req,
            db=db
        )
        pr(f"Password Login Succeeded for admin@trasol.com: role={admin_login.user.role}")
        assert admin_login.user.role in ("admin", "superadmin")

        # 8c. Unverified user login is blocked
        unverified_email = "unverified_cust@trasol.tech"
        old_unv = db.query(User).filter(User.email == unverified_email).first()
        if old_unv:
            db.delete(old_unv)
            db.commit()
        unv_user = User(
            email=unverified_email,
            full_name="Unverified User",
            hashed_password=get_password_hash("SomePass123!"),
            is_active=True,
            is_verified=False
        )
        db.add(unv_user)
        db.commit()

        try:
            await login(
                credentials=UserLogin(email=unverified_email, password="SomePass123!"),
                response=resp,
                request=req,
                db=db
            )
            assert False
        except HTTPException as exc:
            pr(f"PASSED: Unverified login blocked with HTTP {exc.status_code}: '{exc.detail}'")
            assert exc.status_code == 403
            assert "not verified" in exc.detail.lower()

        # TEST 9: Dual Login - Method B (Email OTP Login)
        pr("\n--- TEST 9: Login Method B (Email OTP Login) ---")
        login_otp_captured = []
        async def mock_login_otp(db, user, otp_code):
            login_otp_captured.append(otp_code)
            return EmailLog(
                ticket_id=None,
                recipient_email=user.email,
                recipient_type="customer",
                email_type="customer_login_otp",
                subject=f"Login Code [{otp_code}]",
                content_preview=f"Login OTP: {otp_code}",
                delivery_status="SENT",
                provider="brevo",
                message_id=f"msg-login-mock-{otp_code}"
            )

        with patch.object(EmailService, "send_login_otp_email", side_effect=mock_login_otp):
            # Reset cooldown timestamp to allow immediate request
            db_user.otp_last_sent_at = datetime.utcnow() - timedelta(minutes=2)
            db.commit()

            req_res = await request_login_otp(OTPResendRequest(email=reg_email), db=db)
            pr(f"Request Login OTP response: status={req_res['status']}, msg='{req_res['message']}'")
            assert req_res["status"] == "OTP_SENT"
            sent_code = login_otp_captured[0]
            pr(f"Dispatched Login OTP via Brevo: {sent_code}")

            # Verify OTP for login
            otp_login_res = await verify_otp(
                payload=OTPVerifyRequest(email=reg_email, otp=sent_code),
                response=resp,
                request=req,
                db=db
            )
            pr(f"Email OTP Login Succeeded: token={otp_login_res.access_token[:20]}...")
            assert otp_login_res.access_token is not None
            assert otp_login_res.user.email == reg_email
            pr("PASSED: Email OTP Login completed seamlessly and issued valid JWT session!")

        pr("\n" + "=" * 65)
        pr("ALL 9 BREVO & OTP INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
        pr("=" * 65 + "\n")

    finally:
        db.close()
        engine.dispose()

if __name__ == "__main__":
    run_coroutine(suite())
