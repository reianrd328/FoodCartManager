const API_BASE = window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

let currentVendorUser = null;
let currentAppSettings = null;
let currentReceiptPaymentId = null;

// Auth check on page load
document.addEventListener("DOMContentLoaded", () => {
    if (!window.location.protocol.startsWith("http")) {
        return;
    }
    const rawUser = localStorage.getItem("foodcart_user");
    if (!rawUser) {
        window.location.href = "/login/";
        return;
    }

    try {
        currentVendorUser = JSON.parse(rawUser);
    } catch (e) {
        localStorage.removeItem("foodcart_user");
        window.location.href = "/login/";
        return;
    }

    if (!currentVendorUser || currentVendorUser.role !== "VENDOR" || !currentVendorUser.vendor_id) {
        // If admin logged in, redirect to admin
        if (currentVendorUser && currentVendorUser.role === "ADMIN") {
            window.location.href = "/admin/";
            return;
        }
        window.location.href = "/login/";
        return;
    }

    // Set initial user info in UI
    const vName = currentVendorUser.vendor_name || currentVendorUser.full_name || "Vendor";
    const avatarEl = document.querySelector("#vendorAvatar");
    const nameEl = document.querySelector("#navVendorName");
    const subEl = document.querySelector("#navVendorPerson");
    const welcomeNameEl = document.querySelector("#welcomeVendorName");

    if (avatarEl) avatarEl.textContent = vName.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = vName;
    if (subEl) subEl.textContent = currentVendorUser.full_name || "Tenant";
    if (welcomeNameEl) welcomeNameEl.textContent = vName;

    loadPortalData();
});

function formatCurrency(val) {
    const cur = (currentAppSettings && currentAppSettings.currency) ? currentAppSettings.currency : "PHP";
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(val || 0);
    } catch (e) {
        const symbol = cur === "PHP" ? "₱" : cur + " ";
        return symbol + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

async function loadPortalData() {
    const vendorId = currentVendorUser.vendor_id;

    try {
        // 1. Fetch Overview & Settings
        const overviewRes = await fetch(`${API_BASE}/api/vendor-portal/overview/${vendorId}`);
        const overviewJson = await overviewRes.json();

        if (overviewJson.success && overviewJson.data) {
            const { vendor, summary, settings } = overviewJson.data;
            currentAppSettings = settings;

            if (settings.business_name) {
                const bTitle = document.querySelector("#brandBusinessName");
                if (bTitle) bTitle.textContent = settings.business_name;
            }

            document.querySelector("#kpiActiveCarts").textContent = summary.active_rentals || 0;
            document.querySelector("#kpiMonthlyRent").textContent = formatCurrency(summary.active_monthly_rent);
            document.querySelector("#kpiTotalPaid").textContent = formatCurrency(summary.total_paid);
        }

        // 2. Fetch Rentals
        loadVendorRentals(vendorId);

        // 3. Fetch Payments & Receipts
        loadVendorPayments(vendorId);

        // 4. Fetch Stall Menu & Inventory
        loadVendorInventory(vendorId);

    } catch (err) {
        console.error("Portal loading error:", err);
    }
}

async function loadVendorRentals(vendorId) {
    const container = document.querySelector("#rentalsListGrid");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/vendor-portal/rentals/${vendorId}`);
        const json = await res.json();
        const rentals = json.data || [];

        if (rentals.length === 0) {
            container.innerHTML = `
                <div class="empty-box" style="grid-column: 1 / -1;">
                    <h4>No active rentals</h4>
                    <p>You currently have no leased food carts or spaces.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = rentals.map(r => {
            const startDate = r.start_date ? new Date(r.start_date).toLocaleDateString("en-PH") : "-";
            const cartInfo = r.cart_name ? `${r.cart_name} (${r.cart_model || 'Model A'})` : (r.space_name || "Food Stall Slot");

            return `
                <div class="rental-box">
                    <div class="rental-box-header">
                        <div>
                            <strong>${r.rental_code}</strong>
                            <div style="font-size:12px;color:#785869;margin-top:2px;">${cartInfo}</div>
                        </div>
                        <span class="status-tag active">${r.status || 'ACTIVE'}</span>
                    </div>

                    <div class="rental-meta-item">
                        <span class="label">Rental Spot:</span>
                        <span class="val">${r.space_name || 'Designated Floor Spot'}</span>
                    </div>
                    <div class="rental-meta-item">
                        <span class="label">Billing Cycle:</span>
                        <span class="val">${r.billing_cycle || 'MONTHLY'}</span>
                    </div>
                    <div class="rental-meta-item">
                        <span class="label">Contract Start:</span>
                        <span class="val">${startDate}</span>
                    </div>
                    <div class="rental-meta-item">
                        <span class="label">Rent Amount:</span>
                        <span class="val price">${formatCurrency(r.rent_amount)}</span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Failed to load rentals:", err);
    }
}

async function loadVendorPayments(vendorId) {
    const tbody = document.querySelector("#paymentsTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/vendor-portal/payments/${vendorId}`);
        const json = await res.json();
        const payments = json.data || [];

        if (payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-box">
                            <h4>No payment records found</h4>
                            <p>Your official receipts will appear here after rental payments are acknowledged.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payments.map(p => {
            const pDate = p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-PH") : "-";
            const isPrinted = String(p.receipt_status || "").toUpperCase() === "PRINTED";
            const statusClass = isPrinted ? "printed" : "created";
            const statusText = isPrinted ? "Official Receipt Ready" : "Acknowledged";

            return `
                <tr>
                    <td><strong>${p.receipt_number || "-"}</strong></td>
                    <td>${p.rental_code || "-"}</td>
                    <td><strong>${formatCurrency(p.amount)}</strong></td>
                    <td>${p.payment_method || "-"}</td>
                    <td>${pDate}</td>
                    <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                    <td>
                        <button type="button" class="table-btn" onclick="openReceiptModal(${p.payment_id})">
                            View &amp; Print Receipt
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Failed to load payments:", err);
    }
}

// RECEIPT MODAL
async function openReceiptModal(paymentId) {
    currentReceiptPaymentId = paymentId;
    const modal = document.querySelector("#receiptModal");
    if (!modal) return;

    modal.style.display = "flex";

    try {
        const res = await fetch(`${API_BASE}/api/receipts/payment/${paymentId}`);
        const json = await res.json();

        if (!json.success || !json.data) {
            alert(json.error || "Unable to load receipt.");
            return;
        }

        const { payment, receipt, settings } = json.data;

        document.querySelector("#receiptBizName").textContent = settings.business_name || "FoodCart Park & Leasing";
        document.querySelector("#receiptBizAddress").textContent = settings.address || "";
        document.querySelector("#receiptBizContact").textContent = `Tel: ${settings.phone || ""} | ${settings.email || ""}`;
        document.querySelector("#receiptTitleText").textContent = (settings.receipt_header || "OFFICIAL RENTAL RECEIPT").toUpperCase();

        document.querySelector("#receiptNumberVal").textContent = payment.receipt_number;
        const d = payment.payment_date ? new Date(payment.payment_date) : new Date();
        document.querySelector("#receiptDateVal").textContent = d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
        document.querySelector("#receiptCopiesVal").textContent = `${receipt.print_count || 0} copy(ies)`;

        document.querySelector("#receiptVendorName").textContent = payment.vendor_name;
        document.querySelector("#receiptRentalCode").textContent = payment.rental_code;
        document.querySelector("#receiptMethod").textContent = payment.payment_method;
        document.querySelector("#receiptRef").textContent = payment.reference_number || "Cash / Counter";
        document.querySelector("#receiptDesc").textContent = `Food Cart Space Rental (${payment.rental_code})`;

        let periodStr = "Current cycle";
        if (payment.period_start && payment.period_end) {
            const sDate = new Date(payment.period_start);
            const eDate = new Date(payment.period_end);
            periodStr = `${sDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} to ${eDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
        }
        document.querySelector("#receiptPeriod").textContent = periodStr;

        const amtFormatted = formatCurrency(payment.amount);
        document.querySelector("#receiptItemAmount").textContent = amtFormatted;
        document.querySelector("#receiptTotalAmount").textContent = amtFormatted;
        document.querySelector("#receiptFooterTerms").textContent = settings.receipt_footer || "Thank you for your business! Please keep this receipt for your records.";

    } catch (err) {
        console.error("Open receipt modal error:", err);
    }
}

function closeReceiptModal() {
    const modal = document.querySelector("#receiptModal");
    if (modal) modal.style.display = "none";
}

async function triggerPrintReceipt() {
    if (currentReceiptPaymentId) {
        try {
            await fetch(`${API_BASE}/api/receipts/print/${currentReceiptPaymentId}`, { method: "POST" });
        } catch (e) {
            console.warn(e);
        }
    }
    window.print();
}

// ===================================================
// STALL MENU & INVENTORY MANAGEMENT (VENDOR PORTAL)
// ===================================================

let vendorMenuItems = [];

async function loadVendorInventory(vendorId) {
    const tbody = document.querySelector("#vendorMenuTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${vendorId}`);
        const json = await res.json();

        if (json.success && json.data) {
            vendorMenuItems = json.data.items || [];
            const categories = json.data.categories || [];

            // Populate Add Item datalist
            const datalist = document.querySelector("#vCatDatalist");
            if (datalist) {
                const filtered = categories.filter(c => c !== "All");
                datalist.innerHTML = filtered.map(c => `<option value="${c}"></option>`).join("");
            }

            renderVendorInventoryTable();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-box">
                            <h4>No menu items found</h4>
                            <p>Click "Add Food Item" above to create items for your food cart.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error("Error loading inventory:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;color:#c00;">
                    Failed to load stall menu &amp; inventory.
                </td>
            </tr>
        `;
    }
}

function renderVendorInventoryTable() {
    const tbody = document.querySelector("#vendorMenuTableBody");
    if (!tbody) return;

    if (vendorMenuItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-box">
                        <h4>No menu items yet</h4>
                        <p>Click "+ Add Food Item" above to add your products and track live stock counts.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = vendorMenuItems.map(it => {
        const stock = Number(it.stock_quantity || 0);
        const threshold = Number(it.low_stock_threshold || 5);
        let tagClass = "in-stock";
        let tagText = `In Stock (${stock})`;

        if (stock <= 0) {
            tagClass = "out-of-stock";
            tagText = "Out of Stock (0)";
        } else if (stock <= threshold) {
            tagClass = "low-stock";
            tagText = `⚠️ Low Stock (${stock})`;
        }

        const isAvail = it.is_available === 1 || it.is_available === true;

        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:24px;line-height:1;">${it.image_emoji || '🍲'}</span>
                        <div>
                            <strong>${it.name}</strong>
                            ${it.description ? `<div style="font-size:11px;color:#785869;margin-top:2px;">${it.description}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span style="background:#f1e2eb;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;">${it.category || 'General'}</span></td>
                <td><strong style="color:var(--primary);font-size:14px;">${formatCurrency(it.price)}</strong></td>
                <td>
                    <span class="status-tag ${tagClass}">
                        ${tagText}
                    </span>
                </td>
                <td>
                    <span style="font-size:12px;font-weight:700;color:${isAvail ? '#1a7f37' : '#888'};">
                        ${isAvail ? '● Active' : '○ Hidden'}
                    </span>
                </td>
                <td>
                    <button type="button" class="quick-stock-btn" onclick="quickVendorRestock(${it.id}, 10)" title="Add 10 units">+10</button>
                    <button type="button" class="quick-stock-btn" onclick="quickVendorRestock(${it.id}, 25)" title="Add 25 units">+25</button>
                    <button type="button" class="quick-stock-btn" onclick="promptVendorSetStock(${it.id}, ${stock})" title="Set exact count">Set</button>
                    <button type="button" class="quick-stock-btn danger" onclick="deleteVendorItem(${it.id}, '${it.name.replace(/'/g, "\\'")}')" title="Delete item">🗑</button>
                </td>
            </tr>
        `;
    }).join("");
}

function openVendorAddModal() {
    const modal = document.querySelector("#vendorAddItemModal");
    if (modal) modal.style.display = "flex";
}

function closeVendorAddModal() {
    const modal = document.querySelector("#vendorAddItemModal");
    if (modal) modal.style.display = "none";
}

async function handleVendorAddItem(event) {
    event.preventDefault();
    if (!currentVendorUser || !currentVendorUser.vendor_id) {
        alert("Session expired. Please log in again.");
        return;
    }

    const saveBtn = document.querySelector("#vSaveBtn");
    const name = document.querySelector("#vItemName").value.trim();
    const category = document.querySelector("#vItemCat").value.trim() || "General";
    const price = parseFloat(document.querySelector("#vItemPrice").value) || 0;
    const cost = parseFloat(document.querySelector("#vItemCost").value) || 0;
    const stock_quantity = parseInt(document.querySelector("#vItemStock").value) || 50;
    const low_stock_threshold = parseInt(document.querySelector("#vItemThreshold").value) || 5;
    const description = document.querySelector("#vItemDesc").value.trim();
    const image_emoji = document.querySelector("#vItemEmoji").value || "🍲";

    if (!name) {
        alert("Item name is required.");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Adding Item...";
    }

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                vendor_id: currentVendorUser.vendor_id,
                name,
                category,
                price,
                cost,
                stock_quantity,
                low_stock_threshold,
                description,
                image_emoji,
                track_inventory: true
            })
        });
        const json = await res.json();

        if (res.ok && json.success) {
            closeVendorAddModal();
            document.querySelector("#vendorAddItemForm").reset();
            await loadVendorInventory(currentVendorUser.vendor_id);
            alert(`"${name}" was successfully added to your stall's menu!`);
        } else {
            alert(json.error || "Failed to add item.");
        }
    } catch (err) {
        console.error("Add item error:", err);
        alert("Network error: Could not add item.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "➕ Add Food Item";
        }
    }
}

async function quickVendorRestock(itemId, amount) {
    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${itemId}/adjust-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adjustment: amount })
        });
        const json = await res.json();
        if (res.ok && json.success) {
            await loadVendorInventory(currentVendorUser.vendor_id);
        } else {
            alert(json.error || "Failed to adjust stock.");
        }
    } catch (err) {
        console.error("Restock error:", err);
        alert("Network error: Could not update stock.");
    }
}

async function promptVendorSetStock(itemId, currentStock) {
    const item = vendorMenuItems.find(i => i.id === itemId);
    const name = item ? item.name : "item";
    const input = prompt(`Enter new exact inventory stock count for "${name}":`, currentStock);
    if (input === null) return;

    const newStock = parseInt(input.trim());
    if (isNaN(newStock) || newStock < 0) {
        alert("Please enter a valid non-negative number.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${itemId}/adjust-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_stock: newStock })
        });
        const json = await res.json();
        if (res.ok && json.success) {
            await loadVendorInventory(currentVendorUser.vendor_id);
        } else {
            alert(json.error || "Failed to set stock.");
        }
    } catch (err) {
        console.error("Set stock error:", err);
        alert("Network error: Could not set stock.");
    }
}

async function deleteVendorItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to remove "${itemName}" from your menu?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${itemId}`, {
            method: "DELETE"
        });
        const json = await res.json();
        if (res.ok && json.success) {
            await loadVendorInventory(currentVendorUser.vendor_id);
        } else {
            alert(json.error || "Failed to remove item.");
        }
    } catch (err) {
        console.error("Delete item error:", err);
        alert("Network error: Could not delete item.");
    }
}

function logout() {
    localStorage.removeItem("foodcart_token");
    localStorage.removeItem("foodcart_user");
    window.location.href = "/login/";
}

window.openReceiptModal = openReceiptModal;
window.closeReceiptModal = closeReceiptModal;
window.triggerPrintReceipt = triggerPrintReceipt;
window.openVendorAddModal = openVendorAddModal;
window.closeVendorAddModal = closeVendorAddModal;
window.handleVendorAddItem = handleVendorAddItem;
window.quickVendorRestock = quickVendorRestock;
window.promptVendorSetStock = promptVendorSetStock;
window.deleteVendorItem = deleteVendorItem;
window.logout = logout;
