"""
OTP Service — FasalNet
Handles OTP generation, storage, verification and notifications.
"""
import os
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

from utils.otp_utils import OTPUtils
from utils.db import query
from models.otp_model import OTPModel
from services.email_service import get_email_service

load_dotenv()
logger = logging.getLogger(__name__)

OTP_LENGTH             = int(os.getenv("OTP_LENGTH",              "6"))
OTP_EXPIRY_MINUTES     = int(os.getenv("OTP_EXPIRY_MINUTES",      "5"))
MAX_OTP_ATTEMPTS       = int(os.getenv("MAX_OTP_ATTEMPTS",        "5"))
RESEND_COOLDOWN_SECONDS= int(os.getenv("RESEND_COOLDOWN_SECONDS", "60"))


class OTPService:
    def __init__(self):
        self.email_service = get_email_service()

    # ── Send OTP ─────────────────────────────────────────────────────────────
    def send_otp(self, email: str, purpose: str = "SIGNUP") -> tuple:
        if purpose not in ("SIGNUP", "FORGOT_PASSWORD"):
            return False, "Invalid OTP purpose"
        try:
            # Rate-limit check
            latest = OTPModel.get_latest(email, purpose)
            if latest:
                created_at = latest["created_at"]
                if not OTPUtils.can_resend(created_at, RESEND_COOLDOWN_SECONDS):
                    elapsed = int((datetime.now(timezone.utc) - created_at).total_seconds())
                    wait = RESEND_COOLDOWN_SECONDS - elapsed
                    return False, f"Please wait {wait} seconds before requesting a new OTP"

            otp        = OTPUtils.generate_otp(OTP_LENGTH)
            otp_hash   = OTPUtils.hash_otp(otp)
            expires_at = OTPUtils.get_expiry_time(OTP_EXPIRY_MINUTES)

            record = OTPModel.create(email, purpose, otp_hash, expires_at)
            if not record:
                return False, "Failed to generate OTP"

            sent = self.email_service.send_otp_email(email, otp, purpose)
            if not sent:
                return False, "Failed to send OTP email"

            logger.info("OTP sent to %s for %s", email, purpose)
            return True, "OTP sent successfully"
        except Exception as exc:
            logger.error("send_otp error for %s: %s", email, exc)
            return False, "Failed to send OTP"

    # ── Verify OTP ───────────────────────────────────────────────────────────
    def verify_otp(self, email: str, otp: str, purpose: str = "SIGNUP") -> tuple:
        try:
            record = OTPModel.get_latest(email, purpose)
            if not record:
                return False, "No active OTP found"
            if OTPUtils.is_expired(record["expires_at"]):
                return False, "OTP has expired"
            if record["attempt_count"] >= MAX_OTP_ATTEMPTS:
                return False, "Too many failed attempts"
            if not OTPUtils.verify_otp(otp, record["otp_hash"]):
                OTPModel.increment_attempts(record["id"])
                return False, "Invalid OTP"
            OTPModel.mark_verified(record["id"])
            logger.info("OTP verified for %s", email)
            return True, "OTP verified successfully"
        except Exception as exc:
            logger.error("verify_otp error for %s: %s", email, exc)
            return False, "OTP verification failed"

    # ── Generic notification ─────────────────────────────────────────────────
    def send_notification(self, email: str, title: str, message: str,
                          action_url: str = None) -> bool:
        try:
            return self.email_service.send_notification_email(email, title, message, action_url)
        except Exception as exc:
            logger.error("send_notification error for %s: %s", email, exc)
            return False


_otp_service = None

def get_otp_service() -> OTPService:
    global _otp_service
    if _otp_service is None:
        _otp_service = OTPService()
    return _otp_service
