"""
OTP Model — FasalNet
Database operations for OTP records.
"""
import logging
from uuid import uuid4
from datetime import datetime, timezone
from utils.db import query

logger = logging.getLogger(__name__)


class OTPModel:
    @staticmethod
    def create(email: str, purpose: str, otp_hash: str, expires_at: datetime):
        try:
            return query(
                """INSERT INTO otp_codes (id, email, otp_hash, purpose, expires_at,
                                          attempt_count, is_verified, created_at)
                   VALUES (%s,%s,%s,%s,%s,0,FALSE,%s)
                   RETURNING id, email, purpose, expires_at, attempt_count, is_verified, created_at""",
                (str(uuid4()), email, otp_hash, purpose, expires_at, datetime.now(timezone.utc)),
                commit=True,
            )
        except Exception as e:
            logger.error("OTPModel.create error: %s", e)
            return None

    @staticmethod
    def get_latest(email: str, purpose: str):
        try:
            return query(
                """SELECT id, email, otp_hash, purpose, expires_at,
                          attempt_count, is_verified, created_at
                   FROM otp_codes
                   WHERE email=%s AND purpose=%s AND is_verified=FALSE
                   ORDER BY created_at DESC LIMIT 1""",
                (email, purpose),
                fetchone=True,
            )
        except Exception as e:
            logger.error("OTPModel.get_latest error: %s", e)
            return None

    @staticmethod
    def increment_attempts(otp_id: str) -> bool:
        try:
            query("UPDATE otp_codes SET attempt_count=attempt_count+1 WHERE id=%s",
                  (otp_id,), commit=True)
            return True
        except Exception as e:
            logger.error("OTPModel.increment_attempts error: %s", e)
            return False

    @staticmethod
    def mark_verified(otp_id: str) -> bool:
        try:
            query("UPDATE otp_codes SET is_verified=TRUE WHERE id=%s", (otp_id,), commit=True)
            return True
        except Exception as e:
            logger.error("OTPModel.mark_verified error: %s", e)
            return False
