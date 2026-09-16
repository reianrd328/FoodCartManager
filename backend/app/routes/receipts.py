from flask import Blueprint, jsonify, request
from app.db import get_connection

receipts_bp = Blueprint(
    "receipts",
    __name__,
    url_prefix="/api/receipts"
)


@receipts_bp.route('/', methods=['GET'])
def get_all_receipts():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Query payments joined with receipts, vendors, and rentals
            cur.execute("""
                SELECT 
                    p.id AS payment_id,
                    p.receipt_number,
                    p.amount,
                    p.payment_method,
                    p.payment_date,
                    p.reference_number,
                    p.notes,
                    v.id AS vendor_id,
                    v.business_name AS vendor_name,
                    v.contact_person,
                    v.phone AS vendor_phone,
                    rn.id AS rental_id,
                    rn.rental_code,
                    COALESCE(rc.id, 0) AS receipt_id,
                    COALESCE(rc.print_count, 0) AS print_count,
                    COALESCE(rc.status, 'CREATED') AS status,
                    rc.last_printed_at,
                    rc.created_at AS receipt_created_at
                FROM payments p
                LEFT JOIN receipts rc ON p.id = rc.payment_id
                LEFT JOIN vendors v ON p.vendor_id = v.id
                LEFT JOIN rentals rn ON p.rental_id = rn.id
                ORDER BY p.id DESC
            """)
            receipts = cur.fetchall()

            return jsonify({"success": True, "data": receipts}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@receipts_bp.route('/payment/<int:payment_id>', methods=['GET'])
def get_receipt_for_payment(payment_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. Fetch payment details with vendor and rental
            cur.execute("""
                SELECT 
                    p.id AS payment_id,
                    p.receipt_number,
                    p.amount,
                    p.payment_method,
                    p.payment_date,
                    p.period_start,
                    p.period_end,
                    p.reference_number,
                    p.notes,
                    v.id AS vendor_id,
                    v.business_name AS vendor_name,
                    v.contact_person,
                    v.phone AS vendor_phone,
                    v.email AS vendor_email,
                    v.address AS vendor_address,
                    rn.id AS rental_id,
                    rn.rental_code,
                    rn.billing_cycle,
                    rn.rent_amount
                FROM payments p
                LEFT JOIN vendors v ON p.vendor_id = v.id
                LEFT JOIN rentals rn ON p.rental_id = rn.id
                WHERE p.id = %s
            """, (payment_id,))
            payment = cur.fetchone()

            if not payment:
                return jsonify({"success": False, "error": "Payment record not found."}), 404

            # 2. Fetch or create receipt entry
            cur.execute("SELECT * FROM receipts WHERE payment_id = %s", (payment_id,))
            receipt = cur.fetchone()

            if not receipt:
                receipt_number = payment["receipt_number"]
                cur.execute("""
                    INSERT INTO receipts (receipt_number, payment_id, status, print_count)
                    VALUES (%s, %s, 'CREATED', 0)
                """, (receipt_number, payment_id))
                conn.commit()

                cur.execute("SELECT * FROM receipts WHERE payment_id = %s", (payment_id,))
                receipt = cur.fetchone()

            # 3. Fetch current business settings
            cur.execute("""
                SELECT business_name, address, phone, email,
                       receipt_header, receipt_footer, currency
                FROM business_settings
                ORDER BY id ASC
                LIMIT 1
            """)
            settings = cur.fetchone() or {
                "business_name": "FoodCart Park & Leasing",
                "address": "Metro Manila, Philippines",
                "phone": "0917-000-0000",
                "email": "contact@foodcartpark.ph",
                "receipt_header": "Official Rental Receipt",
                "receipt_footer": "Thank you for your business! Please keep this receipt for your records.",
                "currency": "PHP"
            }

            return jsonify({
                "success": True,
                "data": {
                    "payment": payment,
                    "receipt": receipt,
                    "settings": settings
                }
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@receipts_bp.route('/print/<int:payment_id>', methods=['POST'])
def record_receipt_print(payment_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check payment
            cur.execute("SELECT id, receipt_number FROM payments WHERE id = %s", (payment_id,))
            payment = cur.fetchone()

            if not payment:
                return jsonify({"success": False, "error": "Payment record not found."}), 404

            cur.execute("SELECT id, print_count FROM receipts WHERE payment_id = %s", (payment_id,))
            receipt = cur.fetchone()

            if receipt:
                cur.execute("""
                    UPDATE receipts
                    SET print_count = print_count + 1,
                        last_printed_at = NOW(),
                        status = 'PRINTED'
                    WHERE id = %s
                """, (receipt["id"],))
            else:
                cur.execute("""
                    INSERT INTO receipts (
                        receipt_number, payment_id, status, print_count, printed_at, last_printed_at
                    ) VALUES (%s, %s, 'PRINTED', 1, NOW(), NOW())
                """, (payment["receipt_number"], payment_id))

            conn.commit()

            cur.execute("SELECT * FROM receipts WHERE payment_id = %s", (payment_id,))
            updated_receipt = cur.fetchone()

            return jsonify({
                "success": True,
                "message": "Receipt print recorded.",
                "data": updated_receipt
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()
