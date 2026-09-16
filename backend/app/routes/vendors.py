from flask import Blueprint, jsonify, request
from app.db import get_connection


vendors_bp = Blueprint(
    "vendors",
    __name__,
    url_prefix="/api/vendors"
)


# ==========================================
# GET ALL VENDORS
# ==========================================

@vendors_bp.route("/", methods=["GET"])
def get_vendors():

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    vendor_code,
                    business_name,
                    contact_person,
                    phone,
                    email,
                    address,
                    emergency_contact,
                    emergency_phone,
                    status,
                    notes,
                    created_at,
                    updated_at
                FROM vendors
                ORDER BY id DESC
            """)

            vendors = cursor.fetchall()

        connection.close()

        return jsonify({
            "success": True,
            "data": vendors
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# GET ONE VENDOR
# ==========================================

@vendors_bp.route("/<int:vendor_id>", methods=["GET"])
def get_vendor(vendor_id):

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    vendor_code,
                    business_name,
                    contact_person,
                    phone,
                    email,
                    address,
                    emergency_contact,
                    emergency_phone,
                    status,
                    notes,
                    created_at,
                    updated_at
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))

            vendor = cursor.fetchone()

        connection.close()

        if not vendor:

            return jsonify({
                "success": False,
                "error": "Vendor not found"
            }), 404

        return jsonify({
            "success": True,
            "data": vendor
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# CREATE VENDOR
# ==========================================

@vendors_bp.route("/", methods=["POST"])
def create_vendor():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "error": "Request body is required"
            }), 400

        vendor_code = data.get("vendor_code")
        business_name = data.get("business_name")

        if not vendor_code or not business_name:

            return jsonify({
                "success": False,
                "error": "vendor_code and business_name are required"
            }), 400

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                INSERT INTO vendors (
                    vendor_code,
                    business_name,
                    contact_person,
                    phone,
                    email,
                    address,
                    emergency_contact,
                    emergency_phone,
                    status,
                    notes
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
            """, (
                vendor_code,
                business_name,
                data.get("contact_person"),
                data.get("phone"),
                data.get("email"),
                data.get("address"),
                data.get("emergency_contact"),
                data.get("emergency_phone"),
                data.get("status", "ACTIVE"),
                data.get("notes")
            ))

            vendor_id = cursor.lastrowid

        connection.commit()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Vendor created successfully",
            "vendor_id": vendor_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500