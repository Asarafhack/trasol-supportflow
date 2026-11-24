import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Configure SQLite or PostgreSQL
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
        "timeout": 30.0
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

# Enable WAL mode and busy timeout for concurrent SQLite reads/writes
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Import all models before create_all
    import app.models  # noqa
    Base.metadata.create_all(bind=engine)
