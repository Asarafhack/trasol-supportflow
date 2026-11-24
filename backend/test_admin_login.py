import os
import sys
import inspect
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.entities import User
from app.core.security import verify_password, decode_token
from app.api.endpoints.auth import login
from app.api.endpoints.admin import get_admin_dashboard_stats
from app.schemas.schemas import UserLogin

def run_coroutine(coro):
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

def test_admin_flow():
    print("=" * 65, flush=True)
    print("TESTING ADMIN LOGIN & DASHBOARD ACCESS (admin@trasol.com)", flush=True)
    print("=" * 65, flush=True)

    db = SessionLocal()
    try:
        # 1. Database Check
        print("\n1. Checking admin@trasol.com in active database...", flush=True)
        admin = db.query(User).filter(User.email == "admin@trasol.com").first()
        assert admin is not None, "admin@trasol.com was not found in database!"
        print(f"   Found User ID : {admin.id}", flush=True)
        print(f"   Full Name     : {admin.full_name}", flush=True)
        print(f"   Role          : {admin.role}", flush=True)
        print(f"   Active        : {admin.is_active}", flush=True)
        print(f"   Verified      : {admin.is_verified}", flush=True)
        assert admin.is_active, "Admin account is inactive!"
        assert admin.is_verified, "Admin account is unverified!"

        # 2. Password Hash Verification
        print("\n2. Verifying password hash using authentication function...", flush=True)
        is_pw_valid = verify_password("trasol2026", admin.hashed_password)
        print(f"   Password 'trasol2026' matches hash: {is_pw_valid}", flush=True)
        assert is_pw_valid, "Password 'trasol2026' did not match stored hash!"

        # 3. Login Endpoint Execution
        print("\n3. Executing POST /api/v1/auth/login endpoint...", flush=True)
        resp = DummyResponse()
        req = DummyRequest()
        creds = UserLogin(email="admin@trasol.com", password="trasol2026")
        token_payload = run_coroutine(login(credentials=creds, response=resp, request=req, db=db))

        print(f"   Login Status  : HTTP 200 OK", flush=True)
        print(f"   Token Type    : {token_payload.token_type}", flush=True)
        print(f"   Access Token  : {token_payload.access_token[:28]}...", flush=True)
        print(f"   Refresh Token : {token_payload.refresh_token[:28]}...", flush=True)
        print(f"   Cookie Set    : {'access_token' in resp.cookies}", flush=True)
        assert token_payload.access_token is not None

        # Verify decoded token payload
        decoded = decode_token(token_payload.access_token)
        print(f"   Decoded Sub   : {decoded.get('sub')}", flush=True)
        print(f"   Decoded Role  : {decoded.get('role')}", flush=True)
        assert decoded.get("sub") == admin.id
        assert decoded.get("role") in ("admin", "superadmin")

        # 4. Admin Dashboard Access Execution
        print("\n4. Calling Admin Dashboard operations endpoint...", flush=True)
        stats = run_coroutine(get_admin_dashboard_stats(current_user=admin, db=db))

        print(f"   Total Tickets        : {stats.get('total_tickets')}", flush=True)
        print(f"   Open Tickets         : {stats.get('open_tickets')}", flush=True)
        print(f"   Resolved Tickets     : {stats.get('resolved_tickets')}", flush=True)
        print(f"   Total Customers      : {stats.get('total_customers')}", flush=True)
        print(f"   SLA Compliance Rate  : {stats.get('sla_compliance_rate')}%", flush=True)
        print(f"   Avg Resolution Hours : {stats.get('avg_resolution_hours')}h", flush=True)

        print("\n" + "=" * 65, flush=True)
        print("ALL ADMIN AUTHENTICATION & DASHBOARD TESTS PASSED WITH 100% SUCCESS!", flush=True)
        print("=" * 65, flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    test_admin_flow()
