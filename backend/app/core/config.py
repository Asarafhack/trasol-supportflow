import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_FILE = os.path.join(BASE_DIR, "trasol_supportdesk.db").replace("\\", "/")
DEFAULT_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Trasol SupportDesk 360"
    COMPANY_NAME: str = "Trasol Technologies"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "trasol-secret-jwt-key-2026-supersecure-supportflow")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database (Default to SQLite for local portable running, accepts PostgreSQL / Supabase)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE}")
    
    # Brevo Transactional Email Integration
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", os.getenv("BREVO_SENDER_EMAIL", "support@trasol.tech"))
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", os.getenv("BREVO_SENDER_NAME", "Trasol SupportDesk"))
    ADMIN_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", os.getenv("OWNER_NOTIFICATION_EMAIL", "owner@trasol.tech"))
    
    # Aliases for backward compatibility
    BREVO_SENDER_EMAIL: str = os.getenv("MAIL_FROM", os.getenv("BREVO_SENDER_EMAIL", "support@trasol.tech"))
    BREVO_SENDER_NAME: str = os.getenv("MAIL_FROM_NAME", os.getenv("BREVO_SENDER_NAME", "Trasol SupportDesk"))
    OWNER_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", os.getenv("OWNER_NOTIFICATION_EMAIL", "owner@trasol.tech"))
    SUPPORT_INBOX_EMAIL: str = os.getenv("SUPPORT_INBOX_EMAIL", "support@trasol.tech")
    
    # SMTP Fallback
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    # Simulation & Outbox
    ENABLE_EMAIL_SIMULATION: bool = True
    
    # URLs
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    ADMIN_DASHBOARD_URL: str = os.getenv("ADMIN_DASHBOARD_URL", "http://localhost:5173/admin/tickets")
    CUSTOMER_PORTAL_URL: str = os.getenv("CUSTOMER_PORTAL_URL", "http://localhost:5173/customer/tickets")
    
    # File Storage / Attachments
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", DEFAULT_UPLOAD_DIR)
    MAX_ATTACHMENT_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: List[str] = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf", "text/plain", "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
