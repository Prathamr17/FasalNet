"""
routes/auth.py — Authentication Routes
======================================
Endpoints:
  POST /api/auth/signup         – register new user
  POST /api/auth/login          – phone + password login
  GET  /api/auth/me             – current user profile (JWT required)
  POST /api/auth/google         – Google OAuth token verification
  POST /api/auth/google-login   – alias for Google OAuth
"""
import os
import re
import requests as http_requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

from utils.db import query

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ALLOWED_ROLES = {"farmer", "operator", "customer", "admin", "delivery_boy"}


def _safe_user(u: dict) -> dict:
    u.pop("password_hash", None)
    return u


# ── Signup ──────────────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    phone    = (data.get("phone") or "").strip()
    email    = (data.get("email") or "").strip() or None
    password = data.get("password") or ""
    role     = (data.get("role") or "farmer").strip()
    district = (data.get("district") or "").strip() or None
    state    = (data.get("state") or "Maharashtra").strip()
    lang     = (data.get("language") or "en").strip()

    if not name or not phone or not password:
        return jsonify({"error": "Name, phone, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ALLOWED_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(ALLOWED_ROLES)}"}), 400

    if query("SELECT id FROM users WHERE phone = %s", (phone,), fetchone=True):
        return jsonify({"error": "Phone number already registered"}), 409

    if email and query("SELECT id FROM users WHERE email = %s", (email,), fetchone=True):
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = generate_password_hash(password)
    user = query(
        """INSERT INTO users (name, phone, email, password_hash, role, district, state, language)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id, name, phone, email, role, district, state, language, created_at""",
        (name, phone, email, pw_hash, role, district, state, lang),
        commit=True,
    )
    token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": user["role"], "name": user["name"]},
    )
    return jsonify({"token": token, "user": _safe_user(dict(user))}), 201


# ── Login ───────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    phone    = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not phone or not password:
        return jsonify({"error": "Phone and password are required"}), 400

    user = query("SELECT * FROM users WHERE phone = %s", (phone,), fetchone=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid phone number or password"}), 401

    token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": user["role"], "name": user["name"]},
    )
    return jsonify({"token": token, "user": _safe_user(dict(user))}), 200


# ── Me (Current User) ────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = query(
        "SELECT id, name, phone, email, role, district, state, language, created_at FROM users WHERE id = %s",
        (uid,), fetchone=True
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _safe_user(dict(user))}), 200


# ── Google OAuth ───────────────────────────────────────────────────
@auth_bp.route("/google", methods=["POST"])
@auth_bp.route("/google-login", methods=["POST"])
def google_auth():
    """
    Verify a Google ID-token received from the frontend Sign-In SDK.
    Creates a new user on first sign-in; returns JWT otherwise.

    Body: { "id_token": "<google_id_token>", "role": "farmer" }
    """
    data    = request.get_json(silent=True) or {}
    id_tok  = data.get("id_token", "")
    role    = data.get("role", "farmer")

    if not id_tok:
        return jsonify({"error": "id_token required"}), 400
    if role not in ALLOWED_ROLES:
        role = "farmer"

    # Verify with Google's tokeninfo endpoint
    try:
        resp = http_requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_tok},
            timeout=10
        )
    except Exception as e:
        return jsonify({"error": f"Failed to verify Google token: {str(e)}"}), 502

    if resp.status_code != 200:
        return jsonify({"error": "Invalid or expired Google token"}), 401

    info = resp.json()

    # Verify audience matches configured client ID if set
    client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("REACT_APP_GOOGLE_CLIENT_ID", "")
    if client_id and info.get("aud") != client_id:
        return jsonify({"error": "Token audience mismatch"}), 401

    email = info.get("email", "")
    name  = info.get("name", "Google User")

    if not email:
        return jsonify({"error": "No email returned from Google token"}), 400

    # Find or create user
    user = query("SELECT * FROM users WHERE email=%s", (email,), fetchone=True)

    if not user:
        # Generate a phone-like placeholder from email (numeric digits, unique)
        import time
        sanitized = "".join(c for c in email.split("@")[0] if c.isdigit())
        if len(sanitized) >= 10:
            fake_phone = sanitized[:10]
        else:
            fake_phone = "9" + str(int(time.time()))[-9:]

        # Ensure uniqueness
        if query("SELECT id FROM users WHERE phone=%s", (fake_phone,), fetchone=True):
            fake_phone = "9" + str(int(time.time() * 1000))[-9:]

        user = query(
            """INSERT INTO users (name,phone,email,password_hash,role,language)
               VALUES (%s,%s,%s,%s,%s,'en')
               RETURNING id,name,phone,email,role,language,district,state""",
            (name, fake_phone, email,
             generate_password_hash("google_oauth_" + email), role),
            commit=True
        )

    if not user:
        return jsonify({"error": "User creation failed"}), 500

    token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": user["role"], "name": user["name"]}
    )
    return jsonify({"token": token, "user": _safe_user(dict(user))}), 200
