"""
OTP Routes
Handles OTP signup verification and password reset
"""
from flask import Blueprint, request, jsonify
from services.otp_service import get_otp_service
from helpers.password_reset_helper import PasswordResetHelper
from utils.db import query
from werkzeug.security import generate_password_hash
from flask_jwt_extended import create_access_token
import logging

logger = logging.getLogger(__name__)

otp_bp = Blueprint("otp", __name__, url_prefix="/api/otp")
otp_service = get_otp_service()


@otp_bp.route("/send", methods=["POST"])
def send_otp():
    """
    Send OTP to email
    Body: { "email": "user@example.com", "purpose": "SIGNUP" or "FORGOT_PASSWORD" }
    """
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email", "").strip()
        purpose = data.get("purpose", "SIGNUP").upper()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        if purpose not in ["SIGNUP", "FORGOT_PASSWORD"]:
            return jsonify({"error": "Invalid purpose"}), 400
        
        # For signup, check if email already exists
        if purpose == "SIGNUP":
            existing_user = query(
                "SELECT id FROM users WHERE email=%s",
                (email,),
                fetchone=True
            )
            if existing_user:
                return jsonify({"error": "Email already registered"}), 409
        
        # For password reset, check if email exists
        if purpose == "FORGOT_PASSWORD":
            user = query(
                "SELECT id FROM users WHERE email=%s",
                (email,),
                fetchone=True
            )
            if not user:
                # Don't reveal if email exists or not
                return jsonify({"message": "If email exists, OTP will be sent"}), 200
        
        # Send OTP
        success, message = otp_service.send_otp(email, purpose)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Send OTP error: {str(e)}")
        return jsonify({"error": "Failed to send OTP"}), 500


@otp_bp.route("/verify", methods=["POST"])
def verify_otp():
    """
    Verify OTP
    Body: { "email": "user@example.com", "otp": "123456", "purpose": "SIGNUP" or "FORGOT_PASSWORD" }
    """
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email", "").strip()
        otp = data.get("otp", "").strip()
        purpose = data.get("purpose", "SIGNUP").upper()
        
        if not email or not otp:
            return jsonify({"error": "Email and OTP required"}), 400
        
        # Verify OTP
        success, message = otp_service.verify_otp(email, otp, purpose)
        
        if success:
            return jsonify({"message": message, "verified": True}), 200
        else:
            return jsonify({"error": message, "verified": False}), 400
            
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}")
        return jsonify({"error": "OTP verification failed"}), 500


@otp_bp.route("/signup-with-otp", methods=["POST"])
def signup_with_otp():
    """
    Complete signup with OTP verification
    Body: {
        "name": "John",
        "phone": "1234567890",
        "email": "john@example.com",
        "password": "password123",
        "otp": "123456",
        "role": "farmer"
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        required = ["name", "phone", "email", "password", "otp", "role"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        email = data["email"].strip()
        otp = data["otp"].strip()
        
        # Verify OTP first
        success, message = otp_service.verify_otp(email, otp, "SIGNUP")
        if not success:
            return jsonify({"error": f"OTP verification failed: {message}"}), 400
        
        # Check if user already exists
        if query("SELECT id FROM users WHERE email=%s", (email,), fetchone=True):
            return jsonify({"error": "Email already registered"}), 409
        
        if query("SELECT id FROM users WHERE phone=%s", (data["phone"],), fetchone=True):
            return jsonify({"error": "Phone already registered"}), 409
        
        # Create user
        from werkzeug.security import generate_password_hash
        user = query(
            """INSERT INTO users (name, phone, email, password_hash, role, language, district, state)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id, name, phone, email, role, language, district, state, created_at""",
            (
                data["name"],
                data["phone"],
                email,
                generate_password_hash(data["password"]),
                data["role"].lower(),
                data.get("language", "en"),
                data.get("district"),
                data.get("state")
            ),
            commit=True
        )
        
        if not user:
            return jsonify({"error": "User creation failed"}), 500
        
        # Create JWT token
        token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"role": user["role"], "name": user["name"]}
        )
        
        # If operator, create their cold storage
        if data["role"].lower() == "operator":
            storage_name     = data.get("storage_name", "").strip()
            capacity         = data.get("storage_capacity")
            lat              = data.get("storage_lat")
            lon              = data.get("storage_lon")
            storage_address  = data.get("storage_address", "").strip()
            storage_district = data.get("storage_district", data.get("district", "")).strip()
            storage_state    = data.get("storage_state",   data.get("state", "Maharashtra")).strip()

            if storage_name and capacity:
                try:
                    query(
                        """INSERT INTO storages
                             (operator_id, name, total_capacity_kg, available_capacity_kg,
                              lat, lon, address, district, state, status, verified)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'available', true)""",
                        (
                            user["id"], storage_name,
                            float(capacity), float(capacity),
                            float(lat) if lat else 20.0,
                            float(lon) if lon else 75.0,
                            storage_address or None,
                            storage_district or None,
                            storage_state or "Maharashtra",
                        ),
                        commit=True
                    )
                except Exception as se:
                    logger.warning(f"Storage creation failed for operator {user['id']}: {se}")

        # Send welcome email
        otp_service.send_notification(
            email,
            "Welcome to FasalNet",
            f"Hello {user['name']}, your account has been successfully created. Welcome to FasalNet!"
        )
        
        # Prepare response
        user_dict = {k: v for k, v in user.items() if k != "password_hash"}
        if hasattr(user_dict.get("created_at"), "isoformat"):
            user_dict["created_at"] = user_dict["created_at"].isoformat()
        
        logger.info(f"User signup successful with OTP: {email}")
        return jsonify({
            "message": "Signup successful",
            "token": token,
            "user": user_dict
        }), 201
        
    except Exception as e:
        logger.error(f"Signup with OTP error: {str(e)}")
        return jsonify({"error": "Signup failed"}), 500


@otp_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Reset password with OTP verification
    Body: { "email": "user@example.com", "otp": "123456", "new_password": "newpass123" }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        if not data.get("email") or not data.get("otp") or not data.get("new_password"):
            return jsonify({"error": "Email, OTP, and new password required"}), 400
        
        email = data["email"].strip()
        otp = data["otp"].strip()
        new_password = data["new_password"]
        
        # Validate password strength
        is_valid, msg = PasswordResetHelper.validate_password_strength(new_password)
        if not is_valid:
            return jsonify({"error": msg}), 400
        
        # Reset password
        success, message = PasswordResetHelper.reset_password(email, otp, new_password)
        
        if success:
            # Send confirmation email
            user = query(
                "SELECT name FROM users WHERE email=%s",
                (email,),
                fetchone=True
            )
            if user:
                otp_service.send_notification(
                    email,
                    "Password Reset Successful",
                    f"Hello {user['name']}, your password has been reset successfully. If you did not do this, please contact support."
                )
            
            logger.info(f"Password reset successful: {email}")
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({"error": "Password reset failed"}), 500
