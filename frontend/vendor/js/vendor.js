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

function logout() {
    localStorage.removeItem("foodcart_token");
    localStorage.removeItem("foodcart_user");
    window.location.href = "/login/";
}

window.openReceiptModal = openReceiptModal;
window.closeReceiptModal = closeReceiptModal;
window.triggerPrintReceipt = triggerPrintReceipt;
window.logout = logout;
