from flask import Blueprint, jsonify, request
from app.db import get_connection
from datetime import datetime
import uuid


rentals_bp = Blueprint(
    "rentals",
    __name__,
    url_prefix="/api/rentals"
)


# ==========================================
# GET ALL RENTALS
# ==========================================

@rentals_bp.route("/", methods=["GET"])
def get_rentals():

    connection = None

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    r.id,
                    r.rental_code,
                    r.vendor_id,
                    r.space_id,
                    r.cart_id,
                    r.start_date,
                    r.end_date,
                    r.billing_cycle,
                    r.rent_amount,
                    r.security_deposit,
                    r.status,
                    r.notes,
                    v.business_name AS vendor_name
                FROM rentals r
                LEFT JOIN vendors v
                    ON r.vendor_id = v.id
                ORDER BY r.created_at DESC
            """)

            rentals = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": rentals
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if connection:
            connection.close()


# ==========================================

# ==========================================
# UPDATE RENTAL
# ==========================================

@rentals_bp.route("/<int:rental_id>", methods=["PUT"])
def update_rental(rental_id):

    connection = None

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is required."
            }), 400


        # ----------------------------------
        # Get fields
        # ----------------------------------

        vendor_id = data.get("vendor_id")
        cart_id = data.get("cart_id")
        space_id = data.get("space_id")

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        billing_cycle = data.get(
            "billing_cycle",
            "MONTHLY"
        )

        rent_amount = data.get(
            "rent_amount",
            0
        )

        security_deposit = data.get(
            "security_deposit",
            0
        )

        status = data.get(
            "status",
            "ACTIVE"
        )

        notes = data.get("notes")


        # ----------------------------------
        # Required fields
        # ----------------------------------

        if not vendor_id:

            return jsonify({
                "success": False,
                "error": "Vendor is required."
            }), 400


        if not start_date:

            return jsonify({
                "success": False,
                "error": "Start date is required."
            }), 400


        # ----------------------------------
        # Validate dates
        # ----------------------------------

        try:

            datetime.strptime(
                start_date,
                "%Y-%m-%d"
            )

            if end_date:

                datetime.strptime(
                    end_date,
                    "%Y-%m-%d"
                )

        except ValueError:

            return jsonify({
                "success": False,
                "error": "Dates must use YYYY-MM-DD format."
            }), 400


        # ----------------------------------
        # Validate amounts
        # ----------------------------------

        try:

            rent_amount = float(rent_amount)

            security_deposit = float(
                security_deposit
            )

        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "error": "Rent amount and security deposit must be numbers."
            }), 400


        if rent_amount < 0:

            return jsonify({
                "success": False,
                "error": "Rent amount cannot be negative."
            }), 400


        if security_deposit < 0:

            return jsonify({
                "success": False,
                "error": "Security deposit cannot be negative."
            }), 400


        # ----------------------------------
        # Database
        # ----------------------------------

        connection = get_connection()

        with connection.cursor() as cursor:


            # ----------------------------------
            # Check rental exists
            # ----------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    cart_id,
                    status
                FROM rentals
                WHERE id = %s
                """,
                (rental_id,)
            )

            rental = cursor.fetchone()


            if not rental:

                return jsonify({
                    "success": False,
                    "error": "Rental not found."
                }), 404


            # ----------------------------------
            # Check vendor exists
            # ----------------------------------

            cursor.execute(
                """
                SELECT id
                FROM vendors
                WHERE id = %s
                """,
                (vendor_id,)
            )

            vendor = cursor.fetchone()


            if not vendor:

                return jsonify({
                    "success": False,
                    "error": "Selected vendor does not exist."
                }), 400


            # ----------------------------------
            # Synchronize food cart status
            # ----------------------------------

            old_cart_id = rental["cart_id"]
            old_status = str(rental["status"] or "").upper()
            new_status = str(status or "").upper()

                        # ----------------------------------
            # Validate new ACTIVE cart
            # ----------------------------------

            if new_status == "ACTIVE" and cart_id:

                cursor.execute(
                    """
                    SELECT id, status
                    FROM food_carts
                    WHERE id = %s
                    """,
                    (cart_id,)
                )

                new_cart = cursor.fetchone()

                if not new_cart:

                    return jsonify({
                        "success": False,
                        "error": "Selected food cart does not exist."
                    }), 400

                cart_status = str(new_cart["status"] or "").upper()

                same_active_cart = (
                    old_status == "ACTIVE"
                    and old_cart_id == cart_id
                )

                if cart_status != "AVAILABLE" and not same_active_cart:

                    return jsonify({
                        "success": False,
                        "error": "Selected food cart is not available."
                    }), 400
# ----------------------------------
            # Release old cart when leaving ACTIVE
            # or changing to another cart
            # ----------------------------------

            if old_cart_id and (
                old_status == "ACTIVE"
                and (
                    new_status != "ACTIVE"
                    or old_cart_id != cart_id
                )
            ):

                cursor.execute(
                    """
                    SELECT COUNT(*) AS active_count
                    FROM rentals
                    WHERE cart_id = %s
                      AND status = 'ACTIVE'
                      AND id <> %s
                    """,
                    (old_cart_id, rental_id)
                )

                active_usage = cursor.fetchone()

                if not active_usage or int(active_usage["active_count"]) == 0:

                    cursor.execute(
                        """
                        UPDATE food_carts
                        SET status = %s
                        WHERE id = %s
                        """,
                        ("AVAILABLE", old_cart_id)
                    )

            # ----------------------------------
            # Mark new/current cart as RENTED
            # ----------------------------------

            if new_status == "ACTIVE" and cart_id:

                cursor.execute(
                    """
                    UPDATE food_carts
                    SET status = %s
                    WHERE id = %s
                    """,
                    ("RENTED", cart_id)
                )

            # ----------------------------------
            # Update rental
            # ----------------------------------

            cursor.execute(
                """
                UPDATE rentals
                SET
                    vendor_id = %s,
                    space_id = %s,
                    cart_id = %s,
                    start_date = %s,
                    end_date = %s,
                    billing_cycle = %s,
                    rent_amount = %s,
                    security_deposit = %s,
                    status = %s,
                    notes = %s
                WHERE id = %s
                """,
                (
                    vendor_id,
                    space_id,
                    cart_id,
                    start_date,
                    end_date,
                    billing_cycle,
                    rent_amount,
                    security_deposit,
                    status,
                    notes,
                    rental_id
                )
            )


        connection.commit()


        return jsonify({
            "success": True,
            "message": "Rental updated successfully.",
            "data": {
                "id": rental_id
            }
        })


    except Exception as e:

        if connection:
            connection.rollback()


        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


    finally:

        if connection:
            connection.close()

# CREATE RENTAL
# ==========================================

# ==========================================
# GET SINGLE RENTAL
# ==========================================

@rentals_bp.route("/<int:rental_id>", methods=["GET"])
def get_rental(rental_id):

    connection = None

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    r.id,
                    r.rental_code,
                    r.vendor_id,
                    r.space_id,
                    r.cart_id,
                    r.start_date,
                    r.end_date,
                    r.billing_cycle,
                    r.rent_amount,
                    r.security_deposit,
                    r.status,
                    r.notes,
                    r.created_at,
                    r.updated_at,

                    v.business_name AS vendor_name,

                    fc.cart_name,
                    fc.cart_code

                FROM rentals r

                LEFT JOIN vendors v
                    ON r.vendor_id = v.id

                LEFT JOIN food_carts fc
                    ON r.cart_id = fc.id

                WHERE r.id = %s

                LIMIT 1
            """, (rental_id,))

            rental = cursor.fetchone()

        if not rental:

            return jsonify({
                "success": False,
                "error": "Rental not found."
            }), 404

        return jsonify({
            "success": True,
            "data": rental
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if connection:
            connection.close()

@rentals_bp.route("/", methods=["POST"])
def create_rental():

    connection = None

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is required."
            }), 400


        # ----------------------------------
        # Required fields
        # ----------------------------------

        vendor_id = data.get("vendor_id")
        start_date = data.get("start_date")
        billing_cycle = data.get(
            "billing_cycle",
            "MONTHLY"
        )

        rent_amount = data.get(
            "rent_amount",
            0
        )

        security_deposit = data.get(
            "security_deposit",
            0
        )


        if not vendor_id:
            return jsonify({
                "success": False,
                "error": "Vendor is required."
            }), 400


        if not start_date:
            return jsonify({
                "success": False,
                "error": "Start date is required."
            }), 400


        # ----------------------------------
        # Optional fields
        # ----------------------------------

        space_id = data.get("space_id")
        cart_id = data.get("cart_id")
        end_date = data.get("end_date")
        notes = data.get("notes")

        status = data.get(
            "status",
            "ACTIVE"
        )


        # ----------------------------------
        # Validate dates
        # ----------------------------------

        try:

            datetime.strptime(
                start_date,
                "%Y-%m-%d"
            )

            if end_date:
                datetime.strptime(
                    end_date,
                    "%Y-%m-%d"
                )

        except ValueError:

            return jsonify({
                "success": False,
                "error": "Dates must use YYYY-MM-DD format."
            }), 400


        # ----------------------------------
        # Validate amounts
        # ----------------------------------

        try:

            rent_amount = float(rent_amount)
            security_deposit = float(
                security_deposit
            )

        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "error": "Rent amount and security deposit must be numbers."
            }), 400


        if rent_amount < 0:
            return jsonify({
                "success": False,
                "error": "Rent amount cannot be negative."
            }), 400


        if security_deposit < 0:
            return jsonify({
                "success": False,
                "error": "Security deposit cannot be negative."
            }), 400


        # ----------------------------------
        # Generate rental code
        # ----------------------------------

        rental_code = (
            "RNT-"
            + datetime.now().strftime("%Y%m%d")
            + "-"
            + uuid.uuid4().hex[:6].upper()
        )


        # ----------------------------------
        # Database
        # ----------------------------------

        connection = get_connection()

        with connection.cursor() as cursor:

            # Check vendor exists
            cursor.execute(
                """
                SELECT id
                FROM vendors
                WHERE id = %s
                """,
                (vendor_id,)
            )

            vendor = cursor.fetchone()

            if not vendor:

                return jsonify({
                    "success": False,
                    "error": "Selected vendor does not exist."
                }), 400


            # ----------------------------------
            # Insert rental
            # ----------------------------------

            cursor.execute(
                """
                INSERT INTO rentals (
                    rental_code,
                    vendor_id,
                    space_id,
                    cart_id,
                    start_date,
                    end_date,
                    billing_cycle,
                    rent_amount,
                    security_deposit,
                    status,
                    notes
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    rental_code,
                    vendor_id,
                    space_id,
                    cart_id,
                    start_date,
                    end_date,
                    billing_cycle,
                    rent_amount,
                    security_deposit,
                    status,
                    notes
                )
            )


            rental_id = cursor.lastrowid


            # ----------------------------------
            # Mark food cart as RENTED
            # ----------------------------------

            if cart_id and str(status).upper() == "ACTIVE":

                cursor.execute(
                    """
                    UPDATE food_carts
                    SET status = %s
                    WHERE id = %s
                    """,
                    ("RENTED", cart_id)
                )


        connection.commit()


        return jsonify({
            "success": True,
            "message": "Rental created successfully.",
            "data": {
                "id": rental_id,
                "rental_code": rental_code
            }
        }), 201


    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


    finally:

        if connection:
            connection.close()








