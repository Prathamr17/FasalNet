"""
FasalNet v9 — Farmer Routes
============================
GET  /api/storages              – list/search cold storages
POST /api/storages/recommend    – ranked recommendations for farmer
GET  /api/farmer/orders         – customer orders for farmer's products
GET  /api/farmer/products       – farmer's product listings
POST /api/farmer/products       – create new product  (FIXED: commit ensured)
PUT  /api/farmer/products/:id   – update product
DELETE /api/farmer/products/:id – soft-delete product

NOTE: /api/predict-risk is REMOVED in v9 (Assess Crop Risk feature removed).
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.db import query
from utils.recommendation import rank_storages

farmer_bp = Blueprint("farmer", __name__, url_prefix="/api")


# ── List Storages ─────────────────────────────────────────────────────────
@farmer_bp.route("/storages", methods=["GET"])
def list_storages():
    district = request.args.get("district")
    state    = request.args.get("state")
    status   = request.args.get("status", "available")

    sql    = "SELECT *, (operator_id IS NOT NULL) AS has_operator FROM storages WHERE 1=1"
    params = []

    if district:
        sql += " AND district ILIKE %s"
        params.append(f"%{district}%")
    if state:
        sql += " AND state ILIKE %s"
        params.append(f"%{state}%")
    if status:
        sql += " AND status = %s"
        params.append(status)

    sql += " ORDER BY has_operator DESC, name"   # operator-managed storages first
    storages = query(sql, params, fetchall=True) or []
    return jsonify({"storages": [_serial(s) for s in storages]}), 200


# ── Ranked Recommendations ────────────────────────────────────────────────
@farmer_bp.route("/storages/recommend", methods=["POST"])
@jwt_required()
def recommend_storages():
    data = request.get_json(silent=True) or {}
    lat        = float(data.get("lat", 0))
    lon        = float(data.get("lon", 0))
    qty        = float(data.get("quantity_kg", 100))
    risk_level = data.get("risk_level", "SAFE")

    storages = query(
        "SELECT * FROM storages WHERE status = 'available'",
        fetchall=True
    ) or []

    ranked = rank_storages(lat, lon, qty, risk_level,
                           [_serial(s) for s in storages])
    return jsonify({"recommendations": ranked, "count": len(ranked)}), 200


# ── Get Customer Orders for Farmer's Products ─────────────────────────────
@farmer_bp.route("/farmer/orders", methods=["GET"])
@jwt_required()
def get_customer_orders():
    farmer_id = get_jwt_identity()
    sql = """
        SELECT
            o.id, o.product_name, o.quantity_kg, o.price_per_kg, o.total_amount,
            o.delivery_date, o.status, o.created_at, o.updated_at,
            o.delivery_address,
            u.name  AS customer_name,  u.phone  AS customer_phone,
            p.id    AS product_id,     p.farmer_id,
            s.name  AS storage_name,   s.address AS storage_address,
            db.name AS delivery_boy_name, db.phone AS delivery_boy_phone
        FROM orders o
        LEFT JOIN products  p  ON o.product_id = p.id
        LEFT JOIN users     u  ON o.customer_id = u.id
        LEFT JOIN storages  s  ON o.storage_id  = s.id
        LEFT JOIN deliveries d  ON d.order_id   = o.id
        LEFT JOIN users     db ON d.delivery_boy_id = db.id
        WHERE p.farmer_id = %s
        ORDER BY o.created_at DESC
    """
    orders = query(sql, (farmer_id,), fetchall=True) or []
    return jsonify({"orders": [_serial(o) for o in orders]}), 200


# ── Get Farmer's Products ─────────────────────────────────────────────────
@farmer_bp.route("/farmer/products", methods=["GET"])
@jwt_required()
def get_my_products():
    farmer_id = get_jwt_identity()
    sql = """
        SELECT
            p.*,
            s.name    AS storage_name,
            s.district,
            s.address AS storage_address,
            u.name    AS farmer_name
        FROM products p
        LEFT JOIN storages s ON p.storage_id = s.id
        LEFT JOIN users    u ON p.farmer_id   = u.id
        WHERE p.farmer_id = %s AND p.is_active = true
        ORDER BY p.created_at DESC
    """
    products = query(sql, (farmer_id,), fetchall=True) or []
    return jsonify({"products": [_serial(p) for p in products]}), 200


# ── Create Product  (FIXED v9: commit=True so INSERT actually persists) ───
@farmer_bp.route("/farmer/products", methods=["POST"])
@jwt_required()
def create_product():
    farmer_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    # Validate required fields
    name         = (data.get("name") or "").strip()
    price_per_kg = data.get("price_per_kg")
    quantity_kg  = data.get("quantity_kg")

    if not name:
        return jsonify({"error": "Crop name is required."}), 400
    if not price_per_kg or float(price_per_kg) <= 0:
        return jsonify({"error": "Price must be greater than 0."}), 400
    if not quantity_kg or float(quantity_kg) <= 0:
        return jsonify({"error": "Quantity must be greater than 0."}), 400

    CATEGORY_EMOJI = {
        "vegetables": "🥦", "fruits": "🍎", "leafy": "🥬",
        "nuts": "🥜",        "grains": "🌾", "spices": "🌶️",
    }
    category    = data.get("category", "vegetables")
    image_emoji = data.get("image_emoji") or CATEGORY_EMOJI.get(category, "🌾")

    sql = """
        INSERT INTO products (
            farmer_id, storage_id, name, category, description,
            price_per_kg, quantity_kg, available_kg, harvest_age_days,
            risk_level, image_emoji, is_active, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, true, NOW(), NOW()
        )
        RETURNING id, name, price_per_kg, quantity_kg, category
    """
    params = (
        farmer_id,
        data.get("storage_id"),
        name,
        category,
        data.get("description", ""),
        float(price_per_kg),
        float(quantity_kg),
        float(quantity_kg),          # available_kg starts == quantity_kg
        int(data.get("harvest_age_days", 0)),
        data.get("risk_level", "SAFE"),
        image_emoji,
    )

    result = query(sql, params, fetchone=True, commit=True)   # ← commit=True is critical

    if result:
        return jsonify({
            "success":    True,
            "product_id": result["id"],
            "product":    _serial(result),
            "message":    f"'{name}' added to market successfully.",
        }), 201

    return jsonify({"error": "Failed to create product. Please try again."}), 500


# ── Update Product ────────────────────────────────────────────────────────
@farmer_bp.route("/farmer/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    farmer_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    check = query(
        "SELECT farmer_id FROM products WHERE id = %s", (product_id,), fetchone=True
    )
    if not check or check["farmer_id"] != farmer_id:
        return jsonify({"error": "Not authorized."}), 403

    sql = """
        UPDATE products SET
            name             = COALESCE(%s, name),
            category         = COALESCE(%s, category),
            description      = COALESCE(%s, description),
            price_per_kg     = COALESCE(%s, price_per_kg),
            quantity_kg      = COALESCE(%s, quantity_kg),
            available_kg     = COALESCE(%s, available_kg),
            harvest_age_days = COALESCE(%s, harvest_age_days),
            risk_level       = COALESCE(%s, risk_level),
            image_emoji      = COALESCE(%s, image_emoji),
            updated_at       = NOW()
        WHERE id = %s
    """
    params = (
        data.get("name"),         data.get("category"),
        data.get("description"),  data.get("price_per_kg"),
        data.get("quantity_kg"),  data.get("available_kg"),
        data.get("harvest_age_days"), data.get("risk_level"),
        data.get("image_emoji"),  product_id,
    )
    query(sql, params, commit=True)
    return jsonify({"success": True}), 200


# ── Delete Product ────────────────────────────────────────────────────────
@farmer_bp.route("/farmer/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    farmer_id = get_jwt_identity()
    check = query(
        "SELECT farmer_id FROM products WHERE id = %s", (product_id,), fetchone=True
    )
    if not check or check["farmer_id"] != farmer_id:
        return jsonify({"error": "Not authorized."}), 403

    query(
        "UPDATE products SET is_active = false, updated_at = NOW() WHERE id = %s",
        (product_id,),
        commit=True,
    )
    return jsonify({"success": True}), 200


# ── Helper ────────────────────────────────────────────────────────────────
def _serial(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif hasattr(v, "__float__") and not isinstance(v, (int, bool)):
            out[k] = float(v)
        else:
            out[k] = v
    return out
