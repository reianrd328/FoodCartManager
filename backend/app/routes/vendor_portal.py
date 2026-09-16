from flask import Blueprint, jsonify, request
from app.db import get_connection

vendor_portal_bp = Blueprint("vendor_portal", __name__, url_prefix="/api/vendor-portal")


@vendor_portal_bp.route("/overview/<int:vendor_id>", methods=["GET"])
def get_vendor_overview(vendor_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. Vendor Details
            cur.execute("""
                SELECT id, vendor_code, business_name, contact_person, phone, email, address, status
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))
            vendor = cur.fetchone()

            if not vendor:
                return jsonify({"success": False, "error": "Vendor not found."}), 404

            # 2. Active and Total Rentals
            cur.execute("""
                SELECT 
                    COUNT(*) AS total_rentals,
                    SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_rentals,
                    SUM(CASE WHEN status = 'ACTIVE' THEN rent_amount ELSE 0 END) AS active_monthly_rent
                FROM rentals
                WHERE vendor_id = %s
            """, (vendor_id,))
            rentals_summary = cur.fetchone() or {"total_rentals": 0, "active_rentals": 0, "active_monthly_rent": 0}

            # 3. Payments Summary
            cur.execute("""
                SELECT 
                    COUNT(*) AS total_payments,
                    COALESCE(SUM(amount), 0) AS total_paid
                FROM payments
                WHERE vendor_id = %s
            """, (vendor_id,))
            payments_summary = cur.fetchone() or {"total_payments": 0, "total_paid": 0}

            # 4. Business Settings (branding & currency)
            cur.execute("""
                SELECT business_name, address, phone, email, currency
                FROM business_settings
                ORDER BY id ASC
                LIMIT 1
            """)
            settings = cur.fetchone() or {"business_name": "FoodCart Park & Leasing", "currency": "PHP"}

            return jsonify({
                "success": True,
                "data": {
                    "vendor": vendor,
                    "summary": {
                        "total_rentals": rentals_summary.get("total_rentals") or 0,
                        "active_rentals": rentals_summary.get("active_rentals") or 0,
                        "active_monthly_rent": float(rentals_summary.get("active_monthly_rent") or 0),
                        "total_payments": payments_summary.get("total_payments") or 0,
                        "total_paid": float(payments_summary.get("total_paid") or 0)
                    },
                    "settings": settings
                }
            }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@vendor_portal_bp.route("/rentals/<int:vendor_id>", methods=["GET"])
def get_vendor_rentals(vendor_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    r.id,
                    r.rental_code,
                    r.vendor_id,
                    r.cart_id,
                    r.space_id,
                    r.start_date,
                    r.end_date,
                    r.billing_cycle,
                    r.rent_amount,
                    r.status,
                    r.notes,
                    fc.cart_name,
                    fc.cart_code,
                    fc.model AS cart_model,
                    rs.space_name,
                    rs.space_code
                FROM rentals r
                LEFT JOIN food_carts fc ON r.cart_id = fc.id
                LEFT JOIN rental_spaces rs ON r.space_id = rs.id
                WHERE r.vendor_id = %s
                ORDER BY r.id DESC
            """, (vendor_id,))
            rentals = cur.fetchall()

            return jsonify({"success": True, "data": rentals}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@vendor_portal_bp.route("/payments/<int:vendor_id>", methods=["GET"])
def get_vendor_payments(vendor_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
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
                    r.rental_code,
                    COALESCE(rc.id, 0) AS receipt_id,
                    COALESCE(rc.print_count, 0) AS print_count,
                    COALESCE(rc.status, 'CREATED') AS receipt_status
                FROM payments p
                LEFT JOIN rentals r ON p.rental_id = r.id
                LEFT JOIN receipts rc ON p.id = rc.payment_id
                WHERE p.vendor_id = %s
                ORDER BY p.payment_date DESC, p.id DESC
            """, (vendor_id,))
            payments = cur.fetchall()

            return jsonify({"success": True, "data": payments}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()

