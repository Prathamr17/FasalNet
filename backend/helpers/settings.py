"""
FasalNet – Central Configuration
All settings read from environment variables with sensible defaults.
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # ── App ───────────────────────────────────────────────────
    SECRET_KEY       = os.getenv("SECRET_KEY", "fasalnet-dev-secret-change-me")
    DEBUG            = os.getenv("FLASK_DEBUG", "0") == "1"

    # ── Database ──────────────────────────────────────────────
    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "5432")
    DB_NAME     = os.getenv("DB_NAME", "fasalnet")
    DB_USER     = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

    DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL")

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY            = os.getenv("JWT_SECRET_KEY", "jwt-fasalnet-secret")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=24)

    # ── Redis (optional cache) ────────────────────────────────
    REDIS_URL    = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CACHE_TTL    = int(os.getenv("CACHE_TTL", "300"))   # 5 minutes

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # ── Email (SMTP) ──────────────────────────────────────────
    SMTP_SERVER   = os.getenv("SMTP_SERVER",   "smtp.gmail.com")
    SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS  = os.getenv("SMTP_USE_TLS",  "True") == "True"
    SENDER_EMAIL  = os.getenv("SENDER_EMAIL",  "")
    SENDER_NAME   = os.getenv("SENDER_NAME",   "FasalNet")

    # ── OTP ───────────────────────────────────────────────────
    OTP_LENGTH               = int(os.getenv("OTP_LENGTH",               "6"))
    OTP_EXPIRY_MINUTES       = int(os.getenv("OTP_EXPIRY_MINUTES",       "5"))
    MAX_OTP_ATTEMPTS         = int(os.getenv("MAX_OTP_ATTEMPTS",         "5"))
    RESEND_COOLDOWN_SECONDS  = int(os.getenv("RESEND_COOLDOWN_SECONDS",  "60"))
