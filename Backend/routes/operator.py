"""
FasalNet v8 — Operator Routes
- Dashboard shows payment status on bookings
- Assign delivery boy to orders
- Full delivery management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from utils.db import query

operator_bp = Blueprint("operator", __name__, url_prefix="/api")


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
        query("INSERT INTO notifications (user_id, title, message, type) VALUES (%s,%s,%s,%s)",
              (user_id, title, message, ntype), commit=True)
    except Exception:
        pass


# ── Operator Dashboard ────────────────────────────────────────────────────
@operator_bp.route("/operator/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    op_id = int(get_jwt_identity())
    storages = query("SELECT * FROM storages WHERE operator_id = %s", (op_id,), fetchall=True) or []
    storage_ids = [s["id"] for s in storages]

    if not storage_ids:
        return jsonify({"storages": [], "stats": {}, "pending_bookings": [],
                        "confirmed_bookings": [], "paid_bookings": [], "customer_orders": []}), 200

    placeholders = ",".join(["%s"] * len(storage_ids))

    # Pending farmer bookings
    pending = query(
        f"""SELECT b.*, s.name AS storage_name, u.name AS farmer_name, u.phone AS farmer_phone
            FROM bookings b
            JOIN storages s ON s.id = b.storage_id
            JOIN users u    ON u.id = b.farmer_id
            WHERE b.storage_id IN ({placeholders}) AND b.status = 'pending'
            ORDER BY b.created_at""",
        storage_ids, fetchall=True
    ) or []

    # Confirmed bookings (awaiting payment)
    confirmed = query(
        f"""SELECT b.*, s.name AS storage_name, u.name AS farmer_name, u.phone AS farmer_phone
            FROM bookings b
            JOIN storages s ON s.id = b.storage_id
            JOIN users u    ON u.id = b.farmer_id
            WHERE b.storage_id IN ({placeholders}) AND b.status = 'confirmed'
            ORDER BY b.updated_at DESC""",
        storage_ids, fetchall=True
    ) or []

    # Paid bookings (payment completed)
    paid = query(
        f"""SELECT b.*, s.name AS storage_name, u.name AS farmer_name, u.phone AS farmer_phone
            FROM bookings b
            JOIN storages s ON s.id = b.storage_id
            JOIN users u    ON u.id = b.farmer_id
            WHERE b.storage_id IN ({placeholders}) AND b.status = 'paid'
            ORDER BY b.updated_at DESC""",
        storage_ids, fetchall=True
    ) or []

    # Customer orders
    customer_orders = query(
        f"""SELECT o.*, s.name AS storage_name, u.name AS customer_name, u.phone AS customer_phone
            FROM orders o
            JOIN storages s ON s.id = o.storage_id
            JOIN users u ON u.id = o.customer_id
            WHERE o.storage_id IN ({placeholders})
            ORDER BY o.created_at DESC""",
        storage_ids, fetchall=True
    ) or []

    total_cap  = sum(float(s["total_capacity_kg"])     for s in storages)
    avail_cap  = sum(float(s["available_capacity_kg"]) for s in storages)
    occupancy  = round((1 - avail_cap / total_cap) * 100, 1) if total_cap else 0
    paid_revenue = sum(float(b["total_price"] or 0) for b in paid)

    return jsonify({
        "storages":           [_serial(s) for s in storages],
        "pending_bookings":   [_serial(b) for b in pending],
        "confirmed_bookings": [_serial(b) for b in confirmed],
        "paid_bookings":      [_serial(b) for b in paid],
        "customer_orders":    [_serial(o) for o in customer_orders],
        "stats": {
            "total_capacity_kg":     total_cap,
            "available_capacity_kg": avail_cap,
            "occupancy_percent":     occupancy,
            "pending_count":         len(pending),
            "confirmed_count":       len(confirmed),
            "paid_count":            len(paid),
            "paid_revenue":          paid_revenue,
            "customer_pending":      sum(1 for o in customer_orders if o["status"] == "pending"),
        }
    }), 200


# ── Approve farmer booking ─────────────────────────────────────────────────
@operator_bp.route("/approve", methods=["POST"])
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
    _notify(b["farmer_id"], "Booking Confirmed ✅ — Pay Now",
            f"Your booking for {b['crop_type']} ({b['quantity_kg']} kg) has been confirmed! "
            f"Total: ₹{b['total_price']}. Go to My Bookings to complete payment.",
            "booking_confirmed")
    return jsonify({"booking": _serial(updated), "message": "Booking confirmed"}), 200


# ── Reject farmer booking ──────────────────────────────────────────────────
@operator_bp.route("/reject", methods=["POST"])
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

    reason = data.get("reason", "Storage unavailable")
    updated = query(
        "UPDATE bookings SET status='rejected',operator_notes=%s,updated_at=NOW() WHERE id=%s RETURNING *",
        (reason, bid), commit=True
    )
    _notify(b["farmer_id"], "Booking Rejected — Refund Initiated 💰",
            f"Your booking for {b['crop_type']} was declined. Reason: {reason}. "
            f"Any payment of ₹{b['total_price']} will be refunded within 3-5 business days.",
            "refund")
    return jsonify({"booking": _serial(updated), "message": "Booking rejected, farmer notified"}), 200


# ── Assign Delivery Boy ────────────────────────────────────────────────────
@operator_bp.route("/orders/<int:order_id>/assign-delivery", methods=["POST"])
@jwt_required()
def assign_delivery(order_id):
    """Assign a delivery boy to a customer order."""
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    op_id = int(get_jwt_identity())
    data  = request.get_json(silent=True) or {}
    delivery_boy_id = data.get("delivery_boy_id")

    if not delivery_boy_id:
        return jsonify({"error": "delivery_boy_id is required"}), 400

    # Verify order belongs to operator's storage
    order = query(
        """SELECT o.*, s.operator_id FROM orders o
           JOIN storages s ON s.id = o.storage_id
           WHERE o.id = %s AND s.operator_id = %s""",
        (order_id, op_id), fetchone=True
    )
    if not order:
        return jsonify({"error": "Order not found or not in your storage"}), 404
    if order["status"] not in ("confirmed", "pending"):
        return jsonify({"error": f"Cannot assign delivery for '{order['status']}' orders"}), 409

    # Verify delivery boy exists and has correct role
    db_user = query(
        "SELECT id, name, role FROM users WHERE id = %s AND role = 'delivery_boy'",
        (delivery_boy_id,), fetchone=True
    )
    if not db_user:
        return jsonify({"error": "Delivery boy not found"}), 404

    # Check if delivery already assigned
    existing = query("SELECT id FROM deliveries WHERE order_id = %s", (order_id,), fetchone=True)
    if existing:
        # Update existing assignment
        query(
            "UPDATE deliveries SET delivery_boy_id = %s, status = 'assigned', updated_at = NOW() WHERE order_id = %s",
            (delivery_boy_id, order_id), commit=True
        )
    else:
        query(
            "INSERT INTO deliveries (order_id, delivery_boy_id, status, assigned_at) VALUES (%s,%s,'assigned',NOW())",
            (order_id, delivery_boy_id), commit=True
        )

    # Update order status to confirmed
    query(
        "UPDATE orders SET status='confirmed', updated_at=NOW() WHERE id=%s",
        (order_id,), commit=True
    )

    # Notify delivery boy
    _notify(
        delivery_boy_id,
        "New Delivery Assigned 🚚",
        f"You have been assigned delivery for order #{order_id}: {order['product_name']} "
        f"({order['quantity_kg']} kg) to {order.get('delivery_address','customer location')}.",
        "delivery_assigned"
    )

    return jsonify({"message": f"Delivery assigned to {db_user['name']}"}), 200


# ── List Delivery Boys ─────────────────────────────────────────────────────
@operator_bp.route("/operator/delivery-boys", methods=["GET"])
@jwt_required()
def list_delivery_boys():
    """List all registered delivery boys."""
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    boys = query(
        "SELECT id, name, phone, email FROM users WHERE role='delivery_boy' ORDER BY name",
        fetchall=True
    ) or []
    return jsonify({"delivery_boys": [_serial(b) for b in boys]}), 200


# ── Connected Farmers ──────────────────────────────────────────────────────
@operator_bp.route("/operator/connected-farmers", methods=["GET"])
@jwt_required()
def connected_farmers():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    op_id = int(get_jwt_identity())
    storages = query("SELECT id FROM storages WHERE operator_id = %s", (op_id,), fetchall=True) or []
    storage_ids = [s["id"] for s in storages]
    if not storage_ids:
        return jsonify({"farmers": [], "count": 0}), 200

    placeholders = ",".join(["%s"] * len(storage_ids))
    farmers = query(
        f"""SELECT DISTINCT u.id, u.name, u.phone, u.email,
               COUNT(DISTINCT b.id) AS total_bookings,
               MAX(b.created_at) AS last_booking_at,
               STRING_AGG(DISTINCT s.name, ', ') AS storage_names,
               SUM(b.quantity_kg) AS total_kg_stored
            FROM bookings b
            JOIN users u ON u.id = b.farmer_id
            JOIN storages s ON s.id = b.storage_id
            WHERE b.storage_id IN ({placeholders}) AND b.status IN ('confirmed','completed','paid')
            GROUP BY u.id, u.name, u.phone, u.email
            ORDER BY last_booking_at DESC""",
        storage_ids, fetchall=True
    ) or []
    return jsonify({"farmers": [_serial(f) for f in farmers], "count": len(farmers)}), 200


# ── Update Storage ────────────────────────────────────────────────────────
@operator_bp.route("/storage/update", methods=["PUT"])
@jwt_required()
def update_storage():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    op_id = int(get_jwt_identity())
    data  = request.get_json(silent=True) or {}
    storage_id = data.get("storage_id")
    if not storage_id:
        return jsonify({"error": "storage_id required"}), 400

    owned = query("SELECT id FROM storages WHERE id=%s AND operator_id=%s",
                  (storage_id, op_id), fetchone=True)
    if not owned:
        return jsonify({"error": "Storage not found or not owned by you"}), 404

    allowed = ["name", "available_capacity_kg", "price_per_kg_per_day",
               "status", "address", "contact_phone"]
    sets, vals = [], []
    for field in allowed:
        if field in data:
            sets.append(f"{field} = %s")
            vals.append(data[field])

    if not sets:
        return jsonify({"error": "No updatable fields provided"}), 400

    vals += [storage_id]
    updated = query(
        f"UPDATE storages SET {', '.join(sets)}, updated_at=NOW() WHERE id=%s RETURNING *",
        vals, commit=True
    )
    return jsonify({"storage": _serial(updated), "message": "Storage updated"}), 200
