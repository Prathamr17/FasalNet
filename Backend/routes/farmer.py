"""
FasalNet – Farmer Routes
POST /api/predict-risk        – spoilage risk assessment
GET  /api/storages            – list/search cold storages
POST /api/storages/recommend  – ranked recommendations for farmer
GET  /api/farmer/orders       – customer orders for farmer's products
GET  /api/farmer/products     – farmer's product listings
POST /api/farmer/products     – create new product
PUT  /api/farmer/products/:id – update product
DELETE /api/farmer/products/:id – delete product
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.db import query
from utils.risk_engine import calculate_risk
from utils.recommendation import rank_storages

farmer_bp = Blueprint("farmer", __name__, url_prefix="/api")


# ── Risk Assessment ───────────────────────────────────────────────────────
@farmer_bp.route("/predict-risk", methods=["POST"])
@jwt_required()
def predict_risk():
    data = request.get_json(silent=True) or {}

    crop             = data.get("crop_type", "default")
    age              = int(data.get("harvest_age_days", 0))
    weather_temp     = data.get("weather_temp_celsius")
    travel_delay     = int(data.get("travel_delay_hours", 0))

    result = calculate_risk(crop, age, weather_temp, travel_delay)

    return jsonify({
        "risk_level":          result.risk_level,
        "risk_score":          result.risk_score,
        "days_until_risky":    result.days_until_risky,
        "days_until_critical": result.days_until_critical,
        "temp_sensitive":      result.temp_sensitive,
        "recommendations":     result.recommendations,
    }), 200


# ── List Storages ─────────────────────────────────────────────────────────
@farmer_bp.route("/storages", methods=["GET"])
def list_storages():
    district = request.args.get("district")
    state    = request.args.get("state")
    status   = request.args.get("status", "available")

    sql    = "SELECT * FROM storages WHERE 1=1"
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

    sql += " ORDER BY name"

    storages = query(sql, params, fetchall=True) or []
    # Serialise Decimal fields
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
    """Get all customer orders for products owned by this farmer"""
    farmer_id = get_jwt_identity()
    
    sql = """
        SELECT 
            o.id, o.product_name, o.quantity_kg, o.price_per_kg, o.total_amount,
            o.delivery_date, o.status, o.created_at, o.updated_at,
            o.delivery_address,
            u.name as customer_name, u.phone as customer_phone,
            p.id as product_id, p.farmer_id,
            s.name as storage_name, s.address as storage_address,
            db.name as delivery_boy_name, db.phone as delivery_boy_phone
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN storages s ON o.storage_id = s.id
        LEFT JOIN deliveries d ON d.order_id = o.id
        LEFT JOIN users db ON d.delivery_boy_id = db.id
        WHERE p.farmer_id = %s
        ORDER BY o.created_at DESC
    """
    
    orders = query(sql, (farmer_id,), fetchall=True) or []
    
    return jsonify({"orders": [_serial(o) for o in orders]}), 200


# ── Get Farmer's Products ─────────────────────────────────────────────────
@farmer_bp.route("/farmer/products", methods=["GET"])
@jwt_required()
def get_my_products():
    """Get all products created by this farmer"""
    farmer_id = get_jwt_identity()
    
    sql = """
        SELECT 
            p.*,
            s.name as storage_name, s.district, s.address as storage_address,
            u.name as farmer_name
        FROM products p
        LEFT JOIN storages s ON p.storage_id = s.id
        LEFT JOIN users u ON p.farmer_id = u.id
        WHERE p.farmer_id = %s AND p.is_active = true
        ORDER BY p.created_at DESC
    """
    
    products = query(sql, (farmer_id,), fetchall=True) or []
    
    return jsonify({"products": [_serial(p) for p in products]}), 200


# ── Create Product ────────────────────────────────────────────────────────
@farmer_bp.route("/farmer/products", methods=["POST"])
@jwt_required()
def create_product():
    """Create a new product listing"""
    farmer_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    sql = """
        INSERT INTO products (
            farmer_id, storage_id, name, category, description,
            price_per_kg, quantity_kg, available_kg, harvest_age_days,
            risk_level, image_emoji, is_active
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    
    params = (
        farmer_id,
        data.get("storage_id"),
        data.get("name"),
        data.get("category", "vegetables"),
        data.get("description", ""),
        data.get("price_per_kg"),
        data.get("quantity_kg"),
        data.get("quantity_kg"),  # available_kg starts as quantity_kg
        data.get("harvest_age_days", 0),
        data.get("risk_level", "SAFE"),
        data.get("image_emoji", "🌾"),
        True
    )
    
    result = query(sql, params, fetchone=True)
    
    if result:
        return jsonify({"success": True, "product_id": result["id"]}), 201
    return jsonify({"error": "Failed to create product"}), 500


# ── Update Product ────────────────────────────────────────────────────────
@farmer_bp.route("/farmer/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    """Update an existing product"""
    farmer_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    # Verify ownership
    check = query("SELECT farmer_id FROM products WHERE id = %s", (product_id,), fetchone=True)
    if not check or check["farmer_id"] != farmer_id:
        return jsonify({"error": "Not authorized"}), 403
    
    sql = """
        UPDATE products SET
            name = COALESCE(%s, name),
            category = COALESCE(%s, category),
            description = COALESCE(%s, description),
            price_per_kg = COALESCE(%s, price_per_kg),
            quantity_kg = COALESCE(%s, quantity_kg),
            available_kg = COALESCE(%s, available_kg),
            harvest_age_days = COALESCE(%s, harvest_age_days),
            risk_level = COALESCE(%s, risk_level),
            image_emoji = COALESCE(%s, image_emoji),
            updated_at = NOW()
        WHERE id = %s
    """
    
    params = (
        data.get("name"),
        data.get("category"),
        data.get("description"),
        data.get("price_per_kg"),
        data.get("quantity_kg"),
        data.get("available_kg"),
        data.get("harvest_age_days"),
        data.get("risk_level"),
        data.get("image_emoji"),
        product_id
    )
    
    query(sql, params)
    
    return jsonify({"success": True}), 200


# ── Delete Product ────────────────────────────────────────────────────────
@farmer_bp.route("/farmer/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    """Soft delete a product (mark as inactive)"""
    farmer_id = get_jwt_identity()
    
    # Verify ownership
    check = query("SELECT farmer_id FROM products WHERE id = %s", (product_id,), fetchone=True)
    if not check or check["farmer_id"] != farmer_id:
        return jsonify({"error": "Not authorized"}), 403
    
    query("UPDATE products SET is_active = false WHERE id = %s", (product_id,))
    
    return jsonify({"success": True}), 200


# ── Helper ────────────────────────────────────────────────────────────────
def _serial(row: dict) -> dict:
    """Convert Decimal/datetime to JSON-serialisable types."""
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = float(v) if hasattr(v, "__float__") and not isinstance(v, (int, bool)) else v
    return out
