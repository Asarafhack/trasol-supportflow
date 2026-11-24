import os
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.api.api_v1 import api_router
from app.api.endpoints.ws import router as ws_root_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Trasol SupportDesk 360: Full-Stack Customer Support, Complaint & Real-Time Ticket Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include fallback alias for any clients with doubled /api/v1 prefix
app.include_router(api_router, prefix="/api/v1/api/v1")

# Direct root authentication routes (/login, /register, etc.)
from app.api.endpoints.auth import router as auth_direct_router
app.include_router(auth_direct_router, tags=["Authentication Root Aliases"])

# Include direct WebSocket routes (/ws/notifications and /ws/tickets/{ticket_id})
app.include_router(ws_root_router, prefix="/ws")

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        from app.seed import run_seed
        run_seed()
    except Exception as e:
        print(f"Startup database initialization: {e}")

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
@app.get("/api/v1/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "company": settings.COMPANY_NAME,
        "database": "connected",
        "email_provider": "brevo" if settings.BREVO_API_KEY else "simulation_outbox"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/health"
    }
