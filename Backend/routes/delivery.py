"""
FasalNet v8 — Delivery Routes
GET  /api/delivery/my-deliveries       – delivery boy: get assigned deliveries
PUT  /api/delivery/<id>/status         – update delivery status
POST /api/delivery/<id>/complete       – mark delivery complete
GET  /api/delivery/<id>                – delivery details
POST /api/operator/orders/<id>/assign-delivery  – (in operator.py)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from utils.db import query
from datetime import datetime

delivery_bp = Blueprint("delivery", __name__, url_prefix="/api/delivery")


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


# ── Get My Deliveries ─────────────────────────────────────────────────────
@delivery_bp.route("/my-deliveries", methods=["GET"])
@jwt_required()
def get_my_deliveries():
    claims = get_jwt()
    if claims.get("role") not in ("delivery_boy", "admin"):
        return jsonify({"error": "Delivery personnel only"}), 403

    delivery_boy_id = int(get_jwt_identity())

    deliveries = query(
        """SELECT
               d.id, d.order_id, d.delivery_boy_id, d.status,
               d.assigned_at, d.picked_up_at, d.delivered_at, d.notes,
               o.product_name, o.quantity_kg, o.total_amount, o.delivery_date, o.delivery_address,
               c.name   AS customer_name, c.phone  AS customer_phone,
               f.name   AS farmer_name,  f.phone  AS farmer_phone,
               s.name   AS storage_name, s.address AS storage_address,
               s.lat    AS storage_lat,  s.lon    AS storage_lon
           FROM deliveries d
           JOIN orders o ON d.order_id = o.id
           JOIN users c  ON o.customer_id = c.id
           LEFT JOIN products p ON o.product_id = p.id
           LEFT JOIN users f    ON p.farmer_id = f.id
           LEFT JOIN storages s ON o.storage_id = s.id
           WHERE d.delivery_boy_id = %s
           ORDER BY d.assigned_at DESC""",
        (delivery_boy_id,), fetchall=True
    ) or []

    return jsonify({"deliveries": [_serial(d) for d in deliveries]}), 200


# ── Update Delivery Status ────────────────────────────────────────────────
@delivery_bp.route("/<int:delivery_id>/status", methods=["PUT"])
@jwt_required()
def update_status(delivery_id):
    claims = get_jwt()
    if claims.get("role") not in ("delivery_boy", "admin"):
        return jsonify({"error": "Delivery personnel only"}), 403

    delivery_boy_id = int(get_jwt_identity())
    data       = request.get_json(silent=True) or {}
    new_status = data.get("status")

    if new_status not in ("picked_up", "in_transit"):
        return jsonify({"error": "Invalid status. Use: 'picked_up' or 'in_transit'"}), 400

    delivery = query(
        "SELECT * FROM deliveries WHERE id = %s AND delivery_boy_id = %s",
        (delivery_id, delivery_boy_id), fetchone=True
    )
    if not delivery:
        return jsonify({"error": "Delivery not found or not assigned to you"}), 404

    sql    = "UPDATE deliveries SET status = %s, updated_at = NOW()"
    params = [new_status]

    if new_status == "picked_up":
        sql += ", picked_up_at = NOW()"

    sql += " WHERE id = %s RETURNING *"
    params.append(delivery_id)

    updated = query(sql, tuple(params), commit=True)

    # Notify customer
    order = query("SELECT customer_id, product_name FROM orders WHERE id = %s",
                  (delivery["order_id"],), fetchone=True)
    if order:
        status_text = "picked up from storage" if new_status == "picked_up" else "on the way to you"
        _notify(order["customer_id"],
                f"Delivery Update 🚚",
                f"Your order ({order['product_name']}) is now {status_text}.",
                "delivery")

    return jsonify({"delivery": _serial(updated), "message": f"Status updated to {new_status}"}), 200


# ── Complete Delivery ──────────────────────────────────────────────────────
@delivery_bp.route("/<int:delivery_id>/complete", methods=["POST"])
@jwt_required()
def complete_delivery(delivery_id):
    claims = get_jwt()
    if claims.get("role") not in ("delivery_boy", "admin"):
        return jsonify({"error": "Delivery personnel only"}), 403

    delivery_boy_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    delivery = query(
        "SELECT * FROM deliveries WHERE id = %s AND delivery_boy_id = %s",
        (delivery_id, delivery_boy_id), fetchone=True
    )
    if not delivery:
        return jsonify({"error": "Delivery not found or not assigned to you"}), 404
    if delivery["status"] == "delivered":
        return jsonify({"error": "Delivery already completed"}), 409

    updated = query(
        """UPDATE deliveries
           SET status = 'delivered', delivered_at = NOW(), notes = %s, updated_at = NOW()
           WHERE id = %s RETURNING *""",
        (data.get("notes", ""), delivery_id), commit=True
    )

    # Update order status
    query(
        "UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = %s",
        (delivery["order_id"],), commit=True
    )

    # Notifications
    order = query(
        "SELECT customer_id, product_name, product_id, storage_id FROM orders WHERE id = %s",
        (delivery["order_id"],), fetchone=True
    )
    if order:
        _notify(order["customer_id"], "Delivery Completed ✅",
                f"Your order ({order['product_name']}) has been delivered! Thank you for using FasalNet.",
                "delivery_completed")

        if order.get("product_id"):
            farmer = query("SELECT farmer_id FROM products WHERE id = %s",
                           (order["product_id"],), fetchone=True)
            if farmer:
                _notify(farmer["farmer_id"], "Order Delivered ✅",
                        f"Your product ({order['product_name']}) has been delivered to the customer.",
                        "order_delivered")

    # Record COD payment if applicable
    if data.get("payment_received"):
        try:
            query(
                """INSERT INTO payments (order_id, customer_id, amount, method, status, paid_at, created_at)
                   SELECT %s, customer_id, total_amount, 'cod', 'paid', NOW(), NOW()
                   FROM orders WHERE id = %s""",
                (delivery["order_id"], delivery["order_id"]), commit=True
            )
        except Exception:
            pass

    return jsonify({"delivery": _serial(updated), "message": "Delivery completed successfully"}), 200


# ── Get Delivery Details ───────────────────────────────────────────────────
@delivery_bp.route("/<int:delivery_id>", methods=["GET"])
@jwt_required()
def get_delivery_details(delivery_id):
    claims = get_jwt()
    if claims.get("role") not in ("delivery_boy", "admin"):
        return jsonify({"error": "Delivery personnel only"}), 403

    delivery_boy_id = int(get_jwt_identity())

    delivery = query(
        """SELECT d.*,
               o.product_name, o.quantity_kg, o.total_amount, o.delivery_date, o.delivery_address,
               c.name AS customer_name, c.phone AS customer_phone, c.district AS customer_district,
               f.name AS farmer_name,   f.phone AS farmer_phone,
               s.name AS storage_name,  s.address AS storage_address,
               s.lat  AS storage_lat,   s.lon  AS storage_lon
           FROM deliveries d
           JOIN orders o ON d.order_id = o.id
           JOIN users c  ON o.customer_id = c.id
           LEFT JOIN products p ON o.product_id = p.id
           LEFT JOIN users f    ON p.farmer_id = f.id
           LEFT JOIN storages s ON o.storage_id = s.id
           WHERE d.id = %s AND d.delivery_boy_id = %s""",
        (delivery_id, delivery_boy_id), fetchone=True
    )
    if not delivery:
        return jsonify({"error": "Delivery not found"}), 404

    return jsonify({"delivery": _serial(delivery)}), 200
