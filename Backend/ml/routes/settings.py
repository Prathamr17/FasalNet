"""
FasalNet v5 — Settings Routes (Flask)
POST /api/settings/change-password
POST /api/settings/change-phone
GET  /api/settings/payment-history
GET  /api/settings/profile
PUT  /api/settings/profile
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from utils.db import query

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


def _serial(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = float(v) if hasattr(v, "__float__") and not isinstance(v, (int, bool)) else v
    return out


# ── Get profile ────────────────────────────────────────────────────
@settings_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    uid = get_jwt_identity()
    row = query(
        "SELECT id,name,phone,email,role,language,district,state,created_at FROM users WHERE id=%s",
        (uid,), fetchone=True
    )
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _serial(row)}), 200


# ── Update profile ─────────────────────────────────────────────────
@settings_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    fields, params = ["updated_at=NOW()"], []
    allowed = ["name", "email", "district", "state", "language"]
    for key in allowed:
        if data.get(key) is not None:
            fields.append(f"{key}=%s")
            params.append(data[key])

    if len(fields) == 1:
        return jsonify({"error": "Nothing to update"}), 400

    params.append(uid)
    row = query(
        f"UPDATE users SET {','.join(fields)} WHERE id=%s "
        f"RETURNING id,name,phone,email,role,language,district,state",
        tuple(params), commit=True
    )
    return jsonify({"user": _serial(row), "message": "Profile updated"}), 200


# ── Change password ────────────────────────────────────────────────
@settings_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    current_pw = data.get("current_password", "")
    new_pw     = data.get("new_password", "")

    if not current_pw or not new_pw:
        return jsonify({"error": "current_password and new_password are required"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    row = query("SELECT password_hash FROM users WHERE id=%s", (uid,), fetchone=True)
    if not row or not check_password_hash(row["password_hash"], current_pw):
        return jsonify({"error": "Current password is incorrect"}), 401

    query(
        "UPDATE users SET password_hash=%s, updated_at=NOW() WHERE id=%s",
        (generate_password_hash(new_pw), uid), commit=True
    )
    return jsonify({"message": "Password changed successfully"}), 200


# ── Change phone ───────────────────────────────────────────────────
@settings_bp.route("/change-phone", methods=["POST"])
@jwt_required()
def change_phone():
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    new_phone = data.get("new_phone", "")
    password  = data.get("password", "")

    if len(new_phone) < 10:
        return jsonify({"error": "Enter a valid phone number"}), 400

    row = query("SELECT password_hash FROM users WHERE id=%s", (uid,), fetchone=True)
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Password is incorrect"}), 401

    existing = query("SELECT id FROM users WHERE phone=%s AND id!=%s",
                     (new_phone, uid), fetchone=True)
    if existing:
        return jsonify({"error": "Phone number already in use by another account"}), 409

    query("UPDATE users SET phone=%s, updated_at=NOW() WHERE id=%s",
          (new_phone, uid), commit=True)
    return jsonify({"message": "Phone number updated"}), 200


# ── Payment history ────────────────────────────────────────────────
@settings_bp.route("/payment-history", methods=["GET"])
@jwt_required()
def payment_history():
    uid  = get_jwt_identity()
    rows = query(
        """SELECT p.*, o.product_name, o.quantity_kg,
                  o.status AS order_status, s.name AS storage_name
           FROM payments p
           JOIN orders o ON o.id = p.order_id
           LEFT JOIN storages s ON s.id = o.storage_id
           WHERE p.customer_id = %s
           ORDER BY p.created_at DESC""",
        (uid,), fetchall=True
    ) or []

    total = sum(float(r["amount"]) for r in rows)
    return jsonify({
        "payments": [_serial(r) for r in rows],
        "total_spent": round(total, 2),
    }), 200
