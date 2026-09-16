import secrets
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash
from app.db import get_connection

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not identifier or not password:
        return jsonify({
            "success": False,
            "error": "Username/Email and Password are required."
        }), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, username, password_hash, full_name, role, email, phone, status, vendor_id
                FROM users
                WHERE (username = %s OR email = %s)
                LIMIT 1
            """, (identifier, identifier))
            user = cur.fetchone()

            if not user or not check_password_hash(user["password_hash"], password):
                return jsonify({
                    "success": False,
                    "error": "Invalid username or password."
                }), 401

            if user.get("status") != "ACTIVE":
                return jsonify({
                    "success": False,
                    "error": "Your account is currently inactive. Please contact administration."
                }), 403

            # Fetch vendor business name if this is a vendor account
            vendor_name = None
            if user.get("vendor_id"):
                cur.execute("SELECT business_name FROM vendors WHERE id = %s", (user["vendor_id"],))
                vrow = cur.fetchone()
                if vrow:
                    vendor_name = vrow["business_name"]

            token = secrets.token_hex(24)

            return jsonify({
                "success": True,
                "message": f"Welcome back, {user['full_name']}!",
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "full_name": user["full_name"],
                    "role": user["role"],
                    "email": user["email"],
                    "phone": user["phone"],
                    "vendor_id": user.get("vendor_id"),
                    "vendor_name": vendor_name
                }
            }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200

