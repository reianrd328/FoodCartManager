from flask import Blueprint, jsonify, request

from app.db import get_connection


food_carts_bp = Blueprint(
    "food_carts",
    __name__,
    url_prefix="/api/food-carts"
)


# ==========================================
# GET ALL FOOD CARTS
# ==========================================

@food_carts_bp.route("/", methods=["GET"])
def get_food_carts():

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    fc.id,
                    fc.cart_code,
                    fc.cart_name,
                    fc.ownership_type,
                    fc.vendor_id,
                    v.business_name AS vendor_name,
                    fc.description,
                    fc.status,
                    fc.notes,
                    fc.created_at,
                    fc.updated_at
                FROM food_carts fc
                LEFT JOIN vendors v
                    ON fc.vendor_id = v.id
                ORDER BY fc.id DESC
            """)

            carts = cursor.fetchall()

        connection.close()

        return jsonify({
            "success": True,
            "data": carts
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# GET ONE FOOD CART
# ==========================================

@food_carts_bp.route("/<int:cart_id>", methods=["GET"])
def get_food_cart(cart_id):

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    cart_code,
                    cart_name,
                    ownership_type,
                    vendor_id,
                    description,
                    status,
                    notes,
                    created_at,
                    updated_at
                FROM food_carts
                WHERE id = %s
            """, (cart_id,))

            cart = cursor.fetchone()

        connection.close()

        if not cart:

            return jsonify({
                "success": False,
                "error": "Food cart not found"
            }), 404

        return jsonify({
            "success": True,
            "data": cart
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# CREATE FOOD CART
# ==========================================

@food_carts_bp.route("/", methods=["POST"])
def create_food_cart():

    data = request.get_json() or {}

    cart_code = data.get("cart_code")
    cart_name = data.get("cart_name")
    ownership_type = data.get(
        "ownership_type",
        "BUSINESS"
    )
    vendor_id = data.get("vendor_id")
    description = data.get("description")
    status = data.get(
        "status",
        "AVAILABLE"
    )
    notes = data.get("notes")

    if not cart_code or not cart_name:

        return jsonify({
            "success": False,
            "error": "cart_code and cart_name are required"
        }), 400

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                INSERT INTO food_carts (
                    cart_code,
                    cart_name,
                    ownership_type,
                    vendor_id,
                    description,
                    status,
                    notes
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                cart_code,
                cart_name,
                ownership_type,
                vendor_id,
                description,
                status,
                notes
            ))

        connection.commit()

        connection.close()

        return jsonify({
            "success": True,
            "message": "Food cart created successfully"
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# UPDATE FOOD CART
# ==========================================

@food_carts_bp.route(
    "/<int:cart_id>",
    methods=["PUT"]
)
def update_food_cart(cart_id):

    data = request.get_json() or {}

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                UPDATE food_carts
                SET
                    cart_code = %s,
                    cart_name = %s,
                    ownership_type = %s,
                    vendor_id = %s,
                    description = %s,
                    status = %s,
                    notes = %s
                WHERE id = %s
            """, (
                data.get("cart_code"),
                data.get("cart_name"),
                data.get(
                    "ownership_type",
                    "BUSINESS"
                ),
                data.get("vendor_id"),
                data.get("description"),
                data.get(
                    "status",
                    "AVAILABLE"
                ),
                data.get("notes"),
                cart_id
            ))

            affected = cursor.rowcount

        connection.commit()

        connection.close()

        if affected == 0:

            return jsonify({
                "success": False,
                "error": "Food cart not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Food cart updated successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# DELETE FOOD CART
# ==========================================

@food_carts_bp.route(
    "/<int:cart_id>",
    methods=["DELETE"]
)
def delete_food_cart(cart_id):

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                DELETE FROM food_carts
                WHERE id = %s
            """, (cart_id,))

            affected = cursor.rowcount

        connection.commit()

        connection.close()

        if affected == 0:

            return jsonify({
                "success": False,
                "error": "Food cart not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Food cart deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500