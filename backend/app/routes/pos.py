import datetime
from decimal import Decimal
from flask import Blueprint, jsonify, request
from app.db import get_connection

pos_bp = Blueprint("pos_bp", __name__, url_prefix="/api/pos")


def serialize_item(item):
    """Helper to serialize datetime and Decimal objects in dicts."""
    res = {}
    for k, v in item.items():
        if isinstance(v, Decimal):
            res[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            res[k] = v.isoformat()
        else:
            res[k] = v
    return res


@pos_bp.route("/stalls", methods=["GET"])
def get_stalls():
    """Returns list of active food stalls / vendors for POS selection."""
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    v.id,
                    v.vendor_code,
                    v.business_name,
                    v.contact_person,
                    v.status,
                    fc.id AS cart_id,
                    fc.cart_code,
                    fc.cart_name,
                    rs.space_name
                FROM vendors v
                LEFT JOIN rentals r ON v.id = r.vendor_id AND r.status = 'ACTIVE'
                LEFT JOIN food_carts fc ON r.cart_id = fc.id
                LEFT JOIN rental_spaces rs ON r.space_id = rs.id
                WHERE v.status = 'ACTIVE'
                ORDER BY v.business_name ASC
            """)
            stalls = [serialize_item(row) for row in cursor.fetchall()]
        connection.close()

        return jsonify({
            "success": True,
            "data": stalls
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/menu/<int:vendor_id>", methods=["GET"])
def get_menu(vendor_id):
    """Fetches menu items for a specific food stall."""
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            # Check vendor exists
            cursor.execute("SELECT id, business_name FROM vendors WHERE id = %s", (vendor_id,))
            vendor = cursor.fetchone()
            if not vendor:
                connection.close()
                return jsonify({"success": False, "error": "Vendor not found"}), 404

            cursor.execute("""
                SELECT id, vendor_id, item_code, name, category, price, cost, description, image_emoji, is_available
                FROM menu_items
                WHERE vendor_id = %s
                ORDER BY category ASC, name ASC
            """, (vendor_id,))
            items = [serialize_item(row) for row in cursor.fetchall()]

            # Extract unique categories
            categories = ["All"] + sorted(list({item["category"] for item in items if item.get("category")}))

        connection.close()

        return jsonify({
            "success": True,
            "data": {
                "vendor": serialize_item(vendor),
                "categories": categories,
                "items": items
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/orders", methods=["POST"])
def create_order():
    """Takes a new customer order from mobile / tablet POS."""
    data = request.get_json() or {}
    vendor_id = data.get("vendor_id")
    items = data.get("items", [])

    if not vendor_id:
        return jsonify({"success": False, "error": "vendor_id is required"}), 400
    if not items or not isinstance(items, list):
        return jsonify({"success": False, "error": "At least one item is required in the order"}), 400

    customer_name = (data.get("customer_name") or "").strip() or "Walk-in Customer"
    order_type = data.get("order_type", "DINE_IN")  # DINE_IN, TAKEOUT, DELIVERY
    payment_method = data.get("payment_method", "CASH")
    cart_id = data.get("cart_id")
    notes = data.get("notes", "")

    # Calculate item totals
    subtotal = Decimal("0.00")
    order_items_to_insert = []

    for it in items:
        qty = int(it.get("quantity", 1))
        if qty <= 0:
            continue
        price = Decimal(str(it.get("unit_price", 0.00)))
        item_subtotal = price * qty
        subtotal += item_subtotal
        order_items_to_insert.append({
            "menu_item_id": it.get("menu_item_id"),
            "item_name": it.get("item_name") or "Unnamed Item",
            "unit_price": price,
            "quantity": qty,
            "subtotal": item_subtotal,
            "special_instructions": it.get("special_instructions")
        })

    if not order_items_to_insert:
        return jsonify({"success": False, "error": "Order has no valid items"}), 400

    discount_amount = Decimal(str(data.get("discount_amount", 0.00)))
    total_amount = max(Decimal("0.00"), subtotal - discount_amount)

    # Cash tendered and change calculation
    cash_tendered = Decimal(str(data.get("cash_tendered", total_amount)))
    change_amount = Decimal("0.00")
    if payment_method == "CASH":
        if cash_tendered >= total_amount:
            change_amount = cash_tendered - total_amount
        else:
            change_amount = Decimal("0.00")
    else:
        cash_tendered = total_amount
        change_amount = Decimal("0.00")

    today_str = datetime.date.today().strftime("%Y%m%d")

    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            # Generate unique sequential order number
            cursor.execute("SELECT MAX(id) as max_id, COUNT(*) as cnt FROM orders")
            row_info = cursor.fetchone()
            next_seq = (row_info["max_id"] or 0) + 1
            order_number = f"ORD-{today_str}-{next_seq:04d}"

            # If by chance it exists, append timestamp
            cursor.execute("SELECT id FROM orders WHERE order_number = %s", (order_number,))
            if cursor.fetchone():
                order_number = f"ORD-{today_str}-{next_seq:04d}-{int(datetime.datetime.now().timestamp()) % 1000}"

            # Insert order
            cursor.execute("""
                INSERT INTO orders (
                    order_number, vendor_id, cart_id, customer_name, order_type,
                    status, subtotal, discount_amount, total_amount, payment_method,
                    cash_tendered, change_amount, payment_status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'COMPLETED', %s, %s, %s, %s,
                    %s, %s, 'PAID', %s
                )
            """, (
                order_number, vendor_id, cart_id, customer_name, order_type,
                subtotal, discount_amount, total_amount, payment_method,
                cash_tendered, change_amount, notes
            ))
            order_id = cursor.lastrowid

            # Insert order items
            for oi in order_items_to_insert:
                cursor.execute("""
                    INSERT INTO order_items (
                        order_id, menu_item_id, item_name, unit_price, quantity, subtotal, special_instructions
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_id, oi["menu_item_id"], oi["item_name"], oi["unit_price"],
                    oi["quantity"], oi["subtotal"], oi["special_instructions"]
                ))

            # Fetch stall name and currency setting
            cursor.execute("SELECT business_name FROM vendors WHERE id = %s", (vendor_id,))
            v_info = cursor.fetchone() or {}

            cursor.execute("SELECT business_name, currency, phone, address, receipt_header, receipt_footer FROM business_settings LIMIT 1")
            settings = cursor.fetchone() or {"currency": "PHP"}

            connection.commit()

        connection.close()

        return jsonify({
            "success": True,
            "message": f"Order {order_number} successfully placed!",
            "data": {
                "order_id": order_id,
                "order_number": order_number,
                "vendor_id": vendor_id,
                "stall_name": v_info.get("business_name", "Food Stall"),
                "customer_name": customer_name,
                "order_type": order_type,
                "status": "COMPLETED",
                "subtotal": float(subtotal),
                "discount_amount": float(discount_amount),
                "total_amount": float(total_amount),
                "payment_method": payment_method,
                "cash_tendered": float(cash_tendered),
                "change_amount": float(change_amount),
                "created_at": datetime.datetime.now().isoformat(),
                "items": [serialize_item(oi) for oi in order_items_to_insert],
                "currency": settings.get("currency", "PHP")
            }
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/orders/<int:vendor_id>", methods=["GET"])
def get_orders(vendor_id):
    """List recent orders for a stall."""
    limit = min(int(request.args.get("limit", 30)), 100)
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id, order_number, vendor_id, cart_id, customer_name,
                    order_type, status, subtotal, discount_amount, total_amount,
                    payment_method, cash_tendered, change_amount, payment_status,
                    created_at
                FROM orders
                WHERE vendor_id = %s
                ORDER BY id DESC
                LIMIT %s
            """, (vendor_id, limit))
            orders = [serialize_item(row) for row in cursor.fetchall()]

            # Attach items for each order
            if orders:
                order_ids = [o["id"] for o in orders]
                format_strings = ",".join(["%s"] * len(order_ids))
                cursor.execute(f"""
                    SELECT order_id, id, menu_item_id, item_name, unit_price, quantity, subtotal, special_instructions
                    FROM order_items
                    WHERE order_id IN ({format_strings})
                    ORDER BY id ASC
                """, tuple(order_ids))
                items_by_order = {}
                for it in cursor.fetchall():
                    s_it = serialize_item(it)
                    items_by_order.setdefault(s_it["order_id"], []).append(s_it)

                for o in orders:
                    o["items"] = items_by_order.get(o["id"], [])

        connection.close()

        return jsonify({
            "success": True,
            "data": orders
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    """Update order status: PENDING, PREPARING, READY, COMPLETED, CANCELLED."""
    data = request.get_json() or {}
    new_status = (data.get("status") or "").upper()
    valid_statuses = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"]

    if new_status not in valid_statuses:
        return jsonify({"success": False, "error": f"Invalid status. Must be one of {valid_statuses}"}), 400

    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, order_id))
            connection.commit()
        connection.close()

        return jsonify({
            "success": True,
            "message": f"Order status updated to {new_status}"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/summary/<int:vendor_id>", methods=["GET"])
def get_pos_summary(vendor_id):
    """Returns real-time stall KPI for today's orders and sales."""
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            # Today's totals
            cursor.execute("""
                SELECT 
                    COUNT(*) as today_orders,
                    COALESCE(SUM(total_amount), 0) as today_sales,
                    COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as today_cash,
                    COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END), 0) as today_digital,
                    COALESCE(SUM(CASE WHEN status IN ('PENDING', 'PREPARING') THEN 1 ELSE 0 END), 0) as active_orders
                FROM orders
                WHERE vendor_id = %s AND DATE(created_at) = CURDATE()
            """, (vendor_id,))
            today_kpi = serialize_item(cursor.fetchone())

            # Top selling items
            cursor.execute("""
                SELECT 
                    oi.item_name,
                    SUM(oi.quantity) as total_qty_sold,
                    SUM(oi.subtotal) as total_revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.vendor_id = %s
                GROUP BY oi.item_name
                ORDER BY total_qty_sold DESC
                LIMIT 5
            """, (vendor_id,))
            top_items = [serialize_item(r) for r in cursor.fetchall()]

        connection.close()

        return jsonify({
            "success": True,
            "data": {
                "kpi": today_kpi,
                "top_items": top_items
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
