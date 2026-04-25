"""
Email Configuration Service
Manages SMTP settings and email configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()


class EmailConfig:
    """Email SMTP Configuration"""
    
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "True") == "True"
    
    SENDER_EMAIL: str = os.getenv("SENDER_EMAIL", "")
    SENDER_NAME: str = os.getenv("SENDER_NAME", "FasalNet")
    
    MAX_RETRIES: int = int(os.getenv("EMAIL_MAX_RETRIES", "3"))
    RETRY_DELAY: int = int(os.getenv("EMAIL_RETRY_DELAY", "2"))
    
    # OTP Configuration
    OTP_LENGTH: int = 6
    OTP_EXPIRY_MINUTES: int = 5
    MAX_OTP_ATTEMPTS: int = 5
    RESEND_COOLDOWN_SECONDS: int = 60
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required email configuration"""
        required = [cls.SMTP_USERNAME, cls.SMTP_PASSWORD, cls.SENDER_EMAIL]
        return all(required)
