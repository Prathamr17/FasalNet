"""
Email Service — FasalNet
Handles all outgoing emails via Gmail SMTP
"""
import os
import smtplib
import time
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config read directly from env (avoids config package naming conflict) ────
SMTP_SERVER   = os.getenv("SMTP_SERVER",   "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS  = os.getenv("SMTP_USE_TLS",  "True") == "True"
SENDER_EMAIL  = os.getenv("SENDER_EMAIL",  "")
SENDER_NAME   = os.getenv("SENDER_NAME",   "FasalNet")
MAX_RETRIES   = int(os.getenv("EMAIL_MAX_RETRIES", "3"))
RETRY_DELAY   = int(os.getenv("EMAIL_RETRY_DELAY", "2"))


class EmailService:
    def _connect(self):
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        return server

    def send_email(self, to_email: str, subject: str, message: str,
                   html_content: Optional[str] = None) -> bool:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.warning("Email credentials not configured – skipping send to %s", to_email)
            return False
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                msg = MIMEMultipart("alternative")
                msg["From"]    = f"{SENDER_NAME} <{SENDER_EMAIL}>"
                msg["To"]      = to_email
                msg["Subject"] = subject
                msg.attach(MIMEText(message, "plain"))
                if html_content:
                    msg.attach(MIMEText(html_content, "html"))
                srv = self._connect()
                srv.send_message(msg)
                srv.quit()
                logger.info("Email sent to %s | %s", to_email, subject)
                return True
            except Exception as exc:
                logger.error("Email attempt %d/%d failed for %s: %s", attempt, MAX_RETRIES, to_email, exc)
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY)
        logger.error("All email attempts failed for %s", to_email)
        return False

    def send_otp_email(self, email: str, otp: str, purpose: str = "SIGNUP") -> bool:
        label = {"SIGNUP": "Sign Up", "FORGOT_PASSWORD": "Password Reset"}.get(purpose, "Verification")
        subject = f"Your {label} OTP — FasalNet"
        plain = f"Hello,\n\nYour {label} OTP is: {otp}\n\nExpires in 5 minutes. Do not share.\n\n— FasalNet"
        html = f"""<html><body style="font-family:Arial,sans-serif;color:#333">
  <div style="max-width:520px;margin:0 auto;padding:28px;border:1px solid #ddd;border-radius:10px">
    <h2 style="color:#2c5f2d">FasalNet — {label}</h2>
    <p>Your OTP is:</p>
    <div style="background:#f5f5f5;padding:22px;border-radius:8px;text-align:center;margin:18px 0">
      <h1 style="letter-spacing:8px;margin:0;color:#2c5f2d;font-size:2rem">{otp}</h1>
    </div>
    <p style="color:#e74c3c;font-weight:bold">Expires in 5 minutes</p>
    <p style="color:#888;font-size:12px">FasalNet will never ask for your OTP.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#888;font-size:12px">— FasalNet Team</p>
  </div></body></html>"""
        return self.send_email(email, subject, plain, html)

    def send_booking_confirmation(self, email: str, farmer_name: str, storage_name: str,
                                  quantity: float, total_price: float, booking_id: int) -> bool:
        subject = f"Booking Confirmed ✅ — #{booking_id} | FasalNet"
        plain = (f"Hello {farmer_name},\n\nBooking #{booking_id} confirmed!\n"
                 f"Storage: {storage_name}\nQuantity: {quantity} kg\nTotal: ₹{total_price}\n\n— FasalNet")
        html = f"""<html><body style="font-family:Arial,sans-serif;color:#333">
  <div style="max-width:520px;margin:0 auto;padding:28px;border:1px solid #ddd;border-radius:10px">
    <h2 style="color:#2c5f2d">Booking Confirmed ✅</h2>
    <p>Hello <b>{farmer_name}</b>, your booking has been <b>confirmed</b>!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9f9f9"><td style="padding:10px;border:1px solid #eee"><b>Booking ID</b></td><td style="padding:10px;border:1px solid #eee">#{booking_id}</td></tr>
      <tr><td style="padding:10px;border:1px solid #eee"><b>Storage</b></td><td style="padding:10px;border:1px solid #eee">{storage_name}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px;border:1px solid #eee"><b>Quantity</b></td><td style="padding:10px;border:1px solid #eee">{quantity} kg</td></tr>
      <tr><td style="padding:10px;border:1px solid #eee"><b>Total Price</b></td><td style="padding:10px;border:1px solid #eee">&#8377;{total_price}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#888;font-size:12px">— FasalNet Team</p>
  </div></body></html>"""
        return self.send_email(email, subject, plain, html)

    def send_order_confirmation(self, email: str, customer_name: str, product_name: str,
                                quantity: float, total_amount: float, order_id: int) -> bool:
        subject = f"Order Confirmed ✅ — #{order_id} | FasalNet"
        plain = (f"Hello {customer_name},\n\nOrder #{order_id} confirmed!\n"
                 f"Product: {product_name}\nQuantity: {quantity} kg\nTotal: ₹{total_amount}\n\n— FasalNet")
        html = f"""<html><body style="font-family:Arial,sans-serif;color:#333">
  <div style="max-width:520px;margin:0 auto;padding:28px;border:1px solid #ddd;border-radius:10px">
    <h2 style="color:#2c5f2d">Order Confirmed ✅</h2>
    <p>Hello <b>{customer_name}</b>, your order has been <b>confirmed</b>!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9f9f9"><td style="padding:10px;border:1px solid #eee"><b>Order ID</b></td><td style="padding:10px;border:1px solid #eee">#{order_id}</td></tr>
      <tr><td style="padding:10px;border:1px solid #eee"><b>Product</b></td><td style="padding:10px;border:1px solid #eee">{product_name}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px;border:1px solid #eee"><b>Quantity</b></td><td style="padding:10px;border:1px solid #eee">{quantity} kg</td></tr>
      <tr><td style="padding:10px;border:1px solid #eee"><b>Total Amount</b></td><td style="padding:10px;border:1px solid #eee">&#8377;{total_amount}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#888;font-size:12px">— FasalNet Team</p>
  </div></body></html>"""
        return self.send_email(email, subject, plain, html)

    def send_notification_email(self, email: str, title: str, message: str,
                                action_url: Optional[str] = None) -> bool:
        subject = f"{title} — FasalNet"
        plain = f"{title}\n\n{message}\n\n— FasalNet Team"
        btn = (f'<p><a href="{action_url}" style="display:inline-block;background:#2c5f2d;'
               f'color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px">View Details</a></p>'
               if action_url else "")
        html = f"""<html><body style="font-family:Arial,sans-serif;color:#333">
  <div style="max-width:520px;margin:0 auto;padding:28px;border:1px solid #ddd;border-radius:10px">
    <h2 style="color:#2c5f2d">{title}</h2><p>{message}</p>{btn}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#888;font-size:12px">— FasalNet Team</p>
  </div></body></html>"""
        return self.send_email(email, subject, plain, html)

    def send_status_update_email(self, email, user_name, entity_type,
                                 entity_id, old_status, new_status) -> bool:
        return self.send_notification_email(
            email, f"{entity_type} Status Updated",
            f"Hello {user_name}, your {entity_type} #{entity_id} changed from {old_status} → {new_status}.")


_email_service: Optional[EmailService] = None

def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
