from flask import Blueprint, jsonify
from app.db import get_connection


dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/dashboard"
)


@dashboard_bp.route("/", methods=["GET"])
def dashboard():

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            # --------------------------------
            # TOTAL REVENUE
            # --------------------------------
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) AS total_revenue
                FROM payments
            """)

            total_revenue = cursor.fetchone()["total_revenue"]


            # --------------------------------
            # ACTIVE RENTALS
            # --------------------------------
            cursor.execute("""
                SELECT COUNT(*) AS active_rentals
                FROM rentals
                WHERE status = 'ACTIVE'
            """)

            active_rentals = cursor.fetchone()["active_rentals"]


            # --------------------------------
            # FOOD VENDORS
            # --------------------------------
            cursor.execute("""
                SELECT COUNT(*) AS food_vendors
                FROM vendors
                WHERE status = 'ACTIVE'
            """)

            food_vendors = cursor.fetchone()["food_vendors"]


            # --------------------------------
            # AVAILABLE RENTAL SPACES
            # --------------------------------
            cursor.execute("""
                SELECT COUNT(*) AS available_spaces
                FROM rental_spaces
                WHERE status = 'AVAILABLE'
            """)

            available_spaces = cursor.fetchone()["available_spaces"]


        return jsonify({
            "success": True,
            "data": {
                "total_revenue": float(total_revenue),
                "active_rentals": active_rentals,
                "food_vendors": food_vendors,
                "available_spaces": available_spaces
            }
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if connection:
            connection.close()