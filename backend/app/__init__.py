import os
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
from app.routes.auth import auth_bp
from app.routes.vendor_portal import vendor_portal_bp
from app.routes.pos import pos_bp


def create_app():

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
    admin_dir = os.path.join(base_dir, "admin")
    vendor_dir = os.path.join(base_dir, "vendor")
    pos_dir = os.path.join(base_dir, "pos")

    app = Flask(
        __name__,
        static_folder=admin_dir,
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
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendor_portal_bp)
    app.register_blueprint(pos_bp)

    @app.route("/")
    def home():
        return send_from_directory(admin_dir, "index.html")

    @app.route("/admin")
    @app.route("/admin/")
    def admin_page():
        return send_from_directory(admin_dir, "index.html")

    @app.route("/admin/<path:filename>")
    def admin_static(filename):
        return send_from_directory(admin_dir, filename)

    @app.route("/login")
    @app.route("/login/")
    def login_page():
        return send_from_directory(base_dir, "login.html")

    @app.route("/vendor")
    @app.route("/vendor/")
    def vendor_page():
        return send_from_directory(vendor_dir, "index.html")

    @app.route("/vendor/<path:filename>")
    def vendor_static(filename):
        return send_from_directory(vendor_dir, filename)

    @app.route("/pos")
    @app.route("/pos/")
    def pos_page():
        return send_from_directory(pos_dir, "index.html")

    @app.route("/pos/<path:filename>")
    def pos_static(filename):
        return send_from_directory(pos_dir, filename)

    @app.route("/manifest.json")
    def root_manifest():
        return send_from_directory(base_dir, "manifest.json", mimetype="application/manifest+json")

    @app.route("/sw.js")
    def root_sw():
        response = send_from_directory(base_dir, "sw.js", mimetype="application/javascript")
        response.headers["Service-Worker-Allowed"] = "/"
        return response

    @app.route("/icons/<path:filename>")
    def root_icons(filename):
        return send_from_directory(os.path.join(base_dir, "icons"), filename)

    @app.route("/api/health")
    def health():
        try:
            connection = get_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT DATABASE() AS database_name")
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
