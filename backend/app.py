"""
FasalNet v10 — Flask Application Entry Point
New in v10:
  - Market Intelligence blueprint (ARIMA data layer from Neon DB)
  - Auto daily sync via APScheduler at 07:00 IST
  - All v9 modules retained unchanged
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
import re

from settings import Config
from utils import db as database

from routes.auth        import auth_bp
from routes.farmer      import farmer_bp
from routes.booking     import booking_bp
from routes.operator    import operator_bp
from routes.customer    import customer_bp
from routes.settings    import settings_bp
from routes.delivery    import delivery_bp
from routes.otp         import otp_bp
from routes.ml          import ml_bp
from routes.market_data import market_bp   # ── NEW v10


def _start_scheduler(app):
    """Daily sync at 07:00 IST — runs inside Flask process."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        from datetime import date, timedelta

        IST = pytz.timezone("Asia/Kolkata")
        DATABASE_URL = os.environ.get("DATABASE_URL", "")

        def daily_sync():
            with app.app_context():
                logging.getLogger(__name__).info("⏰ Daily market sync starting…")
                try:
                    from fetcher import sync as fetcher_sync
                    fetcher_sync(
                        DATABASE_URL,
                        start_date=(date.today() - timedelta(days=7)).isoformat(),
                        end_date=date.today().isoformat(),
                    )
                except Exception as exc:
                    logging.getLogger(__name__).error("Daily sync error: %s", exc)

        scheduler = BackgroundScheduler(timezone=IST)
        scheduler.add_job(
            daily_sync,
            trigger=CronTrigger(hour=7, minute=0, timezone=IST),
            id="daily_market_sync",
            replace_existing=True,
        )
        scheduler.start()
        logging.getLogger(__name__).info("Scheduler started — daily sync at 07:00 IST")
    except ImportError:
        logging.getLogger(__name__).warning(
            "APScheduler not installed — auto-sync disabled. "
            "Use POST /api/market/refresh for manual sync."
        )


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
    CORS(app, resources={r"/api/*": {"origins": [
        re.compile(r"https://.*\.vercel\.app"),
        "https://fasal-net.vercel.app",
        "http://localhost:3000",
    ]}}, supports_credentials=True)

    database.init_app(app)

    for bp in [
        auth_bp, farmer_bp, booking_bp, operator_bp,
        customer_bp, settings_bp, delivery_bp, otp_bp,
        ml_bp,        # v9  — unchanged
        market_bp,    # v10 — ARIMA data layer
    ]:
        app.register_blueprint(bp)

    # Start APScheduler only in main process (not reloader child)
    if os.environ.get("WERKZEUG_RUN_MAIN") != "false":
        _start_scheduler(app)

    @app.route("/health")
    def health():
        return jsonify({
            "status":  "ok",
            "service": "FasalNet API v10",
            "modules": [
                "farmer", "operator", "customer", "delivery",
                "booking", "payment", "settings",
                "email_otp", "ml_predictions",
                "market_intelligence",   # NEW v10
            ],
        }), 200

    @app.route("/")
    def root():
        return jsonify({"message": "FasalNet API v10"}), 200

    @app.errorhandler(404)
    def not_found(e):  return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_err(e): return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, use_reloader=False)
