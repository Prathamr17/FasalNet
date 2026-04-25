"""
Password Reset Helper — FasalNet
"""
import logging
from werkzeug.security import generate_password_hash
from utils.db import query
from utils.otp_utils import OTPUtils
from models.otp_model import OTPModel

logger = logging.getLogger(__name__)
MAX_OTP_ATTEMPTS = 5


class PasswordResetHelper:
    @staticmethod
    def reset_password(email: str, otp: str, new_password: str) -> tuple:
        try:
            record = OTPModel.get_latest(email, "FORGOT_PASSWORD")
            if not record:
                return False, "No active OTP found"
            if OTPUtils.is_expired(record["expires_at"]):
                return False, "OTP has expired"
            if record["attempt_count"] >= MAX_OTP_ATTEMPTS:
                return False, "Too many failed attempts"
            if not OTPUtils.verify_otp(otp, record["otp_hash"]):
                OTPModel.increment_attempts(record["id"])
                return False, "Invalid OTP"

            user = query("SELECT id FROM users WHERE email=%s", (email,), fetchone=True)
            if not user:
                return False, "User not found"

            query("UPDATE users SET password_hash=%s, updated_at=NOW() WHERE id=%s",
                  (generate_password_hash(new_password), user["id"]), commit=True)
            OTPModel.mark_verified(record["id"])
            logger.info("Password reset successful for %s", email)
            return True, "Password reset successful"
        except Exception as e:
            logger.error("reset_password error for %s: %s", email, e)
            return False, "Password reset failed"

    @staticmethod
    def validate_password_strength(password: str) -> tuple:
        if len(password) < 6:
            return False, "Password must be at least 6 characters"
        if len(password) > 128:
            return False, "Password too long"
        return True, "OK"
