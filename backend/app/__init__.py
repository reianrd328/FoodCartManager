from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from app.db import get_connection
from app.routes.rentals import rentals_bp
from app.routes.dashboard import dashboard_bp
from app.routes.food_carts import food_carts_bp
from app.routes.vendors import vendors_bp
from app.routes.payments import payments_bp
from app.routes.settings import settings_bp
from app.routes.receipts import receipts_bp


def create_app():

    app = Flask(
        __name__,
        static_folder="../../frontend/admin",
        static_url_path=""
    )

    CORS(app)

    app.register_blueprint(rentals_bp)
    app.register_blueprint(food_carts_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(receipts_bp)

    @app.route("/")
    def home():
        return send_from_directory(
            app.static_folder,
            "index.html"
        )
    @app.route("/api/health")
    def health():

        try:

            connection = get_connection()

            with connection.cursor() as cursor:

                cursor.execute(
                    "SELECT DATABASE() AS database_name"
                )

                result = cursor.fetchone()

            connection.close()

            return jsonify({
                "success": True,
                "status": "online",
                "database": result["database_name"]
            })

        except Exception as e:

            return jsonify({
                "success": False,
                "status": "offline",
                "error": str(e)
            }), 500

    return app

