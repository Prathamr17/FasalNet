"""
OTP Utility Functions
Handles OTP generation, hashing, and validation
"""
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


class OTPUtils:
    """OTP utility functions"""
    
    OTP_LENGTH: int = 6
    
    @staticmethod
    def generate_otp(length: int = OTP_LENGTH) -> str:
        """
        Generate a random numeric OTP
        
        Args:
            length: Length of OTP (default: 6)
        
        Returns:
            str: Random OTP string
        """
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    @staticmethod
    def hash_otp(otp: str) -> str:
        """
        Hash OTP using SHA256
        
        Args:
            otp: Plain OTP string
        
        Returns:
            str: Hashed OTP
        """
        return hashlib.sha256(otp.encode()).hexdigest()
    
    @staticmethod
    def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
        """
        Verify plain OTP against hashed OTP
        
        Args:
            plain_otp: Plain OTP string
            hashed_otp: Hashed OTP from database
        
        Returns:
            bool: True if OTP matches, False otherwise
        """
        return hashlib.sha256(plain_otp.encode()).hexdigest() == hashed_otp
    
    @staticmethod
    def get_expiry_time(minutes: int = 5) -> datetime:
        """
        Get OTP expiry timestamp
        
        Args:
            minutes: Expiry time in minutes
        
        Returns:
            datetime: Future timestamp when OTP expires
        """
        return datetime.now(timezone.utc) + timedelta(minutes=minutes)
    
    @staticmethod
    def is_expired(expires_at: datetime) -> bool:
        """
        Check if OTP is expired
        
        Args:
            expires_at: Expiry datetime
        
        Returns:
            bool: True if expired, False otherwise
        """
        return datetime.now(timezone.utc) > expires_at

    
    @staticmethod
    def can_resend(created_at: datetime, cooldown_seconds: int = 60) -> bool:
        """
        Check if enough time has passed to resend OTP
        
        Args:
            created_at: OTP creation timestamp
            cooldown_seconds: Seconds to wait before resend
        
        Returns:
            bool: True if resend is allowed, False otherwise
        """
        elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
        return elapsed >= cooldown_seconds
