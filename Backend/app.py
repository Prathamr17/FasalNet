"""
FasalNet v8 — Flask Application Entry Point
New in v8:
  - Dummy payment system for farmer bookings (POST /api/bookings/<id>/pay)
  - Delivery boy assignment by operator
  - Delivery boy sign up/in (delivery_boy role)
  - Mapflow routing integration (frontend)
"""
import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from utils import db as database

from routes.auth     import auth_bp
from routes.farmer   import farmer_bp
from routes.booking  import booking_bp
from routes.operator import operator_bp
from routes.customer import customer_bp
from routes.settings import settings_bp
from routes.delivery import delivery_bp


def create_app(cfg=Config) -> Flask:
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"]           = cfg.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = cfg.JWT_ACCESS_TOKEN_EXPIRES

    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": cfg.CORS_ORIGINS}}, supports_credentials=True)
    database.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(farmer_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(operator_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(delivery_bp)

    @app.route("/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "FasalNet API v8",
            "framework": "Flask",
            "modules": ["farmer","operator","customer","delivery","booking","payment","ml","settings"],
            "new_in_v8": ["dummy_payment", "delivery_boy_role", "mapflow_routing", "paid_booking_status"],
        }), 200

    @app.route("/")
    def root():
        return jsonify({"message": "FasalNet API v8"}), 200

    @app.errorhandler(404)
    def not_found(e):  return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_err(e): return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)
