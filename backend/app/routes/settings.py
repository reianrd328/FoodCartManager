from flask import Blueprint, jsonify, request
from app.db import get_connection

settings_bp = Blueprint(
    "settings",
    __name__,
    url_prefix="/api/settings"
)

DEFAULT_SETTINGS = {
    "business_name": "FoodCart Park & Leasing",
    "address": "123 Commercial Avenue, Metro Manila, Philippines",
    "phone": "+63 917 123 4567",
    "email": "contact@foodcartpark.ph",
    "receipt_header": "Official Rental Receipt",
    "receipt_footer": "Thank you for your business! Please keep this receipt for your records.",
    "currency": "PHP"
}


@settings_bp.route('/', methods=['GET'])
def get_settings():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, business_name, address, phone, email,
                       receipt_header, receipt_footer, currency, created_at, updated_at
                FROM business_settings
                ORDER BY id ASC
                LIMIT 1
            """)
            settings = cur.fetchone()

            if not settings:
                # Seed default settings if empty
                cur.execute("""
                    INSERT INTO business_settings (
                        business_name, address, phone, email,
                        receipt_header, receipt_footer, currency
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    DEFAULT_SETTINGS["business_name"],
                    DEFAULT_SETTINGS["address"],
                    DEFAULT_SETTINGS["phone"],
                    DEFAULT_SETTINGS["email"],
                    DEFAULT_SETTINGS["receipt_header"],
                    DEFAULT_SETTINGS["receipt_footer"],
                    DEFAULT_SETTINGS["currency"]
                ))
                conn.commit()

                cur.execute("""
                    SELECT id, business_name, address, phone, email,
                           receipt_header, receipt_footer, currency, created_at, updated_at
                    FROM business_settings
                    ORDER BY id ASC
                    LIMIT 1
                """)
                settings = cur.fetchone()

            return jsonify({"success": True, "data": settings}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@settings_bp.route('/', methods=['PUT'])
def update_settings():
    data = request.get_json() or {}

    business_name = (data.get("business_name") or "").strip()
    if not business_name:
        return jsonify({"success": False, "error": "Business Name is required."}), 400

    address = (data.get("address") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    receipt_header = (data.get("receipt_header") or "").strip()
    receipt_footer = (data.get("receipt_footer") or "").strip()
    currency = (data.get("currency") or "PHP").strip().upper()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM business_settings ORDER BY id ASC LIMIT 1")
            existing = cur.fetchone()

            if existing:
                cur.execute("""
                    UPDATE business_settings
                    SET business_name = %s,
                        address = %s,
                        phone = %s,
                        email = %s,
                        receipt_header = %s,
                        receipt_footer = %s,
                        currency = %s
                    WHERE id = %s
                """, (business_name, address, phone, email, receipt_header, receipt_footer, currency, existing["id"]))
            else:
                cur.execute("""
                    INSERT INTO business_settings (
                        business_name, address, phone, email,
                        receipt_header, receipt_footer, currency
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (business_name, address, phone, email, receipt_header, receipt_footer, currency))

            conn.commit()

            cur.execute("""
                SELECT id, business_name, address, phone, email,
                       receipt_header, receipt_footer, currency, created_at, updated_at
                FROM business_settings
                ORDER BY id ASC
                LIMIT 1
            """)
            updated = cur.fetchone()

            return jsonify({
                "success": True,
                "message": "Business settings updated successfully!",
                "data": updated
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()
