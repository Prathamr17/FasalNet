"""
FasalNet v8 — Booking Routes
- Dummy payment system: POST /api/bookings/<id>/pay
- Booking status updated to 'paid' on successful payment
- Operator can see payment status via dashboard
"""
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta, timezone
from utils.db import query

booking_bp = Blueprint("booking", __name__, url_prefix="/api")


def _serial(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = float(v) if hasattr(v, "__float__") and not isinstance(v, (int, bool)) else v
    return out


def _notify(user_id: int, title: str, message: str, ntype: str = "info"):
    try:
        query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (%s, %s, %s, %s)",
            (user_id, title, message, ntype), commit=True
        )
    except Exception:
        pass


# ── Create booking ─────────────────────────────────────────────────────
@booking_bp.route("/book", methods=["POST"])
@jwt_required()
def create_booking():
    uid    = get_jwt_identity()
    claims = get_jwt()
    role   = claims.get("role")
    if role not in ("farmer", "admin"):
        return jsonify({"error": "Only farmers can create bookings"}), 403

    data = request.get_json(silent=True) or {}
    required = ["storage_id", "crop_type", "quantity_kg", "pickup_date"]
    missing  = [f for f in required if f not in data or data[f] is None or data[f] == ""]
    if "harvest_age_days" not in data:
        missing.append("harvest_age_days")
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    storage = query(
        "SELECT * FROM storages WHERE id=%s AND status='available'",
        (data["storage_id"],), fetchone=True
    )
    if not storage:
        return jsonify({"error": "Storage not available"}), 400
    if float(storage["available_capacity_kg"]) < float(data["quantity_kg"]):
        return jsonify({"error": "Insufficient capacity"}), 400

    rate        = float(storage["price_per_kg_per_day"])
    dur         = int(data.get("duration_days", 7))
    total       = round(float(data["quantity_kg"]) * rate * dur, 2)
    harvest_age = int(data.get("harvest_age_days") or 0)

    booking = query(
        """INSERT INTO bookings
             (farmer_id,storage_id,crop_type,quantity_kg,harvest_age_days,
              risk,pickup_date,duration_days,total_price,status,created_at)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending',NOW())
           RETURNING *""",
        (uid, data["storage_id"], data["crop_type"],
         data["quantity_kg"], harvest_age,
         data.get("risk", "SAFE").upper(),
         data["pickup_date"], dur, total),
        commit=True
    )
    mod_until = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    return jsonify({
        "booking": _serial(booking),
        "message": "Booking created",
        "modifiable_until": mod_until,
    }), 201


# ── List bookings ──────────────────────────────────────────────────────
@booking_bp.route("/bookings", methods=["GET"])
@jwt_required()
def list_bookings():
    uid    = get_jwt_identity()
    claims = get_jwt()
    role   = claims.get("role")

    if role == "farmer":
        rows = query(
            """SELECT b.*, s.name AS storage_name, s.address, s.district,
                      EXTRACT(EPOCH FROM (NOW()-b.created_at))/60 AS age_minutes
               FROM bookings b
               JOIN storages s ON s.id=b.storage_id
               WHERE b.farmer_id=%s ORDER BY b.created_at DESC""",
            (uid,), fetchall=True
        ) or []
    else:
        rows = query(
            """SELECT b.*, s.name AS storage_name, s.address, s.district,
                      u.name AS farmer_name, u.phone AS farmer_phone,
                      EXTRACT(EPOCH FROM (NOW()-b.created_at))/60 AS age_minutes
               FROM bookings b
               JOIN storages s ON s.id=b.storage_id
               JOIN users u ON u.id=b.farmer_id
               WHERE s.operator_id=%s ORDER BY b.created_at DESC""",
            (uid,), fetchall=True
        ) or []

    return jsonify({"bookings": [_serial(r) for r in rows]}), 200


# ── Dummy Payment ──────────────────────────────────────────────────────
@booking_bp.route("/bookings/<int:booking_id>/pay", methods=["POST"])
@jwt_required()
def pay_booking(booking_id):
    """
    Simulates payment for a confirmed booking.
    Body: { "payment_method": "upi" | "card" | "netbanking" | "wallet" }
    Updates booking status to 'paid' and records a dummy transaction.
    """
    uid    = get_jwt_identity()
    claims = get_jwt()
    if claims.get("role") not in ("farmer", "admin"):
        return jsonify({"error": "Only farmers can make payments"}), 403

    data   = request.get_json(silent=True) or {}
    method = data.get("payment_method", "upi")
    if method not in ("upi", "card", "netbanking", "wallet"):
        return jsonify({"error": "Invalid method. Use: upi, card, netbanking, wallet"}), 400

    booking = query(
        """SELECT b.*, s.name AS storage_name, s.operator_id
           FROM bookings b JOIN storages s ON s.id=b.storage_id
           WHERE b.id=%s AND b.farmer_id=%s""",
        (booking_id, uid), fetchone=True
    )
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    if booking["status"] == "paid":
        return jsonify({"error": "Already paid"}), 409
    if booking["status"] != "confirmed":
        return jsonify({"error": f"Cannot pay for a '{booking['status']}' booking. Must be confirmed first."}), 409

    txn_id = f"FN-{method.upper()[:3]}-{uuid.uuid4().hex[:10].upper()}"

    updated = query(
        "UPDATE bookings SET status='paid', updated_at=NOW() WHERE id=%s RETURNING *",
        (booking_id,), commit=True
    )

    # Record in booking_payments (graceful if table missing)
    try:
        query(
            """INSERT INTO booking_payments
                 (booking_id, farmer_id, amount, method, txn_id, status, paid_at, created_at)
               VALUES (%s,%s,%s,%s,%s,'paid',NOW(),NOW())""",
            (booking_id, uid, float(booking["total_price"]), method, txn_id),
            commit=True
        )
    except Exception:
        pass

    # Notify operator
    _notify(
        booking["operator_id"],
        "Payment Received 💰",
        f"Booking #{booking_id} for {booking['crop_type']} ({booking['quantity_kg']} kg) "
        f"has been paid. Amount: ₹{booking['total_price']}. Txn ID: {txn_id}",
        "payment_received"
    )
    # Notify farmer
    _notify(
        int(uid),
        "Payment Successful ✅",
        f"Payment of ₹{booking['total_price']} for storage at {booking['storage_name']} "
        f"completed via {method.upper()}. Txn ID: {txn_id}",
        "payment_confirmed"
    )

    return jsonify({
        "booking": _serial(updated),
        "payment": {
            "txn_id": txn_id,
            "method": method,
            "amount": float(booking["total_price"]),
            "status": "paid",
            "paid_at": datetime.utcnow().isoformat(),
        },
        "message": f"Payment of ₹{booking['total_price']} successful via {method.upper()}",
    }), 200


# ── Modify booking (10-min window) ─────────────────────────────────────
@booking_bp.route("/bookings/<int:booking_id>", methods=["PUT"])
@jwt_required()
def modify_booking(booking_id):
    uid    = get_jwt_identity()
    claims = get_jwt()
    if claims.get("role") not in ("farmer", "admin"):
        return jsonify({"error": "Insufficient permissions"}), 403

    data = request.get_json(silent=True) or {}
    row  = query(
        "SELECT *, EXTRACT(EPOCH FROM (NOW()-created_at))/60 AS age_min FROM bookings WHERE id=%s AND farmer_id=%s",
        (booking_id, uid), fetchone=True
    )
    if not row:
        return jsonify({"error": "Booking not found"}), 404
    if float(row["age_min"]) > 10:
        return jsonify({"error": "Booking can only be modified within 10 minutes of creation"}), 403
    if row["status"] != "pending":
        return jsonify({"error": f"Cannot modify a '{row['status']}' booking"}), 409

    fields, params = ["updated_at=NOW()"], []
    if data.get("quantity_kg"):   fields.append("quantity_kg=%s");   params.append(float(data["quantity_kg"]))
    if data.get("pickup_date"):   fields.append("pickup_date=%s");   params.append(data["pickup_date"])
    if data.get("duration_days"): fields.append("duration_days=%s"); params.append(int(data["duration_days"]))

    params.append(booking_id)
    updated = query(
        f"UPDATE bookings SET {','.join(fields)} WHERE id=%s RETURNING *",
        tuple(params), commit=True
    )
    return jsonify({"booking": _serial(updated), "message": "Booking modified"}), 200


# ── Cancel booking ─────────────────────────────────────────────────────
@booking_bp.route("/bookings/<int:booking_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_booking(booking_id):
    uid    = get_jwt_identity()
    claims = get_jwt()
    role   = claims.get("role")
    row    = query("SELECT * FROM bookings WHERE id=%s", (booking_id,), fetchone=True)
    if not row:
        return jsonify({"error": "Booking not found"}), 404
    if str(row["farmer_id"]) != str(uid) and role not in ("admin", "operator"):
        return jsonify({"error": "Not your booking"}), 403
    if row["status"] not in ("pending",):
        return jsonify({"error": f"Cannot cancel a '{row['status']}' booking"}), 409

    updated = query(
        "UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=%s RETURNING *",
        (booking_id,), commit=True
    )
    return jsonify({"booking": _serial(updated), "message": "Booking cancelled"}), 200


# ── Approve ────────────────────────────────────────────────────────────
@booking_bp.route("/approve", methods=["POST"])
@jwt_required()
def approve_booking():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Insufficient permissions"}), 403

    data = request.get_json(silent=True) or {}
    bid  = data.get("booking_id")
    b = query(
        "SELECT b.*, s.available_capacity_kg FROM bookings b JOIN storages s ON s.id=b.storage_id WHERE b.id=%s",
        (bid,), fetchone=True
    )
    if not b:
        return jsonify({"error": "Booking not found"}), 404
    if b["status"] != "pending":
        return jsonify({"error": f"Already {b['status']}"}), 409

    query("UPDATE storages SET available_capacity_kg=available_capacity_kg-%s WHERE id=%s",
          (float(b["quantity_kg"]), b["storage_id"]), commit=True)
    updated = query(
        "UPDATE bookings SET status='confirmed',operator_notes=%s,updated_at=NOW() WHERE id=%s RETURNING *",
        (data.get("notes", ""), bid), commit=True
    )
    _notify(
        b["farmer_id"],
        "Booking Confirmed ✅ — Pay Now",
        f"Your booking for {b['crop_type']} ({b['quantity_kg']} kg) has been confirmed! "
        f"Total: ₹{b['total_price']}. Go to My Bookings to complete payment.",
        "booking_confirmed"
    )
    return jsonify({"booking": _serial(updated), "message": "Booking confirmed"}), 200


# ── Reject ─────────────────────────────────────────────────────────────
@booking_bp.route("/reject", methods=["POST"])
@jwt_required()
def reject_booking():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Insufficient permissions"}), 403

    data = request.get_json(silent=True) or {}
    bid  = data.get("booking_id")
    b    = query("SELECT * FROM bookings WHERE id=%s", (bid,), fetchone=True)
    if not b:
        return jsonify({"error": "Booking not found"}), 404

    reason  = data.get("reason", "")
    updated = query(
        "UPDATE bookings SET status='rejected',operator_notes=%s,updated_at=NOW() WHERE id=%s RETURNING *",
        (reason, bid), commit=True
    )
    _notify(
        b["farmer_id"],
        "Booking Rejected — Refund Initiated 💰",
        f"Your booking for {b['crop_type']} was declined. {('Reason: ' + reason) if reason else ''} "
        f"Any payment of ₹{b['total_price']} will be refunded within 3–5 business days.",
        "refund"
    )
    return jsonify({"booking": _serial(updated), "message": "Booking rejected"}), 200
