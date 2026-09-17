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
                SELECT id, vendor_id, item_code, name, category, price, cost, description, image_emoji, is_available,
                       stock_quantity, track_inventory, low_stock_threshold
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
            # Check inventory availability
            for oi in order_items_to_insert:
                if oi.get("menu_item_id"):
                    cursor.execute("""
                        SELECT name, stock_quantity, track_inventory 
                        FROM menu_items 
                        WHERE id = %s
                    """, (oi["menu_item_id"],))
                    inv_row = cursor.fetchone()
                    if inv_row and inv_row.get("track_inventory"):
                        if inv_row["stock_quantity"] < oi["quantity"]:
                            connection.close()
                            return jsonify({
                                "success": False,
                                "error": f"Insufficient stock for '{inv_row['name']}'. Only {inv_row['stock_quantity']} left in stock!"
                            }), 400

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

            # Decrement inventory for ordered items
            for oi in order_items_to_insert:
                if oi.get("menu_item_id"):
                    cursor.execute("""
                        UPDATE menu_items 
                        SET stock_quantity = GREATEST(0, stock_quantity - %s)
                        WHERE id = %s AND track_inventory = 1
                    """, (oi["quantity"], oi["menu_item_id"]))

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


# ===================================================
# MENU & INVENTORY MANAGEMENT (ADD/EDIT/RESTOCK)
# ===================================================

@pos_bp.route("/menu", methods=["POST"])
def add_menu_item():
    """Allows a stall to add their own food item with initial stock."""
    data = request.get_json() or {}
    vendor_id = data.get("vendor_id")
    name = (data.get("name") or "").strip()

    if not vendor_id:
        return jsonify({"success": False, "error": "vendor_id is required"}), 400
    if not name:
        return jsonify({"success": False, "error": "Item name is required"}), 400

    category = (data.get("category") or "General").strip()
    price = Decimal(str(data.get("price", 0.00)))
    cost = Decimal(str(data.get("cost", 0.00)))
    stock_quantity = int(data.get("stock_quantity", 50))
    low_stock_threshold = int(data.get("low_stock_threshold", 5))
    track_inventory = 1 if data.get("track_inventory", True) else 0
    description = (data.get("description") or "").strip()
    image_emoji = (data.get("image_emoji") or "🍲").strip()
    item_code = (data.get("item_code") or "").strip()

    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            if not item_code:
                cursor.execute("SELECT COUNT(*) as cnt FROM menu_items WHERE vendor_id = %s", (vendor_id,))
                cnt = cursor.fetchone()["cnt"] + 1
                item_code = f"ITM-{cnt:03d}"

            cursor.execute("""
                INSERT INTO menu_items (
                    vendor_id, item_code, name, category, price, cost,
                    stock_quantity, track_inventory, low_stock_threshold,
                    description, image_emoji, is_available
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, 1
                )
            """, (
                vendor_id, item_code, name, category, price, cost,
                stock_quantity, track_inventory, low_stock_threshold,
                description, image_emoji
            ))
            item_id = cursor.lastrowid
            connection.commit()

            cursor.execute("SELECT * FROM menu_items WHERE id = %s", (item_id,))
            created_item = serialize_item(cursor.fetchone())

        connection.close()
        return jsonify({
            "success": True,
            "message": f"Item '{name}' added successfully!",
            "data": created_item
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/menu/<int:item_id>", methods=["PUT"])
def update_menu_item(item_id):
    """Updates an existing menu item."""
    data = request.get_json() or {}
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM menu_items WHERE id = %s", (item_id,))
            item = cursor.fetchone()
            if not item:
                connection.close()
                return jsonify({"success": False, "error": "Item not found"}), 404

            name = data.get("name", item["name"])
            category = data.get("category", item["category"])
            price = Decimal(str(data.get("price", item["price"])))
            cost = Decimal(str(data.get("cost", item["cost"] or 0)))
            stock_quantity = int(data.get("stock_quantity", item["stock_quantity"]))
            low_stock_threshold = int(data.get("low_stock_threshold", item["low_stock_threshold"]))
            description = data.get("description", item["description"])
            image_emoji = data.get("image_emoji", item["image_emoji"])
            is_available = int(data.get("is_available", item["is_available"]))

            cursor.execute("""
                UPDATE menu_items SET
                    name = %s, category = %s, price = %s, cost = %s,
                    stock_quantity = %s, low_stock_threshold = %s,
                    description = %s, image_emoji = %s, is_available = %s
                WHERE id = %s
            """, (
                name, category, price, cost,
                stock_quantity, low_stock_threshold,
                description, image_emoji, is_available, item_id
            ))
            connection.commit()

            cursor.execute("SELECT * FROM menu_items WHERE id = %s", (item_id,))
            updated_item = serialize_item(cursor.fetchone())

        connection.close()
        return jsonify({"success": True, "message": "Item updated successfully!", "data": updated_item})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/menu/<int:item_id>/adjust-stock", methods=["POST"])
def adjust_stock(item_id):
    """Quick stock adjustment / restock."""
    data = request.get_json() or {}
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, stock_quantity FROM menu_items WHERE id = %s", (item_id,))
            item = cursor.fetchone()
            if not item:
                connection.close()
                return jsonify({"success": False, "error": "Item not found"}), 404

            if "new_stock" in data:
                new_stock = max(0, int(data["new_stock"]))
            elif "adjustment" in data:
                adj = int(data["adjustment"])
                new_stock = max(0, item["stock_quantity"] + adj)
            else:
                connection.close()
                return jsonify({"success": False, "error": "Provide adjustment or new_stock"}), 400

            cursor.execute("""
                UPDATE menu_items 
                SET stock_quantity = %s, 
                    is_available = CASE WHEN %s > 0 THEN 1 ELSE is_available END 
                WHERE id = %s
            """, (new_stock, new_stock, item_id))
            connection.commit()

        connection.close()
        return jsonify({
            "success": True,
            "message": f"Stock for '{item['name']}' updated to {new_stock}!",
            "data": {"item_id": item_id, "stock_quantity": new_stock}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@pos_bp.route("/menu/<int:item_id>", methods=["DELETE"])
def delete_menu_item(item_id):
    """Deletes a menu item."""
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM menu_items WHERE id = %s", (item_id,))
            connection.commit()
        connection.close()
        return jsonify({"success": True, "message": "Item deleted successfully!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

