"""
FasalNet v5 — Auth Routes
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/google   ← NEW: Google OAuth
"""
import os
import requests as http_requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from utils.db import query

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ALLOWED_ROLES = ("farmer", "operator", "admin")


def _safe_user(row: dict) -> dict:
    """Strip password_hash and serialise dates."""
    out = {}
    for k, v in row.items():
        if k == "password_hash":
            continue
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = float(v) if hasattr(v, "__float__") and not isinstance(v, (int, bool)) else v
    return out


# ── Signup ─────────────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    for f in ["name", "phone", "password", "role"]:
        if not data.get(f):
            return jsonify({"error": f"Missing required field: {f}"}), 400

    role = data["role"].lower()
    if role not in ALLOWED_ROLES:
        return jsonify({"error": f"Role must be one of: {', '.join(ALLOWED_ROLES)}"}), 400

    if query("SELECT id FROM users WHERE phone=%s", (data["phone"],), fetchone=True):
        return jsonify({"error": "Phone already registered"}), 409

    user = query(
        """INSERT INTO users (name,phone,email,password_hash,role,language,district,state)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING id,name,phone,email,role,language,district,state,created_at""",
        (data["name"], data["phone"], data.get("email"),
         generate_password_hash(data["password"]), role,
         data.get("language", "en"), data.get("district"), data.get("state")),
        commit=True
    )
    token = create_access_token(identity=str(user["id"]),
                                additional_claims={"role": user["role"], "name": user["name"]})
    return jsonify({"token": token, "user": _safe_user(user)}), 201


# ── Login ──────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    if not data.get("phone") or not data.get("password"):
        return jsonify({"error": "Phone and password required"}), 400

    user = query("SELECT * FROM users WHERE phone=%s", (data["phone"],), fetchone=True)
    if not user or not check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user["id"]),
                                additional_claims={"role": user["role"], "name": user["name"]})
    return jsonify({"token": token, "user": _safe_user(dict(user))}), 200


# ── Me ─────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = query(
        "SELECT id,name,phone,email,role,language,district,state FROM users WHERE id=%s",
        (uid,), fetchone=True
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _safe_user(dict(user))}), 200


# ── Google OAuth ───────────────────────────────────────────────────
@auth_bp.route("/google", methods=["POST"])
def google_auth():
    """
    Verify a Google ID-token received from the frontend Sign-In SDK.
    Creates a new user on first sign-in; returns JWT otherwise.

    Body: { "id_token": "<google_id_token>", "role": "customer" }
    """
    data    = request.get_json(silent=True) or {}
    id_tok  = data.get("id_token", "")
    role    = data.get("role", "farmer")

    if not id_tok:
        return jsonify({"error": "id_token required"}), 400
    if role not in ALLOWED_ROLES:
        role = "farmer"

    # Verify with Google's tokeninfo endpoint
    resp = http_requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": id_tok},
        timeout=10
    )
    if resp.status_code != 200:
        return jsonify({"error": "Invalid Google token"}), 401

    info = resp.json()

    # Optional: verify audience matches your client ID
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if client_id and info.get("aud") != client_id:
        return jsonify({"error": "Token audience mismatch"}), 401

    email = info.get("email", "")
    name  = info.get("name", "Google User")

    # Find or create user
    user = query("SELECT * FROM users WHERE email=%s", (email,), fetchone=True)

    if not user:
        # Generate a phone-like placeholder from email (max 15 chars)
        fake_phone = email.split("@")[0][:15].replace(".", "")
        # Ensure uniqueness
        if query("SELECT id FROM users WHERE phone=%s", (fake_phone,), fetchone=True):
            fake_phone = fake_phone[:10] + str(len(fake_phone))

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
