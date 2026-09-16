// ==========================================
// FoodCartManager Admin
// API + Navigation
// ==========================================

const API_BASE = window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";
/* ==========================================
   FOODCARTMANAGER NOTIFICATIONS
   ========================================== */

function showNotification(message, type = "success") {

    const existing =
        document.querySelector("#fcNotification");

    if (existing) {
        existing.remove();
    }


    const notification =
        document.createElement("div");

    notification.id = "fcNotification";


    const isError =
        type === "error";


    notification.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:14px;
        ">

            <div style="
                width:38px;
                height:38px;
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                background:${isError ? "#fde7ee" : "#fce5f1"};
                color:${isError ? "#d0004f" : "#c90062"};
                font-size:20px;
                font-weight:700;
                flex-shrink:0;
            ">
                ${isError ? "!" : "OK"}
            </div>


            <div>

                <div style="
                    font-size:14px;
                    font-weight:700;
                    color:#321525;
                    margin-bottom:3px;
                ">
                    ${isError ? "Something went wrong" : "Success"}
                </div>

                <div style="
                    font-size:13px;
                    color:#713f56;
                    line-height:1.4;
                ">
                    ${message}
                </div>

            </div>


            <button
                type="button"
                id="fcNotificationClose"
                style="
                    margin-left:auto;
                    border:0;
                    background:transparent;
                    color:#9b7183;
                    font-size:20px;
                    cursor:pointer;
                    padding:4px 6px;
                "
            >
                X
            </button>

        </div>

    `;


    notification.style.cssText = `
        position:fixed;
        top:24px;
        right:24px;
        width:min(390px, calc(100vw - 48px));
        background:white;
        border:1px solid #efbfd7;
        border-left:4px solid ${isError ? "#d0004f" : "#c90062"};
        border-radius:14px;
        padding:16px 18px;
        box-shadow:0 15px 45px rgba(80,20,50,.18);
        z-index:100000;
        font-family:inherit;
        animation:fcNotificationIn .25s ease;
    `;


    document.body.appendChild(notification);


    document.querySelector(
        "#fcNotificationClose"
    ).addEventListener(
        "click",
        () => notification.remove()
    );


    setTimeout(
        () => {

            if (notification) {
                notification.remove();
            }

        },
        4000
    );
}


/* ==========================================
   NOTIFICATION ANIMATION
   ========================================== */

if (!document.querySelector("#fcNotificationStyles")) {

    const style =
        document.createElement("style");

    style.id = "fcNotificationStyles";

    style.textContent = `

        @keyframes fcNotificationIn {

            from {
                opacity:0;
                transform:translateY(-12px);
            }

            to {
                opacity:1;
                transform:translateY(0);
            }

        }

    `;

    document.head.appendChild(style);
}



// ==========================================
// DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE}/api/dashboard/`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }

        const result = await response.json();

        console.log("Dashboard API:", result);

        if (!result.success) {
            throw new Error(
                result.error || "Dashboard request failed"
            );
        }

        updateDashboard(result.data);

    } catch (error) {

        console.error(
            "Dashboard API error:",
            error
        );

        showDashboardError();
    }
}


function updateDashboard(data) {

    const revenue = document.querySelector(
        "[data-dashboard='total-revenue']"
    );

    if (revenue) {
        revenue.textContent =
            formatCurrency(data.total_revenue);
    }


    const activeRentals = document.querySelector(
        "[data-dashboard='active-rentals']"
    );

    if (activeRentals) {
        activeRentals.textContent =
            data.active_rentals ?? 0;
    }


    const vendors = document.querySelector(
        "[data-dashboard='food-vendors']"
    );

    if (vendors) {
        vendors.textContent =
            data.food_vendors ?? 0;
    }


    const spaces = document.querySelector(
        "[data-dashboard='available-spaces']"
    );

    if (spaces) {
        spaces.textContent =
            data.available_spaces ?? 0;
    }
}


function formatCurrency(value) {

    const cur = (window.appSettings && window.appSettings.currency) ? window.appSettings.currency : "PHP";
    try {
        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: cur
            }
        ).format(value || 0);
    } catch (e) {
        const symbol = cur === "PHP" ? "₱" : cur + " ";
        return symbol + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}


function showDashboardError() {

    console.warn(
        "Unable to load dashboard data."
    );
}


// ==========================================
// RECENT RENTALS
// ==========================================

async function loadRecentRentals() {

    try {

        const response = await fetch(
            `${API_BASE}/api/rentals/`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }

        const result = await response.json();

        console.log("Rentals API:", result);

        const container = document.querySelector(
            "[data-recent-rentals]"
        );

        if (!container) {
            console.warn(
                "Recent rentals container not found."
            );
            return;
        }


        if (
            !result.success ||
            !result.data ||
            result.data.length === 0
        ) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        i
                    </div>

                    <h4>
                        No rentals yet
                    </h4>

                    <p>
                        Your rental transactions will appear here.
                    </p>

                    <button
                        class="primary-btn"
                        onclick="window.location.hash='rentals'"
                    >
                        Create First Rental
                    </button>

                </div>
            `;

            return;
        }


        container.innerHTML = result.data
            .map(rental => `

                <div class="rental-row">

                    <div>
                        <strong>
                            ${rental.rental_code || "Rental"}
                        </strong>

                        <small>
                            ${rental.vendor_name || "Unknown vendor"}
                        </small>
                    </div>

                    <div>
                        <span>
                            ${rental.status || "ACTIVE"}
                        </span>
                    </div>

                    <div>
                        <strong>
                            \u20B1${Number(
                                rental.rent_amount || 0
                            ).toFixed(2)}
                        </strong>
                    </div>

                </div>

            `)
            .join("");

    } catch (error) {

        console.error(
            "Rentals API error:",
            error
        );
    }
}


      // ==========================================

// ==========================================
// VENDORS
// ==========================================

async function loadVendors() {

    const tableBody = document.querySelector(
        "#vendorsTableBody"
    );

    if (!tableBody) {

        console.warn(
            "Vendors table not found."
        );

        return;
    }


    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <h4>Loading vendors...</h4>
                    <p>Please wait.</p>
                </div>
            </td>
        </tr>
    `;


    try {

        const response = await fetch(
            `${API_BASE}/api/vendors/`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }

        const result = await response.json();

        console.log(
            "Vendors API:",
            result
        );


        if (
            !result.success ||
            !result.data ||
            result.data.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">

                            <div class="empty-icon">
                                i
                            </div>

                            <h4>
                                No vendors yet
                            </h4>

                            <p>
                                Add your first food vendor.
                            </p>

                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML = result.data
            .map(vendor => `

                <tr>

                    <td>
                        <strong>
                            ${vendor.vendor_code || "-"}
                        </strong>
                    </td>

                    <td>
                        ${vendor.business_name || "-"}
                    </td>

                    <td>
                        ${vendor.contact_person || "-"}
                    </td>

                    <td>
                        ${vendor.phone || "-"}
                    </td>

                    <td>
                        <span class="status-badge">
                            ${vendor.status || "ACTIVE"}
                        </span>
                    </td>

                    <td>

                        <button
                            class="table-action"
                            type="button"
                            onclick="viewVendor(${vendor.id})"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `)
            .join("");


    } catch (error) {

        console.error(
            "Vendors API error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">

                        <h4>
                            Unable to load vendors
                        </h4>

                        <p>
                            Check that the FoodCartManager API is running.
                        </p>

                    </div>
                </td>
            </tr>
        `;
    }
}


// ==========================================
// VIEW VENDOR
// ==========================================

function viewVendor(vendorId) {

    console.log(
        "View vendor:",
        vendorId
    );

    alert(
        `Vendor ID: ${vendorId}\n\nVendor details screen will be added next.`
    );
}


// ==========================================
// PAGE NAVIGATION
// ==========================================


// ==========================================
// FOOD CARTS
// ==========================================

async function loadFoodCarts() {

    const tableBody = document.querySelector(
        "#foodCartsTableBody"
    );

    if (!tableBody) {

        console.warn(
            "Food carts table not found."
        );

        return;
    }


    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <h4>Loading food carts...</h4>
                    <p>Please wait.</p>
                </div>
            </td>
        </tr>
    `;


    try {

        const response = await fetch(
            `${API_BASE}/api/food-carts/`
        );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const result = await response.json();


        console.log(
            "Food Carts API:",
            result
        );


        if (
            !result.success ||
            !result.data ||
            result.data.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">

                        <div class="empty-state">

                            <div class="empty-icon">
                                &#9825;
                            </div>

                            <h4>
                                No food carts yet
                            </h4>

                            <p>
                                Add your first food cart.
                            </p>

                        </div>

                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML = result.data
            .map(cart => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${cart.cart_code || "-"}
                            </strong>
                        </td>

                        <td>
                            ${cart.cart_name || "-"}
                        </td>

                        <td>
                            ${cart.ownership_type || "-"}
                        </td>

                        <td>
                            ${cart.vendor_id || "-"}
                        </td>

                        <td>
                            <span class="status-badge">
                                ${cart.status || "AVAILABLE"}
                            </span>
                        </td>

                        <td>

                            <button
                                class="table-action"
                                type="button"
                                onclick="viewFoodCart(${cart.id})"
                            >
                                View
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");


    } catch (error) {

        console.error(
            "Food Carts API error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="6">

                    <div class="empty-state">

                        <h4>
                            Unable to load food carts
                        </h4>

                        <p>
                            Check that the FoodCartManager API is running.
                        </p>

                    </div>

                </td>
            </tr>
        `;

    }
}


// ==========================================
// VIEW FOOD CART
// ==========================================

async function viewFoodCart(cartId) {

    console.log(
        "View food cart:",
        cartId
    );

    try {

        const response = await fetch(
            `${API_BASE}/api/food-carts/${cartId}`
        );

        const result = await response.json();

        console.log(
            "View Food Cart API:",
            result
        );

        if (!response.ok || !result.success) {
            throw new Error(
                result.error ||
                "Unable to load food cart."
            );
        }

        const cart = result.data;

        const existingModal =
            document.querySelector(
                "#viewFoodCartModal"
            );

        if (existingModal) {
            existingModal.remove();
        }

        const modal =
            document.createElement("div");

        modal.id = "viewFoodCartModal";

        modal.innerHTML = `

            <div style="
                position:fixed;
                inset:0;
                background:rgba(40,10,25,.45);
                display:flex;
                align-items:center;
                justify-content:center;
                z-index:9999;
                padding:20px;
            ">

                <div style="
                    width:100%;
                    max-width:600px;
                    max-height:90vh;
                    overflow-y:auto;
                    background:#fff;
                    border-radius:20px;
                    box-shadow:0 25px 80px rgba(0,0,0,.25);
                    padding:30px;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        margin-bottom:28px;
                    ">

                        <div>

                            <div style="
                                font-size:13px;
                                font-weight:700;
                                color:#c90062;
                                letter-spacing:1px;
                                margin-bottom:6px;
                            ">
                                FOOD CART DETAILS
                            </div>

                            <h2 style="
                                margin:0;
                                font-size:26px;
                                color:#321525;
                            ">
                                ${cart.cart_name || "-"}
                            </h2>

                            <p style="
                                margin:6px 0 0;
                                color:#8b6678;
                            ">
                                ${cart.cart_code || "-"}
                            </p>

                        </div>

                        <button
                            type="button"
                            id="closeViewFoodCartModal"
                            style="
                                width:38px;
                                height:38px;
                                border:1px solid #f1c7dc;
                                background:white;
                                color:#c90062;
                                border-radius:10px;
                                cursor:pointer;
                                font-size:20px;
                            "
                        >
                            X
                        </button>

                    </div>


                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        background:#fff5fa;
                        border:1px solid #f4d3e3;
                        border-radius:14px;
                        padding:16px 18px;
                        margin-bottom:20px;
                    ">

                        <strong style="color:#321525;">
                            Status
                        </strong>

                        <span style="
                            display:inline-block;
                            padding:7px 13px;
                            border-radius:999px;
                            background:#fff0f7;
                            color:#c90062;
                            font-size:12px;
                            font-weight:700;
                        ">
                            ${cart.status || "AVAILABLE"}
                        </span>

                    </div>


                    <div style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:16px;
                        margin-bottom:22px;
                    ">

                        <div style="
                            border:1px solid #f1d5e2;
                            border-radius:14px;
                            padding:16px;
                        ">
                            <div style="
                                font-size:12px;
                                color:#9b7183;
                                margin-bottom:7px;
                            ">
                                Cart Code
                            </div>

                            <strong style="color:#321525;">
                                ${cart.cart_code || "-"}
                            </strong>
                        </div>


                        <div style="
                            border:1px solid #f1d5e2;
                            border-radius:14px;
                            padding:16px;
                        ">
                            <div style="
                                font-size:12px;
                                color:#9b7183;
                                margin-bottom:7px;
                            ">
                                Ownership
                            </div>

                            <strong style="color:#321525;">
                                ${cart.ownership_type || "-"}
                            </strong>
                        </div>


                        <div style="
                            border:1px solid #f1d5e2;
                            border-radius:14px;
                            padding:16px;
                        ">
                            <div style="
                                font-size:12px;
                                color:#9b7183;
                                margin-bottom:7px;
                            ">
                                Vendor
                            </div>

                            <strong style="color:#321525;">
                                ${cart.vendor_name || cart.vendor_id || "-"}
                            </strong>
                        </div>


                        <div style="
                            border:1px solid #f1d5e2;
                            border-radius:14px;
                            padding:16px;
                        ">
                            <div style="
                                font-size:12px;
                                color:#9b7183;
                                margin-bottom:7px;
                            ">
                                Record ID
                            </div>

                            <strong style="color:#321525;">
                                ${cart.id || "-"}
                            </strong>
                        </div>

                    </div>


                    <div style="
                        border:1px solid #f1d5e2;
                        border-radius:14px;
                        padding:18px;
                        margin-bottom:16px;
                    ">

                        <div style="
                            font-size:12px;
                            color:#9b7183;
                            margin-bottom:8px;
                            font-weight:600;
                        ">
                            Description
                        </div>

                        <div style="
                            color:#321525;
                            line-height:1.6;
                            white-space:pre-wrap;
                        ">
                            ${cart.description || "No description provided."}
                        </div>

                    </div>


                    <div style="
                        border:1px solid #f1d5e2;
                        border-radius:14px;
                        padding:18px;
                        margin-bottom:22px;
                    ">

                        <div style="
                            font-size:12px;
                            color:#9b7183;
                            margin-bottom:8px;
                            font-weight:600;
                        ">
                            Notes
                        </div>

                        <div style="
                            color:#321525;
                            line-height:1.6;
                            white-space:pre-wrap;
                        ">
                            ${cart.notes || "No notes provided."}
                        </div>

                    </div>


                    <div style="
                        font-size:12px;
                        color:#9b7183;
                        line-height:1.8;
                        margin-bottom:24px;
                    ">

                        <div>
                            Created:
                            ${cart.created_at || "-"}
                        </div>

                        <div>
                            Updated:
                            ${cart.updated_at || "-"}
                        </div>

                    </div>


                    <div style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                    ">

                        <button
                            type="button"
                            id="editFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:0;
                                background:#c90062;
                                color:white;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Edit Food Cart
                        </button>

                        <button
                            type="button"
                            id="deleteFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:1px solid #e0005a;
                                background:white;
                                color:#e0005a;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Delete Food Cart
                        </button>

                        <button
                            type="button"
                            id="closeViewFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:1px solid #efbfd7;
                                background:white;
                                color:#713f56;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Close
                        </button>

                    </div>

                </div>

            </div>

        `;

        document.body.appendChild(modal);


        // --------------------------------------
        // EDIT FOOD CART
        // --------------------------------------

        document.querySelector(
            "#editFoodCartBtn"
        ).addEventListener(
            "click",
            () => {
                closeViewFoodCartModal();
                openEditFoodCartModal(cart);
            }
        );


        // --------------------------------------
        // DELETE FOOD CART
        // --------------------------------------

        document.querySelector(
            "#deleteFoodCartBtn"
        ).addEventListener(
            "click",
            () => {
                deleteFoodCart(cart.id, cart.cart_name);
            }
        );


        document.querySelector(
            "#closeViewFoodCartModal"
        ).addEventListener(
            "click",
            closeViewFoodCartModal
        );


        document.querySelector(
            "#closeViewFoodCartBtn"
        ).addEventListener(
            "click",
            closeViewFoodCartModal
        );


    } catch (error) {

        console.error(
            "View Food Cart error:",
            error
        );

        alert(
            error.message ||
            "Unable to load food cart."
        );

    }

}



// ==========================================
// DELETE FOOD CART
// ==========================================

async function deleteFoodCart(cartId, cartName) {

    // Remove any existing confirmation modal

    const existingModal =
        document.querySelector(
            "#deleteFoodCartModal"
        );

    if (existingModal) {
        existingModal.remove();
    }


    // --------------------------------------
    // CREATE CONFIRMATION MODAL
    // --------------------------------------

    const modal =
        document.createElement("div");

    modal.id = "deleteFoodCartModal";


    modal.innerHTML = `

        <div style="
            position:fixed;
            inset:0;
            background:rgba(40,10,25,.48);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:100001;
            padding:20px;
        ">

            <div style="
                width:100%;
                max-width:460px;
                background:white;
                border-radius:20px;
                box-shadow:0 25px 80px rgba(0,0,0,.25);
                padding:28px;
            ">

                <!-- ICON -->

                <div style="
                    width:58px;
                    height:58px;
                    border-radius:50%;
                    background:#fde7ee;
                    color:#d0004f;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:28px;
                    font-weight:800;
                    margin-bottom:18px;
                ">
                    !
                </div>


                <!-- TITLE -->

                <h2 style="
                    margin:0 0 8px;
                    color:#321525;
                    font-size:23px;
                ">
                    Delete Food Cart?
                </h2>


                <!-- MESSAGE -->

                <p style="
                    margin:0 0 8px;
                    color:#713f56;
                    font-size:14px;
                    line-height:1.6;
                ">
                    Are you sure you want to delete this food cart?
                </p>


                <!-- CART NAME -->

                <div style="
                    background:#fff5f9;
                    border:1px solid #efbfd7;
                    border-radius:12px;
                    padding:14px 16px;
                    margin:18px 0;
                ">

                    <div style="
                        font-size:11px;
                        text-transform:uppercase;
                        letter-spacing:.6px;
                        color:#9b7183;
                        margin-bottom:5px;
                        font-weight:700;
                    ">
                        Food Cart
                    </div>

                    <div style="
                        font-size:16px;
                        color:#321525;
                        font-weight:700;
                    ">
                        ${cartName || "Unnamed Food Cart"}
                    </div>

                </div>


                <!-- WARNING -->

                <p style="
                    margin:0 0 24px;
                    color:#9b7183;
                    font-size:12px;
                    line-height:1.5;
                ">
                    This action cannot be undone.
                </p>


                <!-- BUTTONS -->

                <div style="
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                ">

                    <button
                        type="button"
                        id="cancelDeleteFoodCartBtn"
                        style="
                            padding:12px 20px;
                            border:1px solid #efbfd7;
                            background:white;
                            color:#713f56;
                            border-radius:10px;
                            cursor:pointer;
                            font-weight:600;
                        "
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        id="confirmDeleteFoodCartBtn"
                        style="
                            padding:12px 20px;
                            border:0;
                            background:#d0004f;
                            color:white;
                            border-radius:10px;
                            cursor:pointer;
                            font-weight:600;
                        "
                    >
                        Delete Food Cart
                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    // --------------------------------------
    // CANCEL
    // --------------------------------------

    document.querySelector(
        "#cancelDeleteFoodCartBtn"
    ).addEventListener(
        "click",
        () => {
            modal.remove();
        }
    );


    // --------------------------------------
    // CONFIRM DELETE
    // --------------------------------------

    document.querySelector(
        "#confirmDeleteFoodCartBtn"
    ).addEventListener(
        "click",
        async () => {

            const deleteButton =
                document.querySelector(
                    "#confirmDeleteFoodCartBtn"
                );


            try {

                deleteButton.disabled = true;

                deleteButton.textContent =
                    "Deleting...";


                const response = await fetch(
                    `${API_BASE}/api/food-carts/${cartId}`,
                    {
                        method: "DELETE"
                    }
                );


                const result =
                    await response.json();


                console.log(
                    "Delete Food Cart API:",
                    result
                );


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.error ||
                        "Unable to delete food cart."
                    );

                }


                // Close confirmation modal

                modal.remove();


                // Close view modal if still open

                closeViewFoodCartModal();


                // Refresh food cart table

                await loadFoodCarts();


                // Show success notification

                showNotification(
                    "Food cart deleted successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Delete Food Cart error:",
                    error
                );


                deleteButton.disabled = false;

                deleteButton.textContent =
                    "Delete Food Cart";


                showNotification(
                    error.message ||
                    "Unable to delete food cart.",
                    "error"
                );

            }

        }
    );

}
// ==========================================
function closeViewFoodCartModal() {

    const modal =
        document.querySelector(
            "#viewFoodCartModal"
        );

    if (modal) {
        modal.remove();
    }

}




// ==========================================
// EDIT FOOD CART
// ==========================================

async function openEditFoodCartModal(cart) {

    const existingModal =
        document.querySelector("#editFoodCartModal");

    if (existingModal) {
        existingModal.remove();
    }


    const modal =
        document.createElement("div");

    modal.id = "editFoodCartModal";


    modal.innerHTML = `

        <div style="
            position:fixed;
            inset:0;
            background:rgba(40,10,25,.45);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:9999;
            padding:20px;
        ">

            <div style="
                width:100%;
                max-width:560px;
                max-height:90vh;
                overflow-y:auto;
                background:#fff;
                border-radius:20px;
                box-shadow:0 25px 80px rgba(0,0,0,.25);
                padding:28px;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:24px;
                ">

                    <div>

                        <div style="
                            font-size:13px;
                            font-weight:700;
                            color:#c90062;
                            letter-spacing:1px;
                            margin-bottom:6px;
                        ">
                            EDIT FOOD CART
                        </div>

                        <h2 style="
                            margin:0;
                            font-size:24px;
                            color:#321525;
                        ">
                            Edit Food Cart
                        </h2>

                        <p style="
                            margin:6px 0 0;
                            color:#8b6678;
                        ">
                            Update food cart information
                        </p>

                    </div>


                    <button
                        type="button"
                        id="closeEditFoodCartModal"
                        style="
                            width:38px;
                            height:38px;
                            border:1px solid #f1c7dc;
                            background:white;
                            color:#c90062;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:20px;
                        "
                    >
                        X
                    </button>

                </div>


                <form id="editFoodCartForm">

                    <div style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:16px;
                    ">

                        <div>

                            <label style="
                                display:block;
                                margin-bottom:7px;
                                font-size:13px;
                                font-weight:600;
                                color:#713f56;
                            ">
                                Cart Code
                            </label>

                            <input
                                type="text"
                                id="editCartCode"
                                value="${cart.cart_code || ""}"
                                required
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #e8bfd3;
                                    border-radius:10px;
                                    outline:none;
                                "
                            >

                        </div>


                        <div>

                            <label style="
                                display:block;
                                margin-bottom:7px;
                                font-size:13px;
                                font-weight:600;
                                color:#713f56;
                            ">
                                Cart Name
                            </label>

                            <input
                                type="text"
                                id="editCartName"
                                value="${cart.cart_name || ""}"
                                required
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #e8bfd3;
                                    border-radius:10px;
                                    outline:none;
                                "
                            >

                        </div>


                        <div>

                            <label style="
                                display:block;
                                margin-bottom:7px;
                                font-size:13px;
                                font-weight:600;
                                color:#713f56;
                            ">
                                Ownership
                            </label>

                            <select
                                id="editOwnershipType"
                                style="
                                    width:100%;
                                    padding:12px;
                                    border:1px solid #e8bfd3;
                                    border-radius:10px;
                                    background:white;
                                "
                            >

                                <option
                                    value="BUSINESS"
                                    ${cart.ownership_type === "BUSINESS" ? "selected" : ""}
                                >
                                    Business
                                </option>

                                <option
                                    value="VENDOR"
                                    ${cart.ownership_type === "VENDOR" ? "selected" : ""}
                                >
                                    Vendor
                                </option>

                                <option
                                    value="PERSONAL"
                                    ${cart.ownership_type === "PERSONAL" ? "selected" : ""}
                                >
                                    Personal
                                </option>

                            </select>

                        </div>


                        <div>

                            <label style="
                                display:block;
                                margin-bottom:7px;
                                font-size:13px;
                                font-weight:600;
                                color:#713f56;
                            ">
                                Status
                            </label>

                            <select
                                id="editCartStatus"
                                style="
                                    width:100%;
                                    padding:12px;
                                    border:1px solid #e8bfd3;
                                    border-radius:10px;
                                    background:white;
                                "
                            >

                                <option
                                    value="AVAILABLE"
                                    ${cart.status === "AVAILABLE" ? "selected" : ""}
                                >
                                    Available
                                </option>

                                <option
                                    value="RENTED"
                                    ${cart.status === "RENTED" ? "selected" : ""}
                                >
                                    Rented
                                </option>

                                <option
                                    value="MAINTENANCE"
                                    ${cart.status === "MAINTENANCE" ? "selected" : ""}
                                >
                                    Maintenance
                                </option>

                                <option
                                    value="INACTIVE"
                                    ${cart.status === "INACTIVE" ? "selected" : ""}
                                >
                                    Inactive
                                </option>

                            </select>

                        </div>

                    </div>


                    <div style="margin-top:16px;">

                        <label style="
                            display:block;
                            margin-bottom:7px;
                            font-size:13px;
                            font-weight:600;
                            color:#713f56;
                        ">
                            Vendor
                        </label>

                        <select
                            id="editVendorId"
                            style="
                                width:100%;
                                padding:12px;
                                border:1px solid #e8bfd3;
                                border-radius:10px;
                                background:white;
                            "
                        >

                            <option value="">
                                Loading vendors...
                            </option>

                        </select>

                    </div>


                    <div style="margin-top:16px;">

                        <label style="
                            display:block;
                            margin-bottom:7px;
                            font-size:13px;
                            font-weight:600;
                            color:#713f56;
                        ">
                            Description
                        </label>

                        <textarea
                            id="editCartDescription"
                            rows="3"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px;
                                border:1px solid #e8bfd3;
                                border-radius:10px;
                                resize:vertical;
                            "
                        >${cart.description || ""}</textarea>

                    </div>


                    <div style="margin-top:16px;">

                        <label style="
                            display:block;
                            margin-bottom:7px;
                            font-size:13px;
                            font-weight:600;
                            color:#713f56;
                        ">
                            Notes
                        </label>

                        <textarea
                            id="editCartNotes"
                            rows="3"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px;
                                border:1px solid #e8bfd3;
                                border-radius:10px;
                                resize:vertical;
                            "
                        >${cart.notes || ""}</textarea>

                    </div>


                    <div style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        margin-top:24px;
                    ">

                        <button
                            type="button"
                            id="cancelEditFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:1px solid #efbfd7;
                                background:white;
                                color:#713f56;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            id="updateFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:0;
                                background:#c90062;
                                color:white;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Save Changes
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    // --------------------------------------
    // CLOSE BUTTONS
    // --------------------------------------

    document.querySelector(
        "#closeEditFoodCartModal"
    ).addEventListener(
        "click",
        closeEditFoodCartModal
    );


    document.querySelector(
        "#cancelEditFoodCartBtn"
    ).addEventListener(
        "click",
        closeEditFoodCartModal
    );


    // --------------------------------------
    // LOAD VENDORS
    // --------------------------------------

    await loadEditFoodCartVendors(
        cart.vendor_id
    );


    // --------------------------------------
    // FORM SUBMIT
    // --------------------------------------

    document.querySelector(
        "#editFoodCartForm"
    ).addEventListener(
        "submit",
        event => updateFoodCart(event, cart.id)
    );

}


// ==========================================
// LOAD VENDORS FOR EDIT FORM
// ==========================================

async function loadEditFoodCartVendors(selectedVendorId) {

    const select =
        document.querySelector("#editVendorId");

    if (!select) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/vendors/`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (!result.success) {
            throw new Error(
                result.error ||
                "Unable to load vendors."
            );
        }


        select.innerHTML = `
            <option value="">
                No Vendor
            </option>
        `;


        result.data.forEach(vendor => {

            const option =
                document.createElement("option");

            option.value = vendor.id;

            option.textContent =
                `${vendor.vendor_code || ""} - ${vendor.business_name || ""}`;

            if (
                String(vendor.id) ===
                String(selectedVendorId)
            ) {
                option.selected = true;
            }

            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Edit Food Cart vendors error:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load vendors
            </option>
        `;

    }

}


// ==========================================
// UPDATE FOOD CART
// ==========================================

async function updateFoodCart(event, cartId) {

    event.preventDefault();


    const button =
        document.querySelector(
            "#updateFoodCartBtn"
        );


    const data = {

        cart_code:
            document.querySelector(
                "#editCartCode"
            ).value.trim(),

        cart_name:
            document.querySelector(
                "#editCartName"
            ).value.trim(),

        ownership_type:
            document.querySelector(
                "#editOwnershipType"
            ).value,

        vendor_id:
            document.querySelector(
                "#editVendorId"
            ).value || null,

        description:
            document.querySelector(
                "#editCartDescription"
            ).value.trim() || null,

        status:
            document.querySelector(
                "#editCartStatus"
            ).value,

        notes:
            document.querySelector(
                "#editCartNotes"
            ).value.trim() || null

    };


    if (!data.cart_code || !data.cart_name) {

        showNotification(
            "Cart Code and Cart Name are required.",
            "error"
        );

        return;
    }


    try {

        button.disabled = true;

        button.textContent =
            "Saving...";


        const response = await fetch(
            `${API_BASE}/api/food-carts/${cartId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(data)
            }
        );


        const result =
            await response.json();


        console.log(
            "Update Food Cart API:",
            result
        );


        if (!response.ok || !result.success) {

            throw new Error(
                result.error ||
                "Unable to update food cart."
            );

        }


        closeEditFoodCartModal();


        showNotification(
            "Food cart updated successfully.",
            "success"
        );


        loadFoodCarts();


    } catch (error) {

        console.error(
            "Update Food Cart error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to update food cart.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Save Changes";

        }

    }

}


// ==========================================
// CLOSE EDIT FOOD CART MODAL
// ==========================================

function closeEditFoodCartModal() {

    const modal =
        document.querySelector(
            "#editFoodCartModal"
        );

    if (modal) {
        modal.remove();
    }

}


// ==========================================
// RENTALS
// ==========================================

async function loadRentals() {

    const tableBody =
        document.querySelector(
            "#rentalsTableBody"
        );

    if (!tableBody) {
        console.warn(
            "Rentals table body not found."
        );
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-state">
                    <h4>Loading rentals...</h4>
                    <p>Please wait.</p>
                </div>
            </td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${API_BASE}/api/rentals/`
        );

        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }

        const result =
            await response.json();

        console.log(
            "Rentals API:",
            result
        );

        if (
            !result.success ||
            !result.data ||
            result.data.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">

                        <div class="empty-state">

                            <div class="empty-icon">
                                i
                            </div>

                            <h4>
                                No rentals yet
                            </h4>

                            <p>
                                Create your first rental transaction.
                            </p>

                            <button
                                class="primary-btn"
                                type="button"
                                onclick="window.openNewRentalModal && window.openNewRentalModal()"
                            >
                                + New Rental
                            </button>

                        </div>

                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML =
            result.data.map(rental => `

                <tr>

                    <td>
                        <strong>
                            ${rental.rental_code ?? "-"}
                        </strong>
                    </td>

                    <td>
                        ${rental.vendor_name ?? "-"}
                    </td>

                    <td>
                        ${rental.start_date ?? "-"}
                    </td>

                    <td>
                        ${rental.end_date ?? "-"}
                    </td>

                    <td>
                        ${rental.billing_cycle ?? "-"}
                    </td>

                    <td>
                        \u20B1${Number(
                            rental.rent_amount ?? 0
                        ).toLocaleString(
                            "en-PH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}
                    </td>

                    <td>

                        <span class="status-badge">
                            ${rental.status ?? "-"}
                        </span>

                    </td>

                    <td>

                        <button
                            class="secondary-btn"
                            type="button"
                            onclick="viewRental(${rental.id})"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `).join("");

    }
    catch (error) {

        console.error(
            "Rentals API error:",
            error
        );

        tableBody.innerHTML = `
            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        <h4>
                            Unable to load rentals
                        </h4>

                        <p>
                            ${error.message}
                        </p>

                    </div>

                </td>

            </tr>
        `;

    }

}


// ==========================================
// VIEW RENTAL
// ==========================================

async function viewRental(id) {

    console.log("View rental:", id);

    try {

        const response = await fetch(
            `${API_BASE}/api/rentals/${id}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {

            throw new Error(
                result.error || `HTTP ${response.status}`
            );

        }

        const rental = result.data;

        let modal =
            document.getElementById(
                "rentalDetailsModal"
            );


        if (!modal) {

            modal =
                document.createElement("div");

            modal.id =
                "rentalDetailsModal";

            modal.className =
                "modal-overlay";

            modal.innerHTML = `
                <div class="modal-card">

                    <div class="modal-header">

                        <div>

                            <h3>
                                Rental Details
                            </h3>

                            <p>
                                ${rental.rental_code ?? "-"}
                            </p>

                        </div>

                        <button
                            type="button"
                            class="modal-close"
                            onclick="closeRentalDetailsModal()"
                        >
                            X
                        </button>

                    </div>


                    <div class="form-grid">

                        <div class="form-group">

                            <label>
                                Rental Code
                            </label>

                            <div>
                                ${rental.rental_code ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Status
                            </label>

                            <div>
                                ${rental.status ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Vendor
                            </label>

                            <div>
                                ${rental.vendor_name ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Food Cart
                            </label>

                            <div>
                                ${
                                    rental.cart_name ??
                                    rental.cart_code ??
                                    "-"
                                }
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Start Date
                            </label>

                            <div>
                                ${rental.start_date ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                End Date
                            </label>

                            <div>
                                ${rental.end_date ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Billing Cycle
                            </label>

                            <div>
                                ${rental.billing_cycle ?? "-"}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Rent Amount
                            </label>

                            <div>
                                \u20B1${Number(
                                    rental.rent_amount ?? 0
                                ).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </div>

                        </div>


                        <div class="form-group">

                            <label>
                                Security Deposit
                            </label>

                            <div>
                                \u20B1${Number(
                                    rental.security_deposit ?? 0
                                ).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </div>

                        </div>


                        <div class="form-group form-full">

                            <label>
                                Notes
                            </label>

                            <div>
                                ${rental.notes ?? "-"}
                            </div>

                        </div>

                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-btn"
                            onclick="closeRentalDetailsModal()"
                        >
                            Close
                        </button>


                        <button
                            type="button"
                            class="primary-btn"
                            onclick="openEditRentalModal(${rental.id})"
                        >
                            Edit Rental
                        </button>

                    </div>

                </div>
            `;


            document.body.appendChild(
                modal
            );


            modal.addEventListener(
                "click",
                function(event) {

                    if (
                        event.target === modal
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                    }

                }
            );

        }
        else {

            /*
             * Refresh the existing modal
             * with the latest rental data.
             */

            const card =
                modal.querySelector(
                    ".modal-card"
                );

            if (card) {

                card.innerHTML = `

                    <div class="modal-header">

                        <div>

                            <h3>
                                Rental Details
                            </h3>

                            <p>
                                ${rental.rental_code ?? "-"}
                            </p>

                        </div>

                        <button
                            type="button"
                            class="modal-close"
                            onclick="closeRentalDetailsModal()"
                        >
                            X
                        </button>

                    </div>


                    <div class="form-grid">

                        <div class="form-group">
                            <label>Rental Code</label>
                            <div>
                                ${rental.rental_code ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Status</label>
                            <div>
                                ${rental.status ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Vendor</label>
                            <div>
                                ${rental.vendor_name ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Food Cart</label>
                            <div>
                                ${
                                    rental.cart_name ??
                                    rental.cart_code ??
                                    "-"
                                }
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Start Date</label>
                            <div>
                                ${rental.start_date ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>End Date</label>
                            <div>
                                ${rental.end_date ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Billing Cycle</label>
                            <div>
                                ${rental.billing_cycle ?? "-"}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Rent Amount</label>
                            <div>
                                \u20B1${Number(
                                    rental.rent_amount ?? 0
                                ).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </div>
                        </div>


                        <div class="form-group">
                            <label>Security Deposit</label>
                            <div>
                                \u20B1${Number(
                                    rental.security_deposit ?? 0
                                ).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </div>
                        </div>


                        <div class="form-group form-full">
                            <label>Notes</label>
                            <div>
                                ${rental.notes ?? "-"}
                            </div>
                        </div>

                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-btn"
                            onclick="closeRentalDetailsModal()"
                        >
                            Close
                        </button>


                        <button
                            type="button"
                            class="primary-btn"
                            onclick="openEditRentalModal(${rental.id})"
                        >
                            Edit Rental
                        </button>

                    </div>
                `;

            }

        }


        modal.style.display =
            "flex";


    }
    catch (error) {

        console.error(
            "View rental error:",
            error
        );

        alert(
            error.message ||
            "Unable to load rental details."
        );

    }

}


async function openEditRentalModal(id) {

    console.log("Open edit rental:", id);

    try {

        const response =
            await fetch(
                `${API_BASE}/api/rentals/${id}`
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }

        const rental =
            result.data;


        let modal =
            document.getElementById(
                "rentalEditModal"
            );


        if (!modal) {

            modal =
                document.createElement(
                    "div"
                );

            modal.id =
                "rentalEditModal";

            modal.className =
                "modal-overlay";


            modal.innerHTML = `

                <div class="modal-card">

                    <div class="modal-header">

                        <div>

                            <h3>
                                Edit Rental
                            </h3>

                            <p>
                                ${rental.rental_code ?? "-"}
                            </p>

                        </div>


                        <button
                            type="button"
                            class="modal-close"
                            onclick="closeRentalEditModal()"
                        >
                            X
                        </button>

                    </div>


                    <form id="rentalEditForm">

                        <div class="form-grid">


                            <div class="form-group">

                                <label>
                                    Vendor
                                    <span>*</span>
                                </label>

                                <select
                                    id="editRentalVendor"
                                    required
                                >
                                    <option value="">
                                        Loading vendors...
                                    </option>
                                </select>

                            </div>


                            <div class="form-group">

                                <label>
                                    Food Cart
                                </label>

                                <select
                                    id="editRentalCart"
                                >
                                    <option value="">
                                        Loading food carts...
                                    </option>
                                </select>

                            </div>


                            <div class="form-group">

                                <label>
                                    Start Date
                                    <span>*</span>
                                </label>

                                <input
                                    type="date"
                                    id="editRentalStartDate"
                                    required
                                >

                            </div>


                            <div class="form-group">

                                <label>
                                    End Date
                                </label>

                                <input
                                    type="date"
                                    id="editRentalEndDate"
                                >

                            </div>


                            <div class="form-group">

                                <label>
                                    Billing Cycle
                                </label>

                                <select
                                    id="editRentalBilling"
                                >

                                    <option value="DAILY">
                                        Daily
                                    </option>

                                    <option value="WEEKLY">
                                        Weekly
                                    </option>

                                    <option value="MONTHLY">
                                        Monthly
                                    </option>

                                    <option value="YEARLY">
                                        Yearly
                                    </option>

                                </select>

                            </div>


                            <div class="form-group">

                                <label>
                                    Rent Amount
                                </label>

                                <input
                                    type="number"
                                    id="editRentalAmount"
                                    min="0"
                                    step="0.01"
                                >

                            </div>


                            <div class="form-group">

                                <label>
                                    Security Deposit
                                </label>

                                <input
                                    type="number"
                                    id="editRentalDeposit"
                                    min="0"
                                    step="0.01"
                                >

                            </div>


                            <div class="form-group">

                                <label>
                                    Status
                                </label>

                                <select
                                    id="editRentalStatus"
                                >

                                    <option value="ACTIVE">
                                        Active
                                    </option>

                                    <option value="COMPLETED">
                                        Completed
                                    </option>

                                    <option value="CANCELLED">
                                        Cancelled
                                    </option>

                                </select>

                            </div>


                            <div class="form-group form-full">

                                <label>
                                    Notes
                                </label>

                                <textarea
                                    id="editRentalNotes"
                                    rows="4"
                                ></textarea>

                            </div>


                        </div>


                        <div
                            id="rentalEditFormMessage"
                            class="form-message"
                            style="display:none;"
                        ></div>


                        <div class="modal-footer">

                            <button
                                type="button"
                                class="secondary-btn"
                                onclick="closeRentalEditModal()"
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                class="primary-btn"
                            >
                                Save Changes
                            </button>

                        </div>

                    </form>

                </div>

            `;


            document.body.appendChild(
                modal
            );


            modal.addEventListener(
                "click",
                function(event) {

                    if (
                        event.target === modal
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                    }

                }
            );


            const form =
                document.getElementById(
                    "rentalEditForm"
                );


            if (form) {

                form.addEventListener(
                    "submit",
                    function(event) {

                        submitRentalEditForm(
                            event,
                            id
                        );

                    }
                );

            }

        }


        await loadEditRentalVendors(
            rental.vendor_id
        );


        await loadEditRentalFoodCarts(
            rental.cart_id
        );


        document.getElementById(
            "editRentalStartDate"
        ).value =
            formatDateForInput(
                rental.start_date
            );


        document.getElementById(
            "editRentalEndDate"
        ).value =
            formatDateForInput(
                rental.end_date
            );


        document.getElementById(
            "editRentalBilling"
        ).value =
            rental.billing_cycle ||
            "MONTHLY";


        document.getElementById(
            "editRentalAmount"
        ).value =
            rental.rent_amount || 0;


        document.getElementById(
            "editRentalDeposit"
        ).value =
            rental.security_deposit || 0;


        document.getElementById(
            "editRentalStatus"
        ).value =
            rental.status || "ACTIVE";


        document.getElementById(
            "editRentalNotes"
        ).value =
            rental.notes || "";


        const message =
            document.getElementById(
                "rentalEditFormMessage"
            );

        if (message) {

            message.style.display =
                "none";

            message.textContent =
                "";

        }


        const detailsModal =
            document.getElementById(
                "rentalDetailsModal"
            );

        if (detailsModal) {

            detailsModal.style.display =
                "none";

        }


        modal.dataset.rentalId =
            String(id);

        modal.style.display =
            "flex";


    }
    catch (error) {

        console.error(
            "Open edit rental error:",
            error
        );

        alert(
            error.message ||
            "Unable to load rental for editing."
        );

    }

}


async function loadEditRentalVendors(
    selectedId
) {

    const select =
        document.getElementById(
            "editRentalVendor"
        );

    if (!select) return;


    select.innerHTML = `
        <option value="">
            Loading vendors...
        </option>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE}/api/vendors/`
            );

        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        const vendors =
            result.data || [];


        select.innerHTML = `
            <option value="">
                Select vendor
            </option>
        `;


        vendors.forEach(
            vendor => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    vendor.id;

                option.textContent =
                    vendor.business_name ||
                    vendor.name ||
                    `Vendor #${vendor.id}`;

                select.appendChild(
                    option
                );

            }
        );


        if (selectedId != null) {

            select.value =
                String(selectedId);

        }

    }
    catch (error) {

        console.error(
            "Edit vendor loading error:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load vendors
            </option>
        `;

    }

}


async function loadEditRentalFoodCarts(
    selectedId
) {

    const select =
        document.getElementById(
            "editRentalCart"
        );

    if (!select) return;


    select.innerHTML = `
        <option value="">
            Loading food carts...
        </option>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE}/api/food-carts/`
            );

        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        const carts =
            result.data || [];


        select.innerHTML = `
            <option value="">
                Select food cart
            </option>
        `;


        carts.forEach(
            cart => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    cart.id;

                option.textContent =
                    cart.cart_name ||
                    cart.name ||
                    cart.cart_code ||
                    `Cart #${cart.id}`;

                select.appendChild(
                    option
                );

            }
        );


        if (selectedId != null) {

            select.value =
                String(selectedId);

        }

    }
    catch (error) {

        console.error(
            "Edit food cart loading error:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load food carts
            </option>
        `;

    }

}


function formatDateForInput(
    value
) {

    if (!value) {
        return "";
    }


    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (match) {

        return match[0];

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getDate()
        ).padStart(2, "0")
    ].join("-");

}


async function submitRentalEditForm(
    event,
    id
) {

    event.preventDefault();


    const message =
        document.getElementById(
            "rentalEditFormMessage"
        );


    const vendorId =
        document.getElementById(
            "editRentalVendor"
        ).value;


    const cartId =
        document.getElementById(
            "editRentalCart"
        ).value;


    const startDate =
        document.getElementById(
            "editRentalStartDate"
        ).value;


    const endDate =
        document.getElementById(
            "editRentalEndDate"
        ).value;


    const billingCycle =
        document.getElementById(
            "editRentalBilling"
        ).value;


    const rentAmount =
        document.getElementById(
            "editRentalAmount"
        ).value;


    const securityDeposit =
        document.getElementById(
            "editRentalDeposit"
        ).value;


    const status =
        document.getElementById(
            "editRentalStatus"
        ).value;


    const notes =
        document.getElementById(
            "editRentalNotes"
        ).value;


    if (!vendorId) {

        showRentalEditMessage(
            "Please select a vendor.",
            true
        );

        return;

    }


    if (!startDate) {

        showRentalEditMessage(
            "Please select a start date.",
            true
        );

        return;

    }


    const payload = {

        vendor_id:
            Number(vendorId),

        cart_id:
            cartId
                ? Number(cartId)
                : null,

        start_date:
            startDate,

        end_date:
            endDate || null,

        billing_cycle:
            billingCycle,

        rent_amount:
            Number(rentAmount || 0),

        security_deposit:
            Number(
                securityDeposit || 0
            ),

        status:
            status,

        notes:
            notes || null

    };


    const button =
        document.querySelector(
            "#rentalEditForm button[type='submit']"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";

    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/rentals/${id}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        showRentalEditMessage(
            "Rental updated successfully.",
            false
        );


        setTimeout(
            async () => {

                closeRentalEditModal();

                await loadRentals();

                await viewRental(id);

            },
            700
        );


    }
    catch (error) {

        console.error(
            "Update rental error:",
            error
        );


        showRentalEditMessage(
            error.message ||
            "Unable to update rental.",
            true
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Save Changes";

        }

    }

}


function showRentalEditMessage(
    text,
    isError
) {

    const message =
        document.getElementById(
            "rentalEditFormMessage"
        );

    if (!message) return;


    message.textContent =
        text;

    message.style.display =
        "block";

    message.className =
        isError
            ? "form-message error"
            : "form-message success";

}


function closeRentalEditModal() {

    const modal =
        document.getElementById(
            "rentalEditModal"
        );

    if (modal) {

        modal.style.display =
            "none";

    }

}


window.openEditRentalModal =
    openEditRentalModal;

window.closeRentalEditModal =
    closeRentalEditModal;

function closeRentalDetailsModal() {

    const modal = document.getElementById(
        "rentalDetailsModal"
    );

    if (modal) {
        modal.style.display = "none";
    }

}


window.viewRental = viewRental;

window.closeRentalDetailsModal =
    closeRentalDetailsModal;


async function loadPayments() {

    const tableBody =
        document.querySelector("#paymentsTableBody");

    if (!tableBody) {
        console.warn("Payments table body not found.");
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-state">
                    <h4>Loading payments...</h4>
                    <p>Please wait.</p>
                </div>
            </td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${API_BASE}/api/payments/`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        console.log("Payments API:", result);

        if (!result.success) {
            throw new Error(result.error || "Unable to load payments.");
        }

        const payments = result.data || [];

        let totalAmount = 0;
        let monthAmount = 0;
        let cashAmount = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        payments.forEach(payment => {

            const amount = Number(payment.amount || 0);
            totalAmount += amount;

            if (String(payment.payment_method || "").toUpperCase() === "CASH") {
                cashAmount += amount;
            }

            const paymentDate = new Date(payment.payment_date);

            if (
                !Number.isNaN(paymentDate.getTime()) &&
                paymentDate.getMonth() === currentMonth &&
                paymentDate.getFullYear() === currentYear
            ) {
                monthAmount += amount;
            }
        });

        const totalElement = document.querySelector("#paymentsTotalAmount");
        const monthElement = document.querySelector("#paymentsMonthAmount");
        const cashElement = document.querySelector("#paymentsCashAmount");
        const countElement = document.querySelector("#paymentsCount");

        if (totalElement) totalElement.textContent = formatCurrency(totalAmount);
        if (monthElement) monthElement.textContent = formatCurrency(monthAmount);
        if (cashElement) cashElement.textContent = formatCurrency(cashAmount);
        if (countElement) countElement.textContent = payments.length;

        window.paymentsListCache = payments;

        filterPayments();

    } catch (error) {

        console.error("Failed to load payments:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <h4>Unable to load payments</h4>
                        <p>${error.message}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}


function renderPaymentsTable(paymentsList, hasActiveFilter = false) {

    const tableBody = document.querySelector("#paymentsTableBody");
    if (!tableBody) return;

    if (!paymentsList || paymentsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <h4>${hasActiveFilter ? "No payments match your filters" : "No payments yet"}</h4>
                        <p>${hasActiveFilter ? "Try adjusting your search query or payment method filter." : "Record your first rental payment."}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paymentsList.map(payment => {

        const paymentDate = payment.payment_date
            ? new Date(payment.payment_date).toLocaleDateString("en-PH")
            : "-";

        return `
            <tr>
                <td>${payment.receipt_number || "-"}</td>
                <td>${payment.vendor_name || "-"}</td>
                <td>${payment.rental_code || "-"}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${payment.payment_method || "-"}</td>
                <td>${paymentDate}</td>
                <td>${payment.reference_number || "-"}</td>
                <td>
                    <button
                        class="table-action-btn"
                        type="button"
                        onclick="openEditPaymentModal(${payment.id})"
                    >
                        Edit
                    </button>
                    <button
                        class="table-action-btn table-action receipt-btn"
                        type="button"
                        onclick="openReceiptModal(${payment.id})"
                    >
                        Receipt
                    </button>
                </td>
            </tr>
        `;

    }).join("");
}


function filterPayments() {

    const payments = window.paymentsListCache || [];
    const searchInput = document.querySelector("#paymentSearch");
    const methodFilter = document.querySelector("#paymentMethodFilter");

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const rawMethod = methodFilter ? methodFilter.value.trim().toUpperCase() : "";
    const method = (rawMethod === "ALL" || !rawMethod) ? "" : rawMethod;

    const hasActiveFilter = query.length > 0 || method.length > 0;

    const filtered = payments.filter(p => {

        if (method && String(p.payment_method || "").toUpperCase() !== method) {
            return false;
        }

        if (query) {
            const receipt = String(p.receipt_number || "").toLowerCase();
            const vendor = String(p.vendor_name || "").toLowerCase();
            const rental = String(p.rental_code || "").toLowerCase();
            const ref = String(p.reference_number || "").toLowerCase();
            const notes = String(p.notes || "").toLowerCase();
            const methodStr = String(p.payment_method || "").toLowerCase();
            const amountStr = String(p.amount || "").toLowerCase();

            const match = receipt.includes(query) ||
                          vendor.includes(query) ||
                          rental.includes(query) ||
                          ref.includes(query) ||
                          notes.includes(query) ||
                          methodStr.includes(query) ||
                          amountStr.includes(query);

            if (!match) return false;
        }

        return true;
    });

    renderPaymentsTable(filtered, hasActiveFilter);
}

function showPage(pageName) {

    const dashboardPage =
        document.querySelector(".dashboard-page");

    const vendorsPage =
        document.querySelector(".vendors-page");

    const foodCartsPage =
        document.querySelector(".food-carts-page");

    const rentalsPage =
        document.querySelector(".rentals-page");

    const paymentsPage =
        document.querySelector(".payments-page");

    const receiptsPage =
        document.querySelector(".receipts-page");

    const settingsPage =
        document.querySelector(".settings-page");

    const pageTitle =
        document.querySelector("#pageTitle");


    // Hide all pages

    if (dashboardPage) {
        dashboardPage.style.display = "none";
    }

    if (vendorsPage) {
        vendorsPage.style.display = "none";
    }

    if (foodCartsPage) {
        foodCartsPage.style.display = "none";
    }

    if (rentalsPage) {
        rentalsPage.style.display = "none";
    }

    if (paymentsPage) {
        paymentsPage.style.display = "none";
    }

    if (receiptsPage) {
        receiptsPage.style.display = "none";
    }

    if (settingsPage) {
        settingsPage.style.display = "none";
    }


    // ==========================================
    // DASHBOARD
    // ==========================================

    if (pageName === "dashboard") {

        if (dashboardPage) {
            dashboardPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Dashboard";
        }

        loadDashboard();
        loadRecentRentals();

        return;
    }


    // ==========================================
    // RENTALS
    // ==========================================

    if (pageName === "rentals") {

        if (rentalsPage) {
            rentalsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Rentals";
        }

        loadRentals();

        return;
    }


    // ==========================================
    // PAYMENTS
    // ==========================================

    if (pageName === "payments") {

        if (paymentsPage) {
            paymentsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Payments";
        }

        loadPayments();

        return;
    }

    // ==========================================
    // RECEIPTS
    // ==========================================

    if (pageName === "receipts") {

        if (receiptsPage) {
            receiptsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Receipts";
        }

        loadReceipts();

        return;
    }

    // ==========================================
    // SETTINGS
    // ==========================================

    if (pageName === "settings") {

        if (settingsPage) {
            settingsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Business Settings & Branding";
        }

        loadSettings();

        return;
    }

    // VENDORS
    // ==========================================

    if (pageName === "vendors") {

        if (vendorsPage) {
            vendorsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Vendors";
        }

        loadVendors();

        return;
    }


    // ==========================================
    // FOOD CARTS
    // ==========================================

    if (pageName === "food-carts") {

        if (foodCartsPage) {
            foodCartsPage.style.display = "block";
        }

        if (pageTitle) {
            pageTitle.textContent = "Food Carts";
        }

        loadFoodCarts();

        return;
    }


    // ==========================================
    // PAGES NOT IMPLEMENTED YET
    // ==========================================

    if (pageTitle) {
        pageTitle.textContent = pageName;
    }

    console.log(
        `Page "${pageName}" is not implemented yet.`
    );
}

// ==========================================
// NAVIGATION EVENTS
// ==========================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;

                if (!page) {
                    return;
                }


                // Active menu

                navItems.forEach(nav => {
                    nav.classList.remove("active");
                });

                item.classList.add("active");


                // Change page

                showPage(page);

            }
        );

    });

}


// ==========================================
// START APPLICATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "FoodCartManager Admin started"
        );

        setupNavigation();

        showPage("dashboard");

    }
);


// ==========================================
// ADD FOOD CART
// ==========================================

function setupFoodCartButton() {

    const button = document.querySelector(
        "#addFoodCartBtn"
    );

    if (!button) {
        console.warn(
            "Add Food Cart button not found."
        );
        return;
    }

    button.addEventListener(
        "click",
        openAddFoodCartModal
    );
}


// ==========================================
// OPEN ADD FOOD CART MODAL
// ==========================================

async function openAddFoodCartModal() {

    // Prevent duplicate modal

    const existingModal =
        document.querySelector(
            "#addFoodCartModal"
        );

    if (existingModal) {
        existingModal.remove();
    }


    const modal = document.createElement(
        "div"
    );

    modal.id = "addFoodCartModal";

    modal.innerHTML = `

        <div
            style="
                position:fixed;
                inset:0;
                background:rgba(40,10,25,.45);
                display:flex;
                align-items:center;
                justify-content:center;
                z-index:9999;
                padding:20px;
            "
        >

            <div
                style="
                    width:100%;
                    max-width:560px;
                    max-height:90vh;
                    overflow-y:auto;
                    background:#fff;
                    border-radius:20px;
                    box-shadow:0 25px 80px rgba(0,0,0,.25);
                    padding:28px;
                "
            >

                <!-- HEADER -->

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:24px;
                    "
                >

                    <div>

                        <h2
                            style="
                                margin:0;
                                font-size:24px;
                                color:#321525;
                            "
                        >
                            Add Food Cart
                        </h2>

                        <p
                            style="
                                margin:6px 0 0;
                                color:#8b6577;
                                font-size:14px;
                            "
                        >
                            Register a new food cart
                        </p>

                    </div>


                    <button
                        type="button"
                        id="closeFoodCartModal"
                        style="
                            border:0;
                            background:#fceaf2;
                            color:#c90062;
                            width:38px;
                            height:38px;
                            border-radius:50%;
                            font-size:22px;
                            cursor:pointer;
                        "
                    >
                        &times;
                    </button>

                </div>


                <!-- FORM -->

                <form id="addFoodCartForm">

                    <!-- CART CODE -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Cart Code
                        </label>

                        <input
                            type="text"
                            id="newCartCode"
                            placeholder="Example: CART-001"
                            required
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                            "
                        >

                    </div>


                    <!-- CART NAME -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Cart Name
                        </label>

                        <input
                            type="text"
                            id="newCartName"
                            placeholder="Example: Burger Cart"
                            required
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                            "
                        >

                    </div>


                    <!-- OWNERSHIP -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Ownership
                        </label>

                        <select
                            id="newOwnershipType"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                                background:white;
                            "
                        >

                            <option value="BUSINESS">
                                Business
                            </option>

                            <option value="VENDOR">
                                Vendor
                            </option>

                        </select>

                    </div>


                    <!-- VENDOR -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Vendor
                        </label>

                        <select
                            id="newVendorId"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                                background:white;
                            "
                        >

                            <option value="">
                                No Vendor
                            </option>

                        </select>

                    </div>


                    <!-- STATUS -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Status
                        </label>

                        <select
                            id="newCartStatus"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                                background:white;
                            "
                        >

                            <option value="AVAILABLE">
                                Available
                            </option>

                            <option value="RENTED">
                                Rented
                            </option>

                            <option value="MAINTENANCE">
                                Maintenance
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>

                        </select>

                    </div>


                    <!-- DESCRIPTION -->

                    <div style="margin-bottom:16px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Description
                        </label>

                        <textarea
                            id="newCartDescription"
                            rows="3"
                            placeholder="Describe this food cart..."
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <!-- NOTES -->

                    <div style="margin-bottom:22px;">

                        <label
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                                color:#4b293b;
                            "
                        >
                            Notes
                        </label>

                        <textarea
                            id="newCartNotes"
                            rows="2"
                            placeholder="Additional notes..."
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:12px 14px;
                                border:1px solid #edcfdd;
                                border-radius:10px;
                                font-size:14px;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <!-- ACTIONS -->

                    <div
                        style="
                            display:flex;
                            justify-content:flex-end;
                            gap:10px;
                        "
                    >

                        <button
                            type="button"
                            id="cancelFoodCartBtn"
                            style="
                                padding:12px 18px;
                                border:1px solid #edcfdd;
                                background:white;
                                color:#713f56;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            id="saveFoodCartBtn"
                            style="
                                padding:12px 20px;
                                border:0;
                                background:#c90062;
                                color:white;
                                border-radius:10px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Add Food Cart
                        </button>

                    </div>

                </form>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    // --------------------------------------
    // CLOSE BUTTONS
    // --------------------------------------

    document.querySelector(
        "#closeFoodCartModal"
    ).addEventListener(
        "click",
        closeAddFoodCartModal
    );


    document.querySelector(
        "#cancelFoodCartBtn"
    ).addEventListener(
        "click",
        closeAddFoodCartModal
    );


    // --------------------------------------
    // FORM SUBMIT
    // --------------------------------------

    document.querySelector(
        "#addFoodCartForm"
    ).addEventListener(
        "submit",
        createFoodCart
    );


    // --------------------------------------
    // LOAD VENDORS
    // --------------------------------------

    await loadFoodCartVendors();
}


// ==========================================
// LOAD VENDORS FOR FOOD CART FORM
// ==========================================

async function loadFoodCartVendors() {

    const select =
        document.querySelector(
            "#newVendorId"
        );

    if (!select) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/vendors/`
        );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.data
        ) {
            return;
        }


        result.data.forEach(
            vendor => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    vendor.id;

                option.textContent =
                    `${vendor.vendor_code || ""} - ${vendor.business_name || "Unnamed Vendor"}`;

                select.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );

    }
}


// ==========================================
// CREATE FOOD CART
// ==========================================

async function createFoodCart(event) {

    event.preventDefault();


    const saveButton =
        document.querySelector(
            "#saveFoodCartBtn"
        );


    const data = {

        cart_code:
            document.querySelector(
                "#newCartCode"
            ).value.trim(),

        cart_name:
            document.querySelector(
                "#newCartName"
            ).value.trim(),

        ownership_type:
            document.querySelector(
                "#newOwnershipType"
            ).value,

        vendor_id:
            document.querySelector(
                "#newVendorId"
            ).value || null,

        description:
            document.querySelector(
                "#newCartDescription"
            ).value.trim() || null,

        status:
            document.querySelector(
                "#newCartStatus"
            ).value,

        notes:
            document.querySelector(
                "#newCartNotes"
            ).value.trim() || null

    };


    if (
        !data.cart_code ||
        !data.cart_name
    ) {

        showNotification(
            "Cart Code and Cart Name are required.",
            "error"
        );

        return;
    }


    try {

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";


        const response = await fetch(
            `${API_BASE}/api/food-carts/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(data)
            }
        );


        const result =
            await response.json();


        console.log(
            "Create Food Cart API:",
            result
        );


        if (!response.ok || !result.success) {

            throw new Error(
                result.error ||
                "Unable to create food cart."
            );

        }


        closeAddFoodCartModal();


        showNotification(
            "Food cart created successfully.",
            "success"
        );


        // Refresh table

        loadFoodCarts();


    } catch (error) {

        console.error(
            "Create food cart error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to create food cart.",
            "error"
        );


    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Add Food Cart";

        }

    }

}


// ==========================================
// CLOSE ADD FOOD CART MODAL
// ==========================================

function closeAddFoodCartModal() {

    const modal =
        document.querySelector(
            "#addFoodCartModal"
        );

    if (modal) {
        modal.remove();
    }

}


// ==========================================
// START FOOD CART BUTTON
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupFoodCartButton();

    }
);















// ==========================================
// NEW RENTAL MODAL
// ==========================================

function openNewRentalModal() {

    const modal =
        document.getElementById("rentalModal");

    if (!modal) {

        console.error(
            "Rental modal not found."
        );

        return;
    }


    const form =
        document.getElementById("rentalForm");

    if (form) {
        form.reset();
    }


    const message =
        document.getElementById(
            "rentalFormMessage"
        );

    if (message) {

        message.style.display = "none";
        message.textContent = "";

    }


    const startDate =
        document.getElementById(
            "rentalStartDate"
        );

    if (startDate) {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        startDate.value = today;

    }


    loadPaymentRentals();

    modal.style.display = "flex";

    // ==================================================
    // RENTAL MODAL: DISABLE BACKDROP CLICK TO CLOSE
    // ==================================================

    if (!modal.dataset.outsideClickLocked) {

        modal.addEventListener(
            "click",
            function (event) {

                // Clicking the dark/background area must NOT close.
                if (event.target === modal) {

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    return false;
                }

            },
            true
        );

        modal.dataset.outsideClickLocked = "true";
    }

    // Also prevent mouse/pointer events on the backdrop
    // from reaching any global modal-close handlers.
    if (!modal.dataset.pointerLocked) {

        modal.addEventListener(
            "mousedown",
            function (event) {

                if (event.target === modal) {

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                }

            },
            true
        );

        modal.addEventListener(
            "pointerdown",
            function (event) {

                if (event.target === modal) {

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                }

            },
            true
        );

        modal.dataset.pointerLocked = "true";
    }

    loadRentalVendors();
    loadRentalFoodCarts();

}


window.openNewRentalModal =
    openNewRentalModal;



function closeRentalModal() {

    const modal =
        document.getElementById(
            "rentalModal"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


window.closeRentalModal =
    closeRentalModal;



// ==========================================
// LOAD VENDORS
// ==========================================

async function loadRentalVendors() {

    const select =
        document.getElementById(
            "rentalVendor"
        );

    if (!select) return;


    select.innerHTML = `
        <option value="">
            Loading vendors...
        </option>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE}/api/vendors/`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        const vendors =
            result.data || [];


        select.innerHTML = `
            <option value="">
                Select vendor
            </option>
        `;


        vendors.forEach(vendor => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                vendor.id;

            option.textContent =
                vendor.business_name ||
                vendor.name ||
                `Vendor #${vendor.id}`;


            select.appendChild(option);

        });


        if (vendors.length === 0) {

            select.innerHTML = `
                <option value="">
                    No vendors available
                </option>
            `;

        }

    }
    catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );


        select.innerHTML = `
            <option value="">
                Unable to load vendors
            </option>
        `;

    }

}



// ==========================================
// LOAD FOOD CARTS
// ==========================================

async function loadRentalFoodCarts() {

    const select =
        document.getElementById(
            "rentalCart"
        );

    if (!select) return;


    select.innerHTML = `
        <option value="">
            Loading food carts...
        </option>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE}/api/food-carts/`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        const carts =
            result.data || [];


        select.innerHTML = `
            <option value="">
                Select food cart
            </option>
        `;


        carts.forEach(cart => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                cart.id;

            option.textContent =
                cart.cart_name ||
                cart.name ||
                cart.cart_code ||
                `Cart #${cart.id}`;


            select.appendChild(option);

        });


        if (carts.length === 0) {

            select.innerHTML = `
                <option value="">
                    No food carts available
                </option>
            `;

        }

    }
    catch (error) {

        console.error(
            "Food cart loading error:",
            error
        );


        select.innerHTML = `
            <option value="">
                Unable to load food carts
            </option>
        `;

    }

}



// ==========================================
// CREATE RENTAL
// ==========================================

async function submitRentalForm(event) {

    event.preventDefault();


    const message =
        document.getElementById(
            "rentalFormMessage"
        );


    const vendorId =
        document.getElementById(
            "rentalVendor"
        ).value;


    const cartId =
        document.getElementById(
            "rentalCart"
        ).value;


    const startDate =
        document.getElementById(
            "rentalStartDate"
        ).value;


    const endDate =
        document.getElementById(
            "rentalEndDate"
        ).value;


    const billingCycle =
        document.getElementById(
            "rentalBilling"
        ).value;


    const rentAmount =
        document.getElementById(
            "rentalAmount"
        ).value;


    const securityDeposit =
        document.getElementById(
            "rentalDeposit"
        ).value;


    const status =
        document.getElementById(
            "rentalStatus"
        ).value;


    const notes =
        document.getElementById(
            "rentalNotes"
        ).value;


    if (!vendorId) {

        showRentalMessage(
            "Please select a vendor.",
            true
        );

        return;

    }


    if (!startDate) {

        showRentalMessage(
            "Please select a start date.",
            true
        );

        return;

    }


    const payload = {

        vendor_id:
            Number(vendorId),

        cart_id:
            cartId
                ? Number(cartId)
                : null,

        start_date:
            startDate,

        end_date:
            endDate || null,

        billing_cycle:
            billingCycle,

        rent_amount:
            Number(rentAmount || 0),

        security_deposit:
            Number(
                securityDeposit || 0
            ),

        status:
            status,

        notes:
            notes || null

    };


    const submitButton =
        document.querySelector(
            "#rentalForm button[type='submit']"
        );


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Creating...";

    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/rentals/`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const result =
            await response.json();


        if (!response.ok ||
            !result.success) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        showRentalMessage(
            "Rental created successfully.",
            false
        );


        setTimeout(() => {

            closeRentalModal();

            loadRentals();

        }, 700);


    }
    catch (error) {

        console.error(
            "Create rental error:",
            error
        );


        showRentalMessage(
            error.message ||
            "Unable to create rental.",
            true
        );

    }
    finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Create Rental";

        }

    }

}



function showRentalMessage(
    text,
    isError
) {

    const message =
        document.getElementById(
            "rentalFormMessage"
        );

    if (!message) return;


    message.textContent = text;

    message.style.display =
        "block";


    message.style.color =
        isError
            ? "#c62828"
            : "#087443";


    message.style.background =
        isError
            ? "#fff1f1"
            : "#ecfdf3";


    message.style.padding =
        "10px 12px";

    message.style.borderRadius =
        "8px";

}



// ==========================================
// RENTAL EVENTS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const newRentalBtn =
            document.getElementById(
                "newRentalBtn"
            );


        if (newRentalBtn) {

            newRentalBtn.addEventListener(
                "click",
                openNewRentalModal
            );

        }


        const rentalForm =
            document.getElementById(
                "rentalForm"
            );


        if (rentalForm) {

            rentalForm.addEventListener(
                "submit",
                submitRentalForm
            );

        }


        const modal =
            document.getElementById(
                "rentalModal"
            );


        if (modal) {

        }

    }
);



// ==========================================
// TOP QUICK ADD RENTAL BUTTON FIX
// ==========================================

(function () {

    function setupQuickRentalButtons() {

        const quickAdd =
            document.getElementById("quickAdd");

        const newRentalBtn =
            document.getElementById("newRentalBtn");


        // TOP RIGHT NEW RENTAL BUTTON

        if (quickAdd) {

            quickAdd.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    console.log(
                        "Top New Rental button clicked."
                    );

                    if (
                        typeof window.openNewRentalModal ===
                        "function"
                    ) {

                        window.openNewRentalModal();

                    }
                    else {

                        console.error(
                            "openNewRentalModal() is not available."
                        );

                    }

                }
            );

        }


        // RENTALS PAGE NEW RENTAL BUTTON

        if (newRentalBtn) {

            newRentalBtn.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    console.log(
                        "Rental page New Rental button clicked."
                    );

                    if (
                        typeof window.openNewRentalModal ===
                        "function"
                    ) {

                        window.openNewRentalModal();

                    }

                }
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            setupQuickRentalButtons
        );

    }
    else {

        setupQuickRentalButtons();

    }

})();









function handlePaymentRentalChange() {
    const rentalSelect = document.querySelector("#paymentRental");
    const vendorInput = document.querySelector("#paymentVendor");
    const amountInput = document.querySelector("#paymentAmount");

    if (!rentalSelect) {
        return;
    }

    const selectedOption =
        rentalSelect.options[rentalSelect.selectedIndex];

    if (!selectedOption || !selectedOption.value) {
        if (vendorInput) {
            vendorInput.value = "";
        }

        if (amountInput) {
            amountInput.value = "";
        }

        return;
    }

    const selectedRentalId = Number(selectedOption.value);

    if (!window.paymentRentalsCache) {
        console.warn("Payment rental cache not available.");
        return;
    }

    const rental = window.paymentRentalsCache.find(
        item => Number(item.id) === selectedRentalId
    );

    if (!rental) {
        console.warn(
            "Selected rental not found in payment cache:",
            selectedRentalId
        );
        return;
    }

    if (vendorInput) {
        vendorInput.value = rental.vendor_name || "";
    }

    if (amountInput) {
        amountInput.value = Number(
            rental.rent_amount || 0
        ).toFixed(2);
    }

    console.log(
        "Selected payment rental:",
        rental
    );
}

async function loadPaymentRentals() {
    const select = document.querySelector("#paymentRental");

    if (!select) {
        console.warn("Payment rental dropdown not found.");
        return;
    }

    select.innerHTML = `
        <option value="">Loading active rentals...</option>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/rentals/`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        console.log("Payment Rentals API:", result);

        if (!result.success) {
            throw new Error(
                result.error || "Unable to load rentals."
            );
        }

        const rentals = result.data || [];

        window.paymentRentalsCache = rentals;

        const activeRentals = rentals.filter(
            rental =>
                String(rental.status || "").toUpperCase() === "ACTIVE"
        );

        if (activeRentals.length === 0) {
            select.innerHTML = `
                <option value="">No active rentals available</option>
            `;
            return;
        }

        select.innerHTML = `
            <option value="">Select active rental</option>
            ${activeRentals.map(rental => `
                <option value="${rental.id}">
                    ${rental.rental_code || `Rental #${rental.id}`}
                    — ${rental.vendor_name || "No vendor"}
                    — ${formatCurrency(rental.rent_amount)}
                </option>
            `).join("")}
        `;

    } catch (error) {
        console.error(
            "Load payment rentals error:",
            error
        );

        select.innerHTML = `
            <option value="">Unable to load rentals</option>
        `;
    }
}

function openPaymentModal() {
    const modal = document.querySelector("#paymentModal");
    const form = document.querySelector("#paymentForm");
    const message = document.querySelector("#paymentFormMessage");
    const paymentDate = document.querySelector("#paymentDate");

    if (!modal) {
        console.warn("Payment modal not found.");
        return;
    }

    if (form) {
        form.reset();
    }

    if (message) {
        message.style.display = "none";
        message.textContent = "";
        message.className = "form-message";
    }

    if (paymentDate) {
        const now = new Date();
        const localDateTime = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 16);

        paymentDate.value = localDateTime;
    }

    loadPaymentRentals();

    modal.style.display = "flex";
}

function closePaymentModal() {
    const modal = document.querySelector("#paymentModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function showPaymentFormMessage(text, isError = false) {
    const message = document.querySelector("#paymentFormMessage");
    if (!message) return;

    message.textContent = text;
    message.style.display = "block";
    message.style.color = isError ? "#c62828" : "#087443";
    message.style.background = isError ? "#fff1f1" : "#ecfdf3";
    message.style.padding = "10px 12px";
    message.style.borderRadius = "8px";
    message.style.marginTop = "12px";
}

async function savePayment(event) {
    if (event) {
        event.preventDefault();
    }

    const rentalSelect = document.querySelector("#paymentRental");
    const amountInput = document.querySelector("#paymentAmount");
    const methodSelect = document.querySelector("#paymentMethod");
    const dateInput = document.querySelector("#paymentDate");
    const periodStartInput = document.querySelector("#paymentPeriodStart");
    const periodEndInput = document.querySelector("#paymentPeriodEnd");
    const referenceInput = document.querySelector("#paymentReference");
    const notesInput = document.querySelector("#paymentNotes");
    const submitButton = document.querySelector("#paymentForm button[type='submit']");

    const rentalId = rentalSelect ? Number(rentalSelect.value) : null;
    if (!rentalId) {
        showPaymentFormMessage("Please select an active rental.", true);
        return;
    }

    let vendorId = null;
    if (window.paymentRentalsCache) {
        const selectedRental = window.paymentRentalsCache.find(
            item => Number(item.id) === rentalId
        );
        if (selectedRental) {
            vendorId = selectedRental.vendor_id;
        }
    }

    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    if (isNaN(amount) || amount <= 0) {
        showPaymentFormMessage("Payment amount must be greater than zero.", true);
        return;
    }

    const paymentMethod = methodSelect ? methodSelect.value : "CASH";
    const paymentDate = dateInput && dateInput.value ? dateInput.value : null;

    if (!paymentDate) {
        showPaymentFormMessage("Payment date is required.", true);
        return;
    }

    const payload = {
        rental_id: rentalId,
        vendor_id: vendorId,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        period_start: periodStartInput && periodStartInput.value ? periodStartInput.value : null,
        period_end: periodEndInput && periodEndInput.value ? periodEndInput.value : null,
        reference_number: referenceInput && referenceInput.value.trim() ? referenceInput.value.trim() : null,
        notes: notesInput && notesInput.value.trim() ? notesInput.value.trim() : null
    };

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving Payment...";
    }

    try {
        const response = await fetch(`${API_BASE}/api/payments/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error ${response.status}`);
        }

        showPaymentFormMessage("Payment recorded successfully!", false);

        setTimeout(() => {
            closePaymentModal();
            if (typeof loadPayments === "function") {
                loadPayments();
            }
        }, 700);

    } catch (error) {
        console.error("Save payment error:", error);
        showPaymentFormMessage(error.message || "Unable to save payment.", true);
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Save Payment";
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const newPaymentBtn = document.querySelector("#newPaymentBtn");

    if (newPaymentBtn) {
        newPaymentBtn.addEventListener("click", openPaymentModal);
    }
});







// ==========================================
// PAYMENT RENTAL CHANGE & SUBMIT LISTENERS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const paymentRentalSelect =
        document.querySelector("#paymentRental");

    if (paymentRentalSelect) {
        paymentRentalSelect.addEventListener(
            "change",
            handlePaymentRentalChange
        );
    }

    const paymentForm =
        document.querySelector("#paymentForm");

    if (paymentForm) {
        paymentForm.addEventListener(
            "submit",
            savePayment
        );
    }

});


// ==========================================
// EDIT PAYMENT MODAL FUNCTIONS
// ==========================================

function showEditPaymentFormMessage(text, isError = false) {
    const message = document.querySelector("#editPaymentFormMessage");
    if (!message) return;

    message.textContent = text;
    message.style.display = "block";
    message.style.color = isError ? "#c62828" : "#087443";
    message.style.background = isError ? "#fff1f1" : "#ecfdf3";
    message.style.padding = "10px 12px";
    message.style.borderRadius = "8px";
    message.style.marginTop = "12px";
}

async function openEditPaymentModal(paymentId) {
    console.log("Opening edit payment modal for ID:", paymentId);

    const modal = document.querySelector("#editPaymentModal");
    const form = document.querySelector("#editPaymentForm");
    const message = document.querySelector("#editPaymentFormMessage");
    const subtext = document.querySelector("#editPaymentReceiptSubtext");

    if (!modal) {
        console.warn("Edit payment modal not found.");
        return;
    }

    if (form) {
        form.reset();
    }

    if (message) {
        message.style.display = "none";
        message.textContent = "";
        message.className = "form-message";
    }

    try {
        const response = await fetch(`${API_BASE}/api/payments/${paymentId}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.error || "Payment data not found.");
        }

        const payment = result.data;

        // Populate hidden fields
        const idInput = document.querySelector("#editPaymentId");
        const rentalIdInput = document.querySelector("#editPaymentRentalId");
        const vendorIdInput = document.querySelector("#editPaymentVendorId");

        if (idInput) idInput.value = payment.id || "";
        if (rentalIdInput) rentalIdInput.value = payment.rental_id || "";
        if (vendorIdInput) vendorIdInput.value = payment.vendor_id || "";

        // Populate summary banner and readonly fields
        const receiptBadge = document.querySelector("#editPaymentReceiptBadge");
        const rentalText = document.querySelector("#editPaymentRentalText");
        const vendorText = document.querySelector("#editPaymentVendorText");
        const receiptInput = document.querySelector("#editPaymentReceipt");
        const rentalInput = document.querySelector("#editPaymentRental");
        const vendorInput = document.querySelector("#editPaymentVendor");

        const receiptStr = payment.receipt_number || "-";
        const rentalStr = payment.rental_code || (payment.rental_id ? `Rental #${payment.rental_id}` : "-");
        const vendorStr = payment.vendor_name || "-";

        if (receiptBadge) receiptBadge.textContent = receiptStr;
        if (rentalText) rentalText.textContent = rentalStr;
        if (vendorText) vendorText.textContent = vendorStr;
        if (subtext) subtext.textContent = `Receipt: ${receiptStr}`;

        if (receiptInput) receiptInput.value = receiptStr;
        if (rentalInput) rentalInput.value = rentalStr;
        if (vendorInput) vendorInput.value = vendorStr;

        // Populate editable fields
        const amountInput = document.querySelector("#editPaymentAmount");
        const methodSelect = document.querySelector("#editPaymentMethod");
        const dateInput = document.querySelector("#editPaymentDate");
        const periodStartInput = document.querySelector("#editPaymentPeriodStart");
        const periodEndInput = document.querySelector("#editPaymentPeriodEnd");
        const referenceInput = document.querySelector("#editPaymentReference");
        const notesInput = document.querySelector("#editPaymentNotes");

        if (amountInput) amountInput.value = Number(payment.amount || 0).toFixed(2);
        if (methodSelect) methodSelect.value = payment.payment_method || "CASH";

        if (dateInput && payment.payment_date) {
            const dt = new Date(payment.payment_date);
            if (!isNaN(dt.getTime())) {
                const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16);
                dateInput.value = localStr;
            } else {
                dateInput.value = "";
            }
        }

        if (periodStartInput) {
            periodStartInput.value = payment.period_start ? payment.period_start.slice(0, 10) : "";
        }
        if (periodEndInput) {
            periodEndInput.value = payment.period_end ? payment.period_end.slice(0, 10) : "";
        }
        if (referenceInput) referenceInput.value = payment.reference_number || "";
        if (notesInput) notesInput.value = payment.notes || "";

        modal.style.display = "flex";

    } catch (error) {
        console.error("Failed to load payment for editing:", error);
        alert(error.message || "Unable to load payment details.");
    }
}

function closeEditPaymentModal() {
    const modal = document.querySelector("#editPaymentModal");
    if (modal) {
        modal.style.display = "none";
    }
}

async function updatePayment(event) {
    if (event) {
        event.preventDefault();
    }

    const idInput = document.querySelector("#editPaymentId");
    const rentalIdInput = document.querySelector("#editPaymentRentalId");
    const vendorIdInput = document.querySelector("#editPaymentVendorId");
    const amountInput = document.querySelector("#editPaymentAmount");
    const methodSelect = document.querySelector("#editPaymentMethod");
    const dateInput = document.querySelector("#editPaymentDate");
    const periodStartInput = document.querySelector("#editPaymentPeriodStart");
    const periodEndInput = document.querySelector("#editPaymentPeriodEnd");
    const referenceInput = document.querySelector("#editPaymentReference");
    const notesInput = document.querySelector("#editPaymentNotes");
    const submitButton = document.querySelector("#editPaymentForm button[type='submit']");

    const paymentId = idInput ? idInput.value : null;
    if (!paymentId) {
        showEditPaymentFormMessage("Invalid payment record.", true);
        return;
    }

    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    if (isNaN(amount) || amount <= 0) {
        showEditPaymentFormMessage("Payment amount must be greater than zero.", true);
        return;
    }

    const paymentDate = dateInput && dateInput.value ? dateInput.value : null;
    if (!paymentDate) {
        showEditPaymentFormMessage("Payment date is required.", true);
        return;
    }

    const payload = {
        rental_id: rentalIdInput && rentalIdInput.value ? Number(rentalIdInput.value) : null,
        vendor_id: vendorIdInput && vendorIdInput.value ? Number(vendorIdInput.value) : null,
        amount: amount,
        payment_method: methodSelect ? methodSelect.value : "CASH",
        payment_date: paymentDate,
        period_start: periodStartInput && periodStartInput.value ? periodStartInput.value : null,
        period_end: periodEndInput && periodEndInput.value ? periodEndInput.value : null,
        reference_number: referenceInput && referenceInput.value.trim() ? referenceInput.value.trim() : null,
        notes: notesInput && notesInput.value.trim() ? notesInput.value.trim() : null
    };

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Updating Payment...";
    }

    try {
        const response = await fetch(`${API_BASE}/api/payments/${paymentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error ${response.status}`);
        }

        showEditPaymentFormMessage("Payment updated successfully!", false);

        setTimeout(() => {
            closeEditPaymentModal();
            if (typeof loadPayments === "function") {
                loadPayments();
            }
        }, 700);

    } catch (error) {
        console.error("Update payment error:", error);
        showEditPaymentFormMessage(error.message || "Unable to update payment.", true);
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Update Payment";
        }
    }
}

window.openEditPaymentModal = openEditPaymentModal;
window.closeEditPaymentModal = closeEditPaymentModal;

document.addEventListener("DOMContentLoaded", () => {
    const editPaymentForm = document.querySelector("#editPaymentForm");

    if (editPaymentForm) {
        editPaymentForm.addEventListener("submit", updatePayment);
    }

    const paymentSearch = document.querySelector("#paymentSearch");
    if (paymentSearch) {
        paymentSearch.addEventListener("input", filterPayments);
    }

    const paymentMethodFilter = document.querySelector("#paymentMethodFilter");
    if (paymentMethodFilter) {
        paymentMethodFilter.addEventListener("change", filterPayments);
    }

    // Settings live viewing listeners
    const settingInputs = [
        "#settingBusinessName",
        "#settingCurrency",
        "#settingPhone",
        "#settingEmail",
        "#settingAddress",
        "#settingReceiptHeader",
        "#settingReceiptFooter"
    ];

    settingInputs.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.addEventListener("input", updateSettingsLivePreview);
            el.addEventListener("change", updateSettingsLivePreview);
        }
    });

    // Receipts search and filter listeners
    const receiptSearch = document.querySelector("#receiptSearch");
    if (receiptSearch) {
        receiptSearch.addEventListener("input", filterReceipts);
    }

    const receiptStatusFilter = document.querySelector("#receiptStatusFilter");
    if (receiptStatusFilter) {
        receiptStatusFilter.addEventListener("change", filterReceipts);
    }

    // Preload settings for dynamic branding and currency formatting
    loadSettings();
});

// ==========================================
// BUSINESS SETTINGS & BRANDING (LIVE VIEWING)
// ==========================================

window.appSettings = null;

async function loadSettings() {
    const bizNameInput = document.querySelector("#settingBusinessName");
    const currencySelect = document.querySelector("#settingCurrency");
    const phoneInput = document.querySelector("#settingPhone");
    const emailInput = document.querySelector("#settingEmail");
    const addressInput = document.querySelector("#settingAddress");
    const headerInput = document.querySelector("#settingReceiptHeader");
    const footerInput = document.querySelector("#settingReceiptFooter");

    try {
        const response = await fetch(`${API_BASE}/api/settings/`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to load settings");
        }

        const s = result.data || {};
        window.appSettings = s;

        if (bizNameInput) bizNameInput.value = s.business_name || "";
        if (currencySelect) currencySelect.value = s.currency || "PHP";
        if (phoneInput) phoneInput.value = s.phone || "";
        if (emailInput) emailInput.value = s.email || "";
        if (addressInput) addressInput.value = s.address || "";
        if (headerInput) headerInput.value = s.receipt_header || "";
        if (footerInput) footerInput.value = s.receipt_footer || "";

        updateSettingsLivePreview();

    } catch (err) {
        console.error("Load settings error:", err);
    }
}

function updateSettingsLivePreview() {
    const bizName = document.querySelector("#settingBusinessName")?.value.trim() || "FoodCart Park & Leasing";
    const currency = document.querySelector("#settingCurrency")?.value.trim() || "PHP";
    const phone = document.querySelector("#settingPhone")?.value.trim() || "+63 917 123 4567";
    const email = document.querySelector("#settingEmail")?.value.trim() || "contact@foodcartpark.ph";
    const address = document.querySelector("#settingAddress")?.value.trim() || "123 Commercial Ave, Metro Manila";
    const headerTitle = document.querySelector("#settingReceiptHeader")?.value.trim() || "OFFICIAL RENTAL RECEIPT";
    const footerText = document.querySelector("#settingReceiptFooter")?.value.trim() || "Thank you for your business! Please keep this receipt for your records.";

    const symbols = { PHP: "₱", USD: "$", EUR: "€", SGD: "S$", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$" };
    const sym = symbols[currency] || (currency + " ");

    const pBizName = document.querySelector("#previewBizName");
    const pBizAddress = document.querySelector("#previewBizAddress");
    const pBizContact = document.querySelector("#previewBizContact");
    const pHeaderTitle = document.querySelector("#previewHeaderTitle");
    const pCurrencySample = document.querySelector("#previewCurrencySample");
    const pFooterText = document.querySelector("#previewFooterText");

    if (pBizName) pBizName.textContent = bizName;
    if (pBizAddress) pBizAddress.textContent = address;
    if (pBizContact) pBizContact.textContent = `Tel: ${phone} | ${email}`;
    if (pHeaderTitle) pHeaderTitle.textContent = headerTitle.toUpperCase();
    if (pCurrencySample) pCurrencySample.textContent = `${sym}350.00`;
    if (pFooterText) pFooterText.textContent = footerText;
}

function showSettingsFormMessage(message, isError = false) {
    const msgBox = document.querySelector("#settingsFormMessage");
    if (!msgBox) return;

    msgBox.style.display = "block";
    msgBox.className = `form-message ${isError ? "error" : "success"}`;
    msgBox.textContent = message;

    if (!isError) {
        setTimeout(() => {
            msgBox.style.display = "none";
        }, 4000);
    }
}

async function saveSettings(event) {
    if (event) event.preventDefault();

    const saveBtn = document.querySelector("#saveSettingsBtn");
    const payload = {
        business_name: document.querySelector("#settingBusinessName")?.value.trim(),
        currency: document.querySelector("#settingCurrency")?.value.trim(),
        phone: document.querySelector("#settingPhone")?.value.trim(),
        email: document.querySelector("#settingEmail")?.value.trim(),
        address: document.querySelector("#settingAddress")?.value.trim(),
        receipt_header: document.querySelector("#settingReceiptHeader")?.value.trim(),
        receipt_footer: document.querySelector("#settingReceiptFooter")?.value.trim()
    };

    if (!payload.business_name) {
        showSettingsFormMessage("Business Name is required.", true);
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving Settings...";
    }

    try {
        const response = await fetch(`${API_BASE}/api/settings/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to save settings.");
        }

        window.appSettings = result.data;
        showSettingsFormMessage("Business settings saved successfully!", false);
        updateSettingsLivePreview();

        if (typeof showNotification === "function") {
            showNotification("Company branding updated successfully!");
        }

    } catch (err) {
        console.error("Save settings error:", err);
        showSettingsFormMessage(err.message || "Failed to save settings.", true);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Business Settings";
        }
    }
}

// ==========================================
// RECEIPTS MODULE
// ==========================================

window.receiptsListCache = [];

async function loadReceipts() {
    const tableBody = document.querySelector("#receiptsTableBody");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <h4>Loading receipts...</h4>
                        <p>Please wait.</p>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`${API_BASE}/api/receipts/`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to load receipts.");
        }

        const receipts = result.data || [];
        window.receiptsListCache = receipts;

        // Compute KPIs
        const totalCount = receipts.length;
        const printedCount = receipts.filter(r => String(r.status || "").toUpperCase() === "PRINTED").length;
        const unprintedCount = totalCount - printedCount;
        const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const totalEl = document.querySelector("#receiptsTotalCount");
        const printedEl = document.querySelector("#receiptsPrintedCount");
        const unprintedEl = document.querySelector("#receiptsUnprintedCount");
        const amountEl = document.querySelector("#receiptsTotalAmount");

        if (totalEl) totalEl.textContent = totalCount;
        if (printedEl) printedEl.textContent = printedCount;
        if (unprintedEl) unprintedEl.textContent = unprintedCount;
        if (amountEl) amountEl.textContent = formatCurrency(totalAmount);

        filterReceipts();

    } catch (err) {
        console.error("Failed to load receipts:", err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <h4>Unable to load receipts</h4>
                            <p>${err.message || "Please check backend connection."}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

function filterReceipts() {
    const receipts = window.receiptsListCache || [];
    const searchInput = document.querySelector("#receiptSearch");
    const statusFilter = document.querySelector("#receiptStatusFilter");

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const rawStatus = statusFilter ? statusFilter.value.trim().toUpperCase() : "ALL";
    const status = (rawStatus === "ALL" || !rawStatus) ? "" : rawStatus;

    const hasActiveFilter = query.length > 0 || status.length > 0;

    const filtered = receipts.filter(r => {
        if (status && String(r.status || "").toUpperCase() !== status) {
            return false;
        }

        if (query) {
            const receiptNum = String(r.receipt_number || "").toLowerCase();
            const vendor = String(r.vendor_name || "").toLowerCase();
            const rental = String(r.rental_code || "").toLowerCase();
            const ref = String(r.reference_number || "").toLowerCase();
            const method = String(r.payment_method || "").toLowerCase();
            const amountStr = String(r.amount || "").toLowerCase();

            const match = receiptNum.includes(query) ||
                          vendor.includes(query) ||
                          rental.includes(query) ||
                          ref.includes(query) ||
                          method.includes(query) ||
                          amountStr.includes(query);

            if (!match) return false;
        }

        return true;
    });

    renderReceiptsTable(filtered, hasActiveFilter);
}

function renderReceiptsTable(list, hasActiveFilter = false) {
    const tableBody = document.querySelector("#receiptsTableBody");
    if (!tableBody) return;

    if (!list || list.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <h4>${hasActiveFilter ? "No receipts match your search" : "No receipts found"}</h4>
                        <p>${hasActiveFilter ? "Try adjusting your search query or status filter." : "Payment receipts will appear here automatically."}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = list.map(r => {
        const pDate = r.payment_date ? new Date(r.payment_date).toLocaleDateString("en-PH") : "-";
        const isPrinted = String(r.status || "").toUpperCase() === "PRINTED";
        const badgeClass = isPrinted ? "printed" : "created";
        const badgeText = isPrinted ? "Printed" : "Created";
        const printCount = Number(r.print_count || 0);

        return `
            <tr>
                <td><strong>${r.receipt_number || "-"}</strong></td>
                <td>${r.vendor_name || "-"}</td>
                <td>${r.rental_code || "-"}</td>
                <td><strong>${formatCurrency(r.amount)}</strong></td>
                <td>${r.payment_method || "-"}</td>
                <td>${pDate}</td>
                <td>${printCount}x</td>
                <td><span class="receipt-badge ${badgeClass}">${badgeText}</span></td>
                <td>
                    <button
                        type="button"
                        class="table-action receipt-btn"
                        onclick="openReceiptModal(${r.payment_id})"
                    >
                        View &amp; Print
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// PRINTABLE RECEIPT VOUCHER MODAL
// ==========================================

window.currentReceiptPaymentId = null;

async function openReceiptModal(paymentId) {
    window.currentReceiptPaymentId = paymentId;
    const modal = document.querySelector("#receiptModal");
    if (!modal) return;

    modal.style.display = "flex";

    // Set temporary placeholders
    const bizNameEl = document.querySelector("#receiptBizName");
    const bizAddrEl = document.querySelector("#receiptBizAddress");
    const bizContactEl = document.querySelector("#receiptBizContact");
    const titleTextEl = document.querySelector("#receiptTitleText");
    const numberEl = document.querySelector("#receiptNumberVal");
    const dateEl = document.querySelector("#receiptDateVal");
    const statusBadgeEl = document.querySelector("#receiptStatusBadge");
    const printCountEl = document.querySelector("#receiptPrintCountVal");
    const vendorNameEl = document.querySelector("#receiptVendorName");
    const vendorContactEl = document.querySelector("#receiptVendorContact");
    const vendorPhoneEl = document.querySelector("#receiptVendorPhone");
    const rentalCodeEl = document.querySelector("#receiptRentalCode");
    const billingCycleEl = document.querySelector("#receiptBillingCycle");
    const periodCoveredEl = document.querySelector("#receiptPeriodCovered");
    const descEl = document.querySelector("#receiptItemDescription");
    const notesEl = document.querySelector("#receiptItemNotes");
    const methodEl = document.querySelector("#receiptItemMethod");
    const refEl = document.querySelector("#receiptItemRef");
    const itemAmountEl = document.querySelector("#receiptItemAmount");
    const totalAmountEl = document.querySelector("#receiptTotalAmount");
    const footerTermsEl = document.querySelector("#receiptFooterTerms");

    if (numberEl) numberEl.textContent = "Loading...";

    try {
        const response = await fetch(`${API_BASE}/api/receipts/payment/${paymentId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to fetch receipt details.");
        }

        const { payment, receipt, settings } = result.data;
        window.appSettings = settings || window.appSettings;

        // Company Branding from Settings
        if (bizNameEl) bizNameEl.textContent = settings.business_name || "FoodCart Park & Leasing";
        if (bizAddrEl) bizAddrEl.textContent = settings.address || "";
        if (bizContactEl) bizContactEl.textContent = `Tel: ${settings.phone || ""} | ${settings.email || ""}`;
        if (titleTextEl) titleTextEl.textContent = (settings.receipt_header || "Official Rental Receipt").toUpperCase();
        if (footerTermsEl) footerTermsEl.textContent = settings.receipt_footer || "Thank you for your business! Please keep this receipt for your records.";

        // Receipt Meta
        if (numberEl) numberEl.textContent = payment.receipt_number || "-";
        if (dateEl) {
            const d = payment.payment_date ? new Date(payment.payment_date) : new Date();
            dateEl.textContent = d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
        }

        const isPrinted = String(receipt.status || "").toUpperCase() === "PRINTED";
        if (statusBadgeEl) {
            statusBadgeEl.textContent = isPrinted ? "PRINTED" : "CREATED";
            statusBadgeEl.className = `receipt-badge ${isPrinted ? "printed" : "created"}`;
        }
        if (printCountEl) printCountEl.textContent = receipt.print_count || 0;

        // Vendor & Rental
        if (vendorNameEl) vendorNameEl.textContent = payment.vendor_name || "-";
        if (vendorContactEl) vendorContactEl.textContent = `Contact: ${payment.contact_person || "-"}`;
        if (vendorPhoneEl) vendorPhoneEl.textContent = `Phone: ${payment.vendor_phone || "-"}`;
        if (rentalCodeEl) rentalCodeEl.textContent = payment.rental_code || "-";
        if (billingCycleEl) billingCycleEl.textContent = `Billing: ${payment.billing_cycle || "Monthly"}`;

        let periodText = "Period: Current cycle";
        if (payment.period_start && payment.period_end) {
            const sDate = new Date(payment.period_start);
            const eDate = new Date(payment.period_end);
            const sFormatted = !Number.isNaN(sDate.getTime()) ? sDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : payment.period_start;
            const eFormatted = !Number.isNaN(eDate.getTime()) ? eDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : payment.period_end;
            periodText = `Period: ${sFormatted} to ${eFormatted}`;
        }
        if (periodCoveredEl) periodCoveredEl.textContent = periodText;

        // Breakdown Table
        if (descEl) descEl.textContent = `Food Cart Space Rental (${payment.rental_code || "Standard"})`;
        if (notesEl) notesEl.textContent = payment.notes ? `Note: ${payment.notes}` : "Rental payment acknowledged.";
        if (methodEl) methodEl.textContent = payment.payment_method || "CASH";
        if (refEl) refEl.textContent = payment.reference_number || "None / Cash";

        const formattedAmt = formatCurrency(payment.amount);
        if (itemAmountEl) itemAmountEl.textContent = formattedAmt;
        if (totalAmountEl) totalAmountEl.textContent = formattedAmt;

    } catch (err) {
        console.error("Open receipt modal error:", err);
        if (numberEl) numberEl.textContent = "Error loading receipt";
    }
}

function closeReceiptModal() {
    const modal = document.querySelector("#receiptModal");
    if (modal) modal.style.display = "none";
}

async function triggerPrintReceipt() {
    const paymentId = window.currentReceiptPaymentId;
    if (!paymentId) {
        window.print();
        return;
    }

    const printBtn = document.querySelector("#printReceiptBtn");
    if (printBtn) {
        printBtn.disabled = true;
        printBtn.textContent = "Preparing...";
    }

    try {
        const response = await fetch(`${API_BASE}/api/receipts/print/${paymentId}`, {
            method: "POST"
        });
        const result = await response.json();

        if (response.ok && result.success) {
            const updated = result.data;
            const statusBadgeEl = document.querySelector("#receiptStatusBadge");
            const printCountEl = document.querySelector("#receiptPrintCountVal");

            if (statusBadgeEl) {
                statusBadgeEl.textContent = "PRINTED";
                statusBadgeEl.className = "receipt-badge printed";
            }
            if (printCountEl && updated) {
                printCountEl.textContent = updated.print_count;
            }

            // Refresh receipts list in background if open
            if (window.receiptsListCache && window.receiptsListCache.length > 0) {
                loadReceipts();
            }
        }
    } catch (err) {
        console.warn("Could not update print count on server:", err);
    } finally {
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.textContent = "🖨️ Print Receipt";
        }
        window.print();
    }
}

window.loadSettings = loadSettings;
window.updateSettingsLivePreview = updateSettingsLivePreview;
window.saveSettings = saveSettings;
window.loadReceipts = loadReceipts;
window.filterReceipts = filterReceipts;
window.openReceiptModal = openReceiptModal;
window.closeReceiptModal = closeReceiptModal;
window.triggerPrintReceipt = triggerPrintReceipt;



