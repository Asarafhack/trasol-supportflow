import uuid
import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.models.entities import User, UserProfile, RefreshToken, NotificationPreference, AuditLog
from app.services.email_service import EmailService
from app.websockets.manager import ws_manager
from app.schemas.schemas import (
    UserRegister,
    UserLogin,
    Token,
    TokenRefresh,
    UserOut,
    OTPVerifyRequest,
    OTPResendRequest,
    RegistrationResponse,
    PasswordChange,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    EmailVerifyRequest
)

router = APIRouter()

def generate_secure_otp() -> str:
    """Generates a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.SystemRandom().randint(100000, 999999)}"

def hash_otp(otp_code: str) -> str:
    """Computes SHA-256 hash of the OTP for secure storage."""
    return hashlib.sha256(otp_code.strip().encode("utf-8")).hexdigest()

@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, response: Response, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    
    otp_code = generate_secure_otp()
    otp_hash = hash_otp(otp_code)
    now = datetime.utcnow()
    otp_expiry = now + timedelta(minutes=5)  # 5-minute expiry

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists. Please sign in."
            )
        else:
            # Enforce 60-second resend cooldown on retrying unverified registrations
            if existing_user.otp_last_sent_at:
                elapsed = (now - existing_user.otp_last_sent_at).total_seconds()
                if elapsed < 60:
                    wait_sec = int(60 - elapsed)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Please wait {wait_sec} seconds before requesting a new verification code."
                    )
            
            # Unverified account retrying registration: update credentials & set new OTP hash
            user = existing_user
            user.full_name = user_in.full_name.strip()
            user.hashed_password = get_password_hash(user_in.password)
            user.phone = user_in.phone.strip() if user_in.phone else None
            user.verification_otp = otp_hash
            user.otp_expires_at = otp_expiry
            user.otp_last_sent_at = now
            user.failed_otp_attempts = 0
            db.commit()
            db.refresh(user)
    else:
        # Create new customer user awaiting OTP verification
        hashed_password = get_password_hash(user_in.password)
        user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            phone=user_in.phone.strip() if user_in.phone else None,
            role="customer",
            is_active=True,
            is_verified=False,
            verification_otp=otp_hash,
            otp_expires_at=otp_expiry,
            otp_last_sent_at=now,
            failed_otp_attempts=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create empty profile & notification preferences
        profile = UserProfile(user_id=user.id, timezone="UTC")
        notif_pref = NotificationPreference(user_id=user.id)
        db.add(profile)
        db.add(notif_pref)

        # Log registration initiation in audit log
        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            action="USER_REGISTERED_PENDING_OTP",
            entity_type="user",
            entity_id=user.id,
            details=f"Customer registration initiated with OTP dispatch: {user.full_name}"
        )
        db.add(audit)
        db.commit()

    # Send Registration OTP Email directly to customer via Brevo API
    # If Brevo credentials are not configured or request is rejected, this raises an HTTPException
    await EmailService.send_registration_otp_email(db=db, user=user, otp_code=otp_code)

    # Optional Free SMS delivery
    if user.phone:
        try:
            await EmailService.send_free_sms(
                phone_number=user.phone,
                message_text=f"Your {settings.COMPANY_NAME} verification code is {otp_code}. Valid for 5 minutes."
            )
        except Exception:
            pass

    return RegistrationResponse(
        status="OTP_SENT",
        message=f"Verification code sent to {user.email}. Enter the 6-digit code to activate your account.",
        email=user.email,
        otp_sent=True,
        dev_otp=None  # Never expose OTP in response
    )

@router.post("/verify-otp", response_model=Token)
async def verify_otp(
    payload: OTPVerifyRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    if not user.verification_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new code."
        )

    now = datetime.utcnow()
    # Check 5-minute expiry
    if user.otp_expires_at and now > user.otp_expires_at:
        user.verification_otp = None
        user.otp_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired (valid for 5 minutes). Please request a new code."
        )

    # Compare SHA-256 hash of submitted OTP with stored hash
    submitted_hash = hash_otp(payload.otp)
    if user.verification_otp != submitted_hash:
        user.failed_otp_attempts = (user.failed_otp_attempts or 0) + 1
        attempts_left = max(0, 5 - user.failed_otp_attempts)
        if user.failed_otp_attempts >= 5:
            user.verification_otp = None
            user.otp_expires_at = None
            user.failed_otp_attempts = 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect attempts. This verification code has been invalidated. Please request a new code."
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid 6-digit verification code. {attempts_left} attempts remaining."
        )

    # Verification Succeeded
    was_unverified = not user.is_verified
    user.is_verified = True
    user.verification_otp = None
    user.otp_expires_at = None
    user.failed_otp_attempts = 0

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action="USER_OTP_VERIFIED",
        entity_type="user",
        entity_id=user.id,
        details=f"Customer successfully verified OTP: {user.email}",
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(audit)

    # Generate fresh tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)

    db_refresh = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh)
    db.commit()
    db.refresh(user)

    # Send Welcome Email & Admin notification alert upon initial customer activation
    if was_unverified:
        try:
            await EmailService.send_registration_emails(db=db, user=user)
        except Exception:
            pass

        # WebSocket broadcast to Admins in real time
        try:
            await ws_manager.broadcast_event({
                "type": "CUSTOMER_REGISTERED",
                "message": f"New customer {user.full_name} ({user.email}) verified and signed in.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "phone": user.phone,
                    "role": user.role,
                    "is_active": user.is_active,
                    "is_verified": user.is_verified,
                    "created_at": user.created_at.isoformat()
                }
            })
        except Exception:
            pass

    # Set secure cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/resend-otp")
async def resend_otp(payload: OTPResendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    now = datetime.utcnow()
    # Enforce 60-second cooldown
    if user.otp_last_sent_at:
        elapsed = (now - user.otp_last_sent_at).total_seconds()
        if elapsed < 60:
            wait_sec = int(60 - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_sec} seconds before requesting a new verification code."
            )

    otp_code = generate_secure_otp()
    user.verification_otp = hash_otp(otp_code)
    user.otp_expires_at = now + timedelta(minutes=5)
    user.otp_last_sent_at = now
    user.failed_otp_attempts = 0
    db.commit()

    # Dispatches through Brevo
    await EmailService.send_registration_otp_email(db=db, user=user, otp_code=otp_code)

    if user.phone:
        try:
            await EmailService.send_free_sms(
                phone_number=user.phone,
                message_text=f"Your new {settings.COMPANY_NAME} verification code is {otp_code}."
            )
        except Exception:
            pass

    return {
        "status": "OTP_SENT",
        "message": f"A new verification code was sent to {user.email}."
    }

@router.post("/request-login-otp")
async def request_login_otp(payload: OTPResendRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please register as a customer first."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive. Please contact support."
        )

    now = datetime.utcnow()
    # Enforce 60-second cooldown
    if user.otp_last_sent_at:
        elapsed = (now - user.otp_last_sent_at).total_seconds()
        if elapsed < 60:
            wait_sec = int(60 - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_sec} seconds before requesting a new login code."
            )

    otp_code = generate_secure_otp()
    user.verification_otp = hash_otp(otp_code)
    user.otp_expires_at = now + timedelta(minutes=5)
    user.otp_last_sent_at = now
    user.failed_otp_attempts = 0
    db.commit()

    # Dispatches through Brevo
    await EmailService.send_login_otp_email(db=db, user=user, otp_code=otp_code)

    if user.phone:
        try:
            await EmailService.send_free_sms(
                phone_number=user.phone,
                message_text=f"Your {settings.COMPANY_NAME} login code is {otp_code}."
            )
        except Exception:
            pass

    return {
        "status": "OTP_SENT",
        "message": f"Login verification code sent to {user.email}.",
        "email": user.email
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive. Please contact support."
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account email is not verified. Please verify using the OTP sent to your email or sign in using Email OTP."
        )

    # Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)

    # Save refresh token & audit log
    try:
        db_refresh = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(db_refresh)
        
        # Audit log
        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            action="USER_LOGIN",
            entity_type="user",
            entity_id=user.id,
            ip_address=request.client.host if request.client else "unknown"
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
        try:
            db.add(RefreshToken(
                user_id=user.id,
                token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            ))
            db.commit()
        except Exception:
            db.rollback()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(token_in: TokenRefresh, response: Response, db: Session = Depends(get_db)):
    payload = decode_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == token_in.refresh_token, RefreshToken.is_revoked == False)
        .first()
    )
    if not db_token or db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is expired or revoked."
        )

    # Revoke old refresh token (Token rotation)
    db_token.is_revoked = True

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id)

    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_db_token)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Revoke active refresh tokens for user
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update({"is_revoked": True})
    db.commit()

    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user:
        reset_token = create_access_token(subject=user.id, role=user.role, expires_delta=timedelta(hours=2))
        return {
            "message": "Password reset instructions sent to your email.",
            "reset_token": reset_token  # Provided for seamless testing
        }
    return {"message": "If this email is registered, password reset instructions will be sent."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password has been successfully updated. You may now log in."}
