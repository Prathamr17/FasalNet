"""
FasalNet v9 — Flask Application Entry Point
New in v9:
  - ML Prediction endpoints (price, classification, market recommendation)
  - Models loaded from Google Drive (singleton cached)
  - Farmer "Add Crop" fix: commit=True ensured
  - Assess Crop Risk removed (UI + backend)
"""
import os, logging
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from settings import Config
from utils import db as database

from routes.auth     import auth_bp
from routes.farmer   import farmer_bp
from routes.booking  import booking_bp
from routes.operator import operator_bp
from routes.customer import customer_bp
from routes.settings import settings_bp
from routes.delivery import delivery_bp
from routes.otp      import otp_bp
from routes.ml       import ml_bp          # ── NEW v9


def create_app(cfg=Config) -> Flask:
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"]           = cfg.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = cfg.JWT_ACCESS_TOKEN_EXPIRES

    JWTManager(app)

    cors_origins = (
        cfg.CORS_ORIGINS.split(",")
        if isinstance(cfg.CORS_ORIGINS, str)
        else cfg.CORS_ORIGINS
    )
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)
    database.init_app(app)

    for bp in [auth_bp, farmer_bp, booking_bp, operator_bp,
               customer_bp, settings_bp, delivery_bp, otp_bp, ml_bp]:
        app.register_blueprint(bp)

    @app.route("/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "FasalNet API v9",
            "modules": [
                "farmer", "operator", "customer", "delivery",
                "booking", "payment", "settings",
                "email_otp", "ml_predictions",
            ],
            "new_in_v9": [
                "ml_price_prediction",
                "ml_price_classification",
                "ml_market_recommendation",
                "gdrive_model_loading",
                "crop_risk_removed",
            ],
        }), 200

    @app.route("/")
    def root():
        return jsonify({"message": "FasalNet API v9"}), 200

    @app.errorhandler(404)
    def not_found(e):  return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_err(e): return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)
