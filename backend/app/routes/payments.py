from flask import Blueprint, jsonify, request
from app.db import get_connection


payments_bp = Blueprint(
    "payments",
    __name__,
    url_prefix="/api/payments"
)


@payments_bp.route("/", methods=["GET"])
def list_payments():

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    p.id,
                    p.receipt_number,
                    p.rental_id,
                    p.vendor_id,
                    v.business_name AS vendor_name,
                    r.rental_code,
                    p.amount,
                    p.payment_method,
                    p.payment_date,
                    p.period_start,
                    p.period_end,
                    p.reference_number,
                    p.received_by,
                    p.notes,
                    p.created_at
                FROM payments p
                LEFT JOIN vendors v
                    ON v.id = p.vendor_id
                LEFT JOIN rentals r
                    ON r.id = p.rental_id
                ORDER BY p.payment_date DESC, p.id DESC
            """)

            payments = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": payments
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if connection:
            connection.close()


@payments_bp.route("/", methods=["POST"])
def create_payment():

    connection = None

    try:

        data = request.get_json() or {}

        rental_id = data.get("rental_id")
        vendor_id = data.get("vendor_id")
        amount = data.get("amount")
        payment_method = data.get("payment_method") or "CASH"
        payment_date = data.get("payment_date")
        period_start = data.get("period_start")
        period_end = data.get("period_end")
        reference_number = data.get("reference_number")
        received_by = data.get("received_by")
        notes = data.get("notes")

        if not rental_id:
            return jsonify({
                "success": False,
                "error": "Rental is required."
            }), 400

        if payment_date and "T" in str(payment_date):
            payment_date = str(payment_date).replace("T", " ")

        if amount is None:
            return jsonify({
                "success": False,
                "error": "Payment amount is required."
            }), 400

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "error": "Payment amount must be a valid number."
            }), 400

        if amount <= 0:
            return jsonify({
                "success": False,
                "error": "Payment amount must be greater than zero."
            }), 400

        connection = get_connection()

        with connection.cursor() as cursor:

            # ----------------------------------
            # Verify rental
            # ----------------------------------

            cursor.execute("""
                SELECT
                    id,
                    rental_code,
                    vendor_id
                FROM rentals
                WHERE id = %s
            """, (rental_id,))

            rental = cursor.fetchone()

            if not rental:

                return jsonify({
                    "success": False,
                    "error": "Selected rental does not exist."
                }), 400

            if not vendor_id:
                vendor_id = rental.get("vendor_id")

            if not vendor_id:
                return jsonify({
                    "success": False,
                    "error": "Vendor is required."
                }), 400

            # ----------------------------------
            # Verify vendor
            # ----------------------------------

            cursor.execute("""
                SELECT
                    id,
                    business_name
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))

            vendor = cursor.fetchone()

            if not vendor:

                return jsonify({
                    "success": False,
                    "error": "Selected vendor does not exist."
                }), 400

            # ----------------------------------
            # Generate receipt number
            # ----------------------------------

            cursor.execute("""
                SELECT id
                FROM payments
                ORDER BY id DESC
                LIMIT 1
            """)

            last_payment = cursor.fetchone()

            next_id = (
                int(last_payment["id"]) + 1
                if last_payment
                else 1
            )

            receipt_number = f"PAY-{next_id:06d}"

            # ----------------------------------
            # Insert payment
            # ----------------------------------

            cursor.execute("""
                INSERT INTO payments (
                    receipt_number,
                    rental_id,
                    vendor_id,
                    amount,
                    payment_method,
                    payment_date,
                    period_start,
                    period_end,
                    reference_number,
                    received_by,
                    notes
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    COALESCE(%s, CURRENT_TIMESTAMP),
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            """, (
                receipt_number,
                rental_id,
                vendor_id,
                amount,
                payment_method,
                payment_date,
                period_start,
                period_end,
                reference_number,
                received_by,
                notes
            ))

            payment_id = cursor.lastrowid

            connection.commit()

        return jsonify({
            "success": True,
            "message": "Payment created successfully.",
            "data": {
                "id": payment_id,
                "receipt_number": receipt_number
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


@payments_bp.route("/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):

    connection = None

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    p.id,
                    p.receipt_number,
                    p.rental_id,
                    p.vendor_id,
                    v.business_name AS vendor_name,
                    r.rental_code,
                    p.amount,
                    p.payment_method,
                    p.payment_date,
                    p.period_start,
                    p.period_end,
                    p.reference_number,
                    p.received_by,
                    p.notes,
                    p.created_at
                FROM payments p
                LEFT JOIN vendors v
                    ON v.id = p.vendor_id
                LEFT JOIN rentals r
                    ON r.id = p.rental_id
                WHERE p.id = %s
            """, (payment_id,))

            payment = cursor.fetchone()

        if not payment:

            return jsonify({
                "success": False,
                "error": "Payment not found."
            }), 404

        return jsonify({
            "success": True,
            "data": payment
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if connection:
            connection.close()


@payments_bp.route("/<int:payment_id>", methods=["PUT"])
def update_payment(payment_id):

    connection = None

    try:

        data = request.get_json() or {}

        rental_id = data.get("rental_id")
        vendor_id = data.get("vendor_id")
        amount = data.get("amount")
        payment_method = data.get("payment_method") or "CASH"
        payment_date = data.get("payment_date")
        period_start = data.get("period_start")
        period_end = data.get("period_end")
        reference_number = data.get("reference_number")
        received_by = data.get("received_by")
        notes = data.get("notes")

        if payment_date and "T" in str(payment_date):
            payment_date = str(payment_date).replace("T", " ")

        if amount is None:
            return jsonify({
                "success": False,
                "error": "Payment amount is required."
            }), 400

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "error": "Payment amount must be a valid number."
            }), 400

        if amount <= 0:
            return jsonify({
                "success": False,
                "error": "Payment amount must be greater than zero."
            }), 400

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT id, rental_id, vendor_id
                FROM payments
                WHERE id = %s
            """, (payment_id,))

            existing_payment = cursor.fetchone()

            if not existing_payment:

                return jsonify({
                    "success": False,
                    "error": "Payment not found."
                }), 404

            if not rental_id:
                rental_id = existing_payment.get("rental_id")

            if not vendor_id:
                vendor_id = existing_payment.get("vendor_id")

            if not rental_id:
                return jsonify({
                    "success": False,
                    "error": "Rental is required."
                }), 400

            cursor.execute("""
                SELECT id, vendor_id
                FROM rentals
                WHERE id = %s
            """, (rental_id,))

            rental = cursor.fetchone()

            if not rental:

                return jsonify({
                    "success": False,
                    "error": "Selected rental does not exist."
                }), 400

            if not vendor_id:
                vendor_id = rental.get("vendor_id")

            if not vendor_id:
                return jsonify({
                    "success": False,
                    "error": "Vendor is required."
                }), 400

            cursor.execute("""
                SELECT id
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))

            if not cursor.fetchone():

                return jsonify({
                    "success": False,
                    "error": "Selected vendor does not exist."
                }), 400

            cursor.execute("""
                UPDATE payments
                SET
                    rental_id = %s,
                    vendor_id = %s,
                    amount = %s,
                    payment_method = %s,
                    payment_date = COALESCE(%s, payment_date),
                    period_start = %s,
                    period_end = %s,
                    reference_number = %s,
                    received_by = %s,
                    notes = %s
                WHERE id = %s
            """, (
                rental_id,
                vendor_id,
                amount,
                payment_method,
                payment_date,
                period_start,
                period_end,
                reference_number,
                received_by,
                notes,
                payment_id
            ))

            connection.commit()

        return jsonify({
            "success": True,
            "message": "Payment updated successfully.",
            "data": {
                "id": payment_id
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
