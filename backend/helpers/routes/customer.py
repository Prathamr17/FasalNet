"""
FasalNet – Customer / Buyer Routes
GET  /api/products              – browse all products (items in cold storage)
GET  /api/products/<id>         – single product detail
POST /api/orders                – place an order (uses orders table correctly)
GET  /api/orders                – buyer's order history
POST /api/orders/<id>/cancel    – cancel a pending order
GET  /api/inventory             – view available inventory
GET  /api/notifications         – buyer notifications
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from utils.db import query
from datetime import datetime

customer_bp = Blueprint("customer", __name__, url_prefix="/api")


def _serial(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = float(v) if hasattr(v, "__float__") and not isinstance(v, (int, bool)) else v
    return out


# ── Products (items available from cold storage) ──────────────
@customer_bp.route("/products", methods=["GET"])
def get_products():
    district = request.args.get("district")
    category = request.args.get("category")

    sql = """
        SELECT 
            p.id, p.name, p.category, p.description,
            p.price_per_kg, p.quantity_kg, p.available_kg,
            p.harvest_age_days, p.risk_level, p.image_emoji,
            p.created_at, p.updated_at,
            s.id AS storage_id, s.name AS storage_name,
            s.district, s.state, s.address AS storage_address,
            u.id AS farmer_id, u.name AS farmer_name, u.phone AS farmer_phone
        FROM products p
        LEFT JOIN storages s ON p.storage_id = s.id
        LEFT JOIN users u ON p.farmer_id = u.id
        WHERE p.is_active = true AND p.available_kg > 0
    """
    params = []
    
    if district:
        sql += " AND s.district ILIKE %s"
        params.append(f"%{district}%")
    
    if category:
        sql += " AND p.category = %s"
        params.append(category)
    
    sql += " ORDER BY p.created_at DESC"

    rows = query(sql, params, fetchall=True) or []
    return jsonify({ "products": [_serial(r) for r in rows], "count": len(rows) }), 200


@customer_bp.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    row = query(
        """SELECT p.*, 
                  s.name AS storage_name, s.address AS storage_address,
                  s.district, s.state, s.lat, s.lon,
                  u.name AS farmer_name, u.phone AS farmer_phone
           FROM products p
           LEFT JOIN storages s ON p.storage_id = s.id
           LEFT JOIN users u ON p.farmer_id = u.id
           WHERE p.id = %s AND p.is_active = true""",
        (product_id,), fetchone=True
    )
    if not row:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"product": _serial(row)}), 200


# ── Orders ────────────────────────────────────────────────────
@customer_bp.route("/orders", methods=["POST"])
@jwt_required()
def place_order():
    claims = get_jwt()
    if claims.get("role") not in ("customer", "admin"):
        return jsonify({"error": "Only customers can place orders"}), 403

    customer_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    # Support both product_id (new) and storage_id (legacy) 
    product_id = data.get("product_id")
    storage_id = data.get("storage_id")
    
    required = ["quantity_kg", "product_name", "delivery_date"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    # Get product details if product_id provided
    product = None
    if product_id:
        product = query(
            "SELECT * FROM products WHERE id = %s AND is_active = true",
            (product_id,), fetchone=True
        )
        if not product:
            return jsonify({"error": "Product not available"}), 400
        storage_id = product["storage_id"]
        price_per_kg = float(product["price_per_kg"])
    else:
        # Legacy: use storage pricing
        storage = query(
            "SELECT * FROM storages WHERE id = %s AND status = 'available'",
            (storage_id,), fetchone=True
        )
        if not storage:
            return jsonify({"error": "Storage not available"}), 400
        price_per_kg = float(storage["price_per_kg_per_day"])

    qty = float(data["quantity_kg"])
    
    # Check product availability if product_id provided
    if product:
        if float(product["available_kg"]) < qty:
            return jsonify({"error": "Requested quantity exceeds available stock"}), 400
    
    duration     = int(data.get("duration_days", 1))
    total_amount = round(qty * price_per_kg * duration, 2)
    delivery_address = data.get("delivery_address", "")

    # Ensure orders table has delivery_address column (idempotent)
    try:
        query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT ''", commit=True)
    except Exception:
        pass

    order = query(
        """INSERT INTO orders
           (customer_id, product_id, storage_id, product_name, quantity_kg,
            price_per_kg, total_amount, delivery_date, status,
            delivery_address, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, NOW(), NOW())
           RETURNING *""",
        (customer_id, product_id, storage_id, data["product_name"], qty,
         price_per_kg, total_amount, data["delivery_date"], delivery_address),
        commit=True
    )
    
    # Update product availability if product_id provided
    if product_id:
        query(
            "UPDATE products SET available_kg = available_kg - %s, updated_at = NOW() WHERE id = %s",
            (qty, product_id), commit=True
        )

    # Notify customer
    _notify(customer_id, "Order Placed",
            f"Your order for {data['product_name']} is awaiting confirmation. ⏳", "order")
    
    # Notify farmer if product_id provided, otherwise notify operator
    if product_id and product:
        _notify(product["farmer_id"], "New Customer Order",
                f"New order for your product: {data['product_name']} ({qty} kg). Check your orders.", "order")
    else:
        op = query("SELECT operator_id FROM storages WHERE id=%s", (storage_id,), fetchone=True)
        if op and op.get("operator_id"):
            _notify(op["operator_id"], "New Customer Order",
                    f"New order: {data['product_name']} ({qty} kg). Please review in your dashboard.", "order")

    return jsonify({"order": _serial(order), "message": "Order placed successfully"}), 201


@customer_bp.route("/orders", methods=["GET"])
@jwt_required()
def get_orders():
    customer_id = int(get_jwt_identity())
    rows = query(
        """SELECT o.*, s.name AS storage_name, s.address, s.district, s.state
           FROM orders o JOIN storages s ON s.id = o.storage_id
           WHERE o.customer_id = %s ORDER BY o.created_at DESC""",
        (customer_id,), fetchall=True
    ) or []
    return jsonify({"orders": [_serial(r) for r in rows]}), 200


@customer_bp.route("/orders/<int:order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    customer_id = int(get_jwt_identity())
    order = query(
        "SELECT * FROM orders WHERE id=%s AND customer_id=%s", (order_id, customer_id), fetchone=True
    )
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order["status"] != "pending":
        return jsonify({"error": "Only pending orders can be cancelled"}), 409
    updated = query(
        "UPDATE orders SET status='cancelled', updated_at=NOW() WHERE id=%s RETURNING *",
        (order_id,), commit=True
    )
    _notify(customer_id, "Order Cancelled",
            f"Your order for {order['product_name']} has been cancelled. ✖", "order")
    return jsonify({"order": _serial(updated), "message": "Order cancelled"}), 200


# ── Operator: approve/reject customer orders ──────────────────
@customer_bp.route("/orders/<int:order_id>/approve", methods=["POST"])
@jwt_required()
def approve_order(order_id):
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    data  = request.get_json(silent=True) or {}
    op_id = int(get_jwt_identity())

    order = query(
        """SELECT o.*, s.operator_id FROM orders o
           JOIN storages s ON s.id = o.storage_id WHERE o.id = %s""",
        (order_id,), fetchone=True
    )
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order["status"] != "pending":
        return jsonify({"error": f"Order already {order['status']}"}), 409

    updated = query(
        "UPDATE orders SET status='confirmed', operator_notes=%s, updated_at=NOW() WHERE id=%s RETURNING *",
        (data.get("notes", ""), order_id), commit=True
    )
    query("UPDATE storages SET available_capacity_kg=available_capacity_kg-%s WHERE id=%s",
          (float(order["quantity_kg"]), order["storage_id"]), commit=True)
    _notify(order["customer_id"], "Order Confirmed ✅",
            f"Your order for {order['product_name']} ({order['quantity_kg']} kg) has been confirmed by the operator!",
            "order_confirmed")
    return jsonify({"order": _serial(updated), "message": "Order confirmed"}), 200


@customer_bp.route("/orders/<int:order_id>/reject", methods=["POST"])
@jwt_required()
def reject_order(order_id):
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    data  = request.get_json(silent=True) or {}
    op_id = int(get_jwt_identity())

    order = query(
        """SELECT o.*, s.operator_id FROM orders o
           JOIN storages s ON s.id = o.storage_id WHERE o.id = %s""",
        (order_id,), fetchone=True
    )
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order["status"] != "pending":
        return jsonify({"error": f"Order already {order['status']}"}), 409

    reason = data.get("reason", "Order could not be fulfilled at this time")
    updated = query(
        "UPDATE orders SET status='rejected', operator_notes=%s, updated_at=NOW() WHERE id=%s RETURNING *",
        (reason, order_id), commit=True
    )

    # Notify customer with refund details
    _notify(order["customer_id"], "Order Rejected — Refund Initiated 💰",
            f"Your order for {order['product_name']} was declined. Reason: {reason}. "
            f"A full refund of ₹{order['total_amount']} will be credited within 3-5 business days.",
            "refund")

    # Log refund record
    try:
        query(
            """INSERT INTO payments (order_id, customer_id, amount, method, status, created_at)
               VALUES (%s, %s, %s, 'refund', 'refunded', NOW())""",
            (order_id, order["customer_id"], float(order["total_amount"])), commit=True
        )
    except Exception:
        pass

    return jsonify({"order": _serial(updated), "message": "Order rejected, refund initiated"}), 200


# ── Operator: list all customer orders ────────────────────────
@customer_bp.route("/operator/orders", methods=["GET"])
@jwt_required()
def operator_orders():
    claims = get_jwt()
    if claims.get("role") not in ("operator", "admin"):
        return jsonify({"error": "Operators only"}), 403

    op_id = int(get_jwt_identity())
    rows = query(
        """SELECT o.*, s.name AS storage_name,
                  u.name AS customer_name, u.phone AS customer_phone
           FROM orders o
           JOIN storages s ON s.id = o.storage_id
           JOIN users u ON u.id = o.customer_id
           WHERE s.operator_id = %s
           ORDER BY o.created_at DESC""",
        (op_id,), fetchall=True
    ) or []
    return jsonify({"orders": [_serial(r) for r in rows]}), 200


# ── Inventory ──────────────────────────────────────────────────
@customer_bp.route("/inventory", methods=["GET"])
def get_inventory():
    rows = query(
        """SELECT s.id, s.name, s.district, s.state,
                  s.total_capacity_kg, s.available_capacity_kg,
                  s.price_per_kg_per_day, s.temp_min_celsius, s.temp_max_celsius,
                  s.status, s.verified,
                  ROUND((1 - s.available_capacity_kg::numeric / NULLIF(s.total_capacity_kg,0)) * 100, 1) AS occupancy_pct
           FROM storages s WHERE s.status = 'available'
           ORDER BY s.available_capacity_kg DESC""",
        fetchall=True
    ) or []
    return jsonify({"inventory": [_serial(r) for r in rows]}), 200


# ── Notifications ──────────────────────────────────────────────
@customer_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    customer_id = int(get_jwt_identity())
    rows = query(
        """SELECT id, title, message, type, is_read, created_at
           FROM notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 30""",
        (customer_id,), fetchall=True
    ) or []
    notifications = [_serial(r) for r in rows]
    unread = sum(1 for n in notifications if not n.get("is_read"))
    return jsonify({"notifications": notifications, "unread": unread}), 200


@customer_bp.route("/notifications/<int:notif_id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(notif_id):
    customer_id = int(get_jwt_identity())
    query("UPDATE notifications SET is_read=true WHERE id=%s AND user_id=%s",
          (notif_id, customer_id), commit=True)
    return jsonify({"message": "Marked as read"}), 200


# ── Helper ─────────────────────────────────────────────────────
def _notify(user_id: int, title: str, message: str, ntype: str = "info"):
    try:
        query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (%s,%s,%s,%s)",
            (user_id, title, message, ntype), commit=True
        )
    except Exception:
        pass  # Non-critical
