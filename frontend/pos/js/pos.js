// ===================================================
// FOODCART STALL POS - CLIENT LOGIC (PHONE & TABLET)
// ===================================================

const API_BASE = window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

let state = {
    stalls: [],
    currentVendorId: null,
    currentStall: null,
    menuItems: [],
    categories: ["All"],
    activeCategory: "All",
    searchTerm: "",
    cart: [],
    orderType: "DINE_IN",
    paymentMethod: "CASH",
    cashTendered: 0,
    currency: "PHP",
    activeView: "menu", // 'menu' or 'queue'
    queueOrders: []
};

// ===================================================
// INITIALIZATION
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
    initPos();
});

async function initPos() {
    await loadStalls();
    
    // Check if user is logged in as a vendor to auto-select their stall
    const rawUser = localStorage.getItem("foodcart_user");
    if (rawUser) {
        try {
            const user = JSON.parse(rawUser);
            if (user.role === "VENDOR" && user.vendor_id) {
                const found = state.stalls.find(s => s.id === user.vendor_id);
                if (found) {
                    state.currentVendorId = found.id;
                    const selector = document.querySelector("#stallSelector");
                    if (selector) selector.value = String(found.id);
                }
            }
        } catch (e) {}
    }

    if (!state.currentVendorId && state.stalls.length > 0) {
        state.currentVendorId = state.stalls[0].id;
    }

    updateStallHeader();
    if (state.currentVendorId) {
        await loadMenu(state.currentVendorId);
        loadQueueCount();
    }
}

// ===================================================
// STALL SWITCHING
// ===================================================
async function loadStalls() {
    try {
        const res = await fetch(`${API_BASE}/api/pos/stalls`);
        const json = await res.json();
        if (json.success && json.data) {
            state.stalls = json.data;
            const selectEl = document.querySelector("#stallSelector");
            if (selectEl) {
                selectEl.innerHTML = state.stalls.map(s => `
                    <option value="${s.id}">${s.business_name} (${s.cart_name || s.vendor_code})</option>
                `).join("");
            }
        }
    } catch (err) {
        console.error("Error loading stalls:", err);
    }
}

function onStallChanged() {
    const selectEl = document.querySelector("#stallSelector");
    if (!selectEl) return;
    const newId = parseInt(selectEl.value);
    if (newId && newId !== state.currentVendorId) {
        state.currentVendorId = newId;
        state.cart = []; // Clear cart on stall switch
        updateStallHeader();
        loadMenu(state.currentVendorId);
        renderCart();
        loadQueueCount();
    }
}

function updateStallHeader() {
    const stall = state.stalls.find(s => s.id === state.currentVendorId);
    state.currentStall = stall;
    const subtextEl = document.querySelector("#stallSubtext");
    const iconEl = document.querySelector("#stallIcon");

    if (stall) {
        if (subtextEl) {
            subtextEl.textContent = `${stall.cart_name || stall.vendor_code} • ${stall.space_name || 'Active Stall'}`;
        }
        // Match emoji based on stall name
        if (iconEl) {
            const name = (stall.business_name || "").toLowerCase();
            if (name.includes("tako")) iconEl.textContent = "🐙";
            else if (name.includes("grill") || name.includes("bbq")) iconEl.textContent = "🍢";
            else if (name.includes("boba") || name.includes("tea")) iconEl.textContent = "🧋";
            else if (name.includes("burger")) iconEl.textContent = "🍔";
            else iconEl.textContent = "🍲";
        }
    }
}

// ===================================================
// MENU LOADING & RENDERING
// ===================================================
async function loadMenu(vendorId) {
    const gridEl = document.querySelector("#menuGrid");
    if (gridEl) {
        gridEl.innerHTML = `<div class="grid-placeholder"><div class="spinner"></div><p>Loading menu...</p></div>`;
    }

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${vendorId}`);
        const json = await res.json();
        if (json.success && json.data) {
            state.menuItems = json.data.items || [];
            state.categories = json.data.categories || ["All"];
            renderCategories();
            renderMenu();
        } else {
            if (gridEl) gridEl.innerHTML = `<p style="padding:20px;color:#888;">No menu items found for this stall.</p>`;
        }
    } catch (err) {
        console.error("Error loading menu:", err);
        if (gridEl) gridEl.innerHTML = `<p style="padding:20px;color:#c00;">Failed to load menu items.</p>`;
    }
}

function renderCategories() {
    const barEl = document.querySelector("#categoriesBar");
    if (!barEl) return;

    barEl.innerHTML = state.categories.map(cat => `
        <button type="button" class="cat-pill ${cat === state.activeCategory ? 'active' : ''}" 
            onclick="filterCategory('${cat.replace(/'/g, "\\'")}')">
            ${cat === 'All' ? 'All Items' : cat}
        </button>
    `).join("");
}

function filterCategory(cat) {
    state.activeCategory = cat;
    renderCategories();
    renderMenu();
}

function onSearchChanged() {
    const input = document.querySelector("#searchInput");
    const clearBtn = document.querySelector("#clearSearchBtn");
    state.searchTerm = (input ? input.value : "").trim().toLowerCase();
    if (clearBtn) clearBtn.style.display = state.searchTerm ? "block" : "none";
    renderMenu();
}

function clearSearch() {
    const input = document.querySelector("#searchInput");
    const clearBtn = document.querySelector("#clearSearchBtn");
    if (input) input.value = "";
    if (clearBtn) clearBtn.style.display = "none";
    state.searchTerm = "";
    renderMenu();
}

function renderMenu() {
    const gridEl = document.querySelector("#menuGrid");
    if (!gridEl) return;

    let items = state.menuItems;

    if (state.activeCategory !== "All") {
        items = items.filter(i => i.category === state.activeCategory);
    }

    if (state.searchTerm) {
        items = items.filter(i => 
            (i.name && i.name.toLowerCase().includes(state.searchTerm)) ||
            (i.description && i.description.toLowerCase().includes(state.searchTerm))
        );
    }

    if (items.length === 0) {
        gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px 20px; color: #888;">
                <p style="font-size: 16px; font-weight: 700;">No matching food items</p>
                <small>Try selecting a different category, clearing search, or adding new items via Stock / Menu</small>
            </div>
        `;
        return;
    }

    gridEl.innerHTML = items.map(item => {
        const inCartItem = state.cart.find(c => c.menu_item_id === item.id);
        const qtyInCart = inCartItem ? inCartItem.quantity : 0;
        const hasCart = qtyInCart > 0;

        const trackInv = item.track_inventory === 1 || item.track_inventory === true;
        const stockQty = (item.stock_quantity !== undefined && item.stock_quantity !== null) ? Number(item.stock_quantity) : 50;
        const threshold = Number(item.low_stock_threshold || 5);
        const isOutOfStock = trackInv && stockQty <= 0;
        const isLowStock = trackInv && !isOutOfStock && stockQty <= threshold;

        let stockBadgeHtml = "";
        if (trackInv) {
            if (isOutOfStock) {
                stockBadgeHtml = `<span class="stock-tag out-of-stock">&#128683; Out of stock</span>`;
            } else if (isLowStock) {
                stockBadgeHtml = `<span class="stock-tag low-stock">&#9888; ${stockQty} left</span>`;
            } else {
                stockBadgeHtml = `<span class="stock-tag in-stock">&#128230; ${stockQty} left</span>`;
            }
        }

        const clickHandler = isOutOfStock
            ? `showToastNotification('🚫 &quot;${item.name.replace(/'/g, "\\'")}&quot; is currently out of stock!')`
            : `addToCartById(${item.id})`;

        return `
            <div class="item-card ${hasCart ? 'has-in-cart' : ''} ${isOutOfStock ? 'is-out-of-stock' : ''}" onclick="${clickHandler}">
                <div class="card-top">
                    <span class="item-emoji">${item.image_emoji || '🍲'}</span>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                        ${hasCart ? `<span class="in-cart-badge">${qtyInCart} in cart</span>` : ''}
                        ${stockBadgeHtml}
                    </div>
                </div>
                <div class="card-middle">
                    <div class="item-name">${item.name}</div>
                    ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                </div>
                <div class="card-bottom">
                    <span class="item-price">${formatCurrency(item.price)}</span>
                    <button type="button" class="add-plus-btn" title="${isOutOfStock ? 'Out of Stock' : 'Add to Order'}" ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? '✕' : '+'}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function addToCartById(itemId) {
    const item = state.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const trackInv = item.track_inventory === 1 || item.track_inventory === true;
    const stockQty = (item.stock_quantity !== undefined && item.stock_quantity !== null) ? Number(item.stock_quantity) : 50;

    if (trackInv && stockQty <= 0) {
        showToastNotification(`🚫 "${item.name}" is out of stock!`);
        return;
    }

    const existing = state.cart.find(c => c.menu_item_id === item.id);
    const currentQty = existing ? existing.quantity : 0;

    if (trackInv && currentQty + 1 > stockQty) {
        showToastNotification(`⚠️ Only ${stockQty} available for "${item.name}"!`);
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
            menu_item_id: item.id,
            item_name: item.name,
            unit_price: parseFloat(item.price),
            quantity: 1,
            image_emoji: item.image_emoji || '🍲',
            special_instructions: ""
        });
    }

    renderCart();
    renderMenu(); // Updates in-cart badges
}

// ===================================================
// CART MANAGEMENT & ORDER TICKET
// ===================================================
function changeItemQty(itemId, delta) {
    const item = state.cart.find(c => c.menu_item_id === itemId);
    if (!item) return;

    if (delta > 0) {
        const menuItem = state.menuItems.find(i => i.id === itemId);
        if (menuItem && (menuItem.track_inventory === 1 || menuItem.track_inventory === true)) {
            const stockQty = (menuItem.stock_quantity !== undefined && menuItem.stock_quantity !== null) ? Number(menuItem.stock_quantity) : 50;
            if (item.quantity + delta > stockQty) {
                showToastNotification(`⚠️ Max available stock (${stockQty}) reached for "${item.item_name}"!`);
                return;
            }
        }
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart = state.cart.filter(c => c.menu_item_id !== itemId);
    }

    renderCart();
    renderMenu();
}

function clearCart() {
    if (state.cart.length === 0) return;
    if (confirm("Clear all items from this order?")) {
        state.cart = [];
        renderCart();
        renderMenu();
    }
}

function getCartTotals() {
    const subtotal = state.cart.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    const discount = 0; // Can be extended
    const total = Math.max(0, subtotal - discount);
    const totalCount = state.cart.reduce((sum, it) => sum + it.quantity, 0);
    return { subtotal, discount, total, totalCount };
}

function renderCart() {
    const listEl = document.querySelector("#ticketItemsList");
    const subtotalEl = document.querySelector("#ticketSubtotal");
    const totalEl = document.querySelector("#ticketTotal");
    const checkoutTotalEl = document.querySelector("#checkoutBtnTotal");
    const clearBtn = document.querySelector("#clearCartBtn");
    const checkoutBtn = document.querySelector("#checkoutBtn");

    // Mobile bar elements
    const barCountEl = document.querySelector("#mobileBarCount");
    const barTotalEl = document.querySelector("#mobileBarTotal");
    const barTypeEl = document.querySelector("#mobileBarType");

    const { subtotal, discount, total, totalCount } = getCartTotals();

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatCurrency(total);

    if (clearBtn) clearBtn.disabled = state.cart.length === 0;
    if (checkoutBtn) checkoutBtn.disabled = state.cart.length === 0;

    // Update mobile floating bar
    if (barCountEl) barCountEl.textContent = totalCount;
    if (barTotalEl) barTotalEl.textContent = formatCurrency(total);
    if (barTypeEl) barTypeEl.textContent = state.orderType === "DINE_IN" ? "Dine In" : "Takeout";

    if (!listEl) return;

    if (state.cart.length === 0) {
        listEl.innerHTML = `
            <div class="empty-ticket">
                <span class="empty-icon">&#128722;</span>
                <p>No items added yet</p>
                <small>Tap menu items to add them</small>
            </div>
        `;
        return;
    }

    listEl.innerHTML = state.cart.map(it => `
        <div class="ticket-item-row">
            <div class="t-info">
                <div class="t-name">${it.image_emoji} ${it.item_name}</div>
                <div class="t-price">${formatCurrency(it.unit_price)} each</div>
            </div>
            <div class="t-controls">
                <button type="button" class="qty-btn" onclick="changeItemQty(${it.menu_item_id}, -1)">-</button>
                <span class="t-qty">${it.quantity}</span>
                <button type="button" class="qty-btn" onclick="changeItemQty(${it.menu_item_id}, 1)">+</button>
            </div>
            <div class="t-subtotal">
                ${formatCurrency(it.unit_price * it.quantity)}
            </div>
        </div>
    `).join("");
}

function setOrderType(type) {
    state.orderType = type;
    const btnDine = document.querySelector("#typeDineIn");
    const btnTake = document.querySelector("#typeTakeout");
    if (btnDine) btnDine.className = `type-pill ${type === 'DINE_IN' ? 'active' : ''}`;
    if (btnTake) btnTake.className = `type-pill ${type === 'TAKEOUT' ? 'active' : ''}`;
    renderCart();
}

// Drawer Controls for Mobile
function openCartDrawer() {
    const drawer = document.querySelector("#ticketDrawer");
    if (drawer) drawer.classList.add("drawer-open");
}

function closeCartDrawer() {
    const drawer = document.querySelector("#ticketDrawer");
    if (drawer) drawer.classList.remove("drawer-open");
}

// ===================================================
// CHECKOUT & PAYMENT MODAL
// ===================================================
function openCheckoutModal() {
    if (state.cart.length === 0) return;
    const modal = document.querySelector("#checkoutModal");
    const totalDueEl = document.querySelector("#modalTotalDue");
    const { total } = getCartTotals();

    if (totalDueEl) totalDueEl.textContent = formatCurrency(total);
    state.cashTendered = total;

    const cashInput = document.querySelector("#cashTenderedInput");
    if (cashInput) cashInput.value = total;

    selectPaymentMethod("CASH");
    updateChangeDisplay();
    if (modal) modal.style.display = "flex";
}

function closeCheckoutModal() {
    const modal = document.querySelector("#checkoutModal");
    if (modal) modal.style.display = "none";
}

function selectPaymentMethod(method) {
    state.paymentMethod = method;
    const btnCash = document.querySelector("#methodCash");
    const btnGcash = document.querySelector("#methodGcash");
    const btnMaya = document.querySelector("#methodMaya");
    const cashSec = document.querySelector("#cashSection");
    const digSec = document.querySelector("#digitalSection");

    if (btnCash) btnCash.className = `method-btn ${method === 'CASH' ? 'active' : ''}`;
    if (btnGcash) btnGcash.className = `method-btn ${method === 'GCASH' ? 'active' : ''}`;
    if (btnMaya) btnMaya.className = `method-btn ${method === 'MAYA' ? 'active' : ''}`;

    if (cashSec) cashSec.style.display = method === 'CASH' ? 'flex' : 'none';
    if (digSec) digSec.style.display = method !== 'CASH' ? 'flex' : 'none';

    updateChangeDisplay();
}

function onCashInputChanged() {
    const input = document.querySelector("#cashTenderedInput");
    state.cashTendered = parseFloat(input ? input.value : 0) || 0;
    updateChangeDisplay();
}

function setExactCash() {
    const { total } = getCartTotals();
    state.cashTendered = total;
    const input = document.querySelector("#cashTenderedInput");
    if (input) input.value = total;
    updateChangeDisplay();
}

function addPresetCash(val) {
    const { total } = getCartTotals();
    state.cashTendered = Math.ceil(total / val) * val;
    if (state.cashTendered === total) state.cashTendered += val;
    const input = document.querySelector("#cashTenderedInput");
    if (input) input.value = state.cashTendered;
    updateChangeDisplay();
}

function setPresetValue(val) {
    state.cashTendered = val;
    const input = document.querySelector("#cashTenderedInput");
    if (input) input.value = val;
    updateChangeDisplay();
}

function updateChangeDisplay() {
    const changeEl = document.querySelector("#changeAmount");
    const { total } = getCartTotals();
    let change = 0;
    if (state.paymentMethod === "CASH") {
        change = Math.max(0, state.cashTendered - total);
    }
    if (changeEl) changeEl.textContent = formatCurrency(change);
}

// ===================================================
// SUBMIT ORDER TO BACKEND
// ===================================================
async function submitOrder() {
    const btn = document.querySelector("#confirmOrderBtn");
    const custInput = document.querySelector("#customerNameInput");
    const notesInput = document.querySelector("#orderNotesInput");
    const refInput = document.querySelector("#refNumberInput");

    const { total } = getCartTotals();

    if (state.paymentMethod === "CASH" && state.cashTendered < total) {
        alert(`Cash tendered (${formatCurrency(state.cashTendered)}) is less than total due (${formatCurrency(total)})!`);
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Processing Order...";
    }

    const payload = {
        vendor_id: state.currentVendorId,
        cart_id: state.currentStall ? state.currentStall.cart_id : null,
        customer_name: (custInput ? custInput.value.trim() : "") || "Walk-in Customer",
        order_type: state.orderType,
        payment_method: state.paymentMethod,
        cash_tendered: state.cashTendered,
        notes: (notesInput ? notesInput.value.trim() : "") + 
               (refInput && refInput.value ? ` [Ref: ${refInput.value.trim()}]` : ""),
        items: state.cart.map(it => ({
            menu_item_id: it.menu_item_id,
            item_name: it.item_name,
            unit_price: it.unit_price,
            quantity: it.quantity,
            special_instructions: it.special_instructions
        }))
    };

    try {
        const res = await fetch(`${API_BASE}/api/pos/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (res.ok && json.success && json.data) {
            closeCheckoutModal();
            closeCartDrawer();
            showReceiptSlip(json.data);

            // Reset cart
            state.cart = [];
            if (custInput) custInput.value = "";
            if (notesInput) notesInput.value = "";
            if (refInput) refInput.value = "";
            renderCart();
            
            // Immediately reload menu from database to reflect decremented inventory
            if (state.currentVendorId) {
                await loadMenu(state.currentVendorId);
            }
            loadQueueCount();
        } else {
            alert(json.error || "Failed to process order.");
        }
    } catch (err) {
        console.error("Order submission error:", err);
        alert("Network error: Could not submit order.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "✔ Complete & Print Slip";
        }
    }
}

// ===================================================
// DIGITAL RECEIPT & KITCHEN SLIP MODAL
// ===================================================
function showReceiptSlip(order) {
    const modal = document.querySelector("#receiptSlipModal");
    const stallNameEl = document.querySelector("#slipStallName");
    const shortNumEl = document.querySelector("#slipShortNum");
    const fullNumEl = document.querySelector("#slipFullOrderNum");
    const typeEl = document.querySelector("#slipOrderType");
    const custEl = document.querySelector("#slipCustomer");
    const dateEl = document.querySelector("#slipDate");
    const itemsListEl = document.querySelector("#slipItemsList");
    const subtotalEl = document.querySelector("#slipSubtotal");
    const totalEl = document.querySelector("#slipTotal");
    const methodEl = document.querySelector("#slipMethod");
    const tenderedEl = document.querySelector("#slipTendered");
    const changeEl = document.querySelector("#slipChange");

    if (stallNameEl) stallNameEl.textContent = order.stall_name || "Food Stall";
    const shortNum = order.order_number ? `#${order.order_number.slice(-3)}` : `#${order.order_id}`;
    if (shortNumEl) shortNumEl.textContent = shortNum;
    if (fullNumEl) fullNumEl.textContent = order.order_number;
    if (typeEl) typeEl.textContent = order.order_type === "DINE_IN" ? "DINE IN" : "TAKEOUT";
    if (custEl) custEl.textContent = `Customer: ${order.customer_name || 'Walk-in'}`;
    
    const d = new Date(order.created_at || Date.now());
    if (dateEl) dateEl.textContent = d.toLocaleString();

    if (itemsListEl && order.items) {
        itemsListEl.innerHTML = order.items.map(it => `
            <div class="slip-item-row">
                <span class="si-name">${it.quantity}x ${it.item_name}</span>
                <span class="si-price">${formatCurrency(it.subtotal || (it.unit_price * it.quantity))}</span>
            </div>
        `).join("");
    }

    if (subtotalEl) subtotalEl.textContent = formatCurrency(order.subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(order.total_amount);
    if (methodEl) methodEl.textContent = order.payment_method;
    if (tenderedEl) tenderedEl.textContent = formatCurrency(order.cash_tendered);
    if (changeEl) changeEl.textContent = formatCurrency(order.change_amount);

    if (modal) modal.style.display = "flex";
}

function closeReceiptSlipModal() {
    const modal = document.querySelector("#receiptSlipModal");
    if (modal) modal.style.display = "none";
}

// ===================================================
// KITCHEN ORDERS QUEUE VIEW
// ===================================================
function switchView(view) {
    state.activeView = view;
    const btnMenu = document.querySelector("#tabMenuBtn");
    const btnQueue = document.querySelector("#tabQueueBtn");
    const menuView = document.querySelector("#menuView");
    const queueView = document.querySelector("#queueView");

    if (btnMenu) btnMenu.className = `segment-btn ${view === 'menu' ? 'active' : ''}`;
    if (btnQueue) btnQueue.className = `segment-btn ${view === 'queue' ? 'active' : ''}`;

    if (menuView) menuView.style.display = view === 'menu' ? 'flex' : 'none';
    if (queueView) queueView.style.display = view === 'queue' ? 'flex' : 'none';

    if (view === 'queue') {
        loadStallOrders();
    }
}

async function loadQueueCount() {
    if (!state.currentVendorId) return;
    try {
        const res = await fetch(`${API_BASE}/api/pos/summary/${state.currentVendorId}`);
        const json = await res.json();
        if (json.success && json.data && json.data.kpi) {
            const badge = document.querySelector("#queueCountBadge");
            if (badge) badge.textContent = json.data.kpi.active_orders || 0;
        }
    } catch (e) {}
}

async function loadStallOrders() {
    const grid = document.querySelector("#queueOrdersGrid");
    if (grid) grid.innerHTML = `<p style="padding:20px;">Loading active orders...</p>`;

    try {
        const res = await fetch(`${API_BASE}/api/pos/orders/${state.currentVendorId}?limit=25`);
        const json = await res.json();
        if (json.success && json.data) {
            state.queueOrders = json.data;
            renderQueueOrders();
        }
    } catch (err) {
        console.error("Queue loading error:", err);
    }
}

function renderQueueOrders() {
    const grid = document.querySelector("#queueOrdersGrid");
    if (!grid) return;

    if (state.queueOrders.length === 0) {
        grid.innerHTML = `<p style="padding:30px;color:#888;">No orders recorded for this stall today.</p>`;
        return;
    }

    grid.innerHTML = state.queueOrders.map(ord => {
        const shortNum = ord.order_number ? `#${ord.order_number.slice(-3)}` : `#${ord.id}`;
        const itemsHtml = (ord.items || []).map(it => `
            <div class="queue-item-row">
                <span><strong>${it.quantity}x</strong> ${it.item_name}</span>
                <span>${formatCurrency(it.subtotal)}</span>
            </div>
        `).join("");

        let actionBtnHtml = '';
        if (ord.status === 'PREPARING') {
            actionBtnHtml = `<button type="button" class="queue-btn" onclick="updateOrderStatus(${ord.id}, 'READY')">Mark as READY ✔</button>`;
        } else if (ord.status === 'READY') {
            actionBtnHtml = `<button type="button" class="queue-btn" style="background:#059669;" onclick="updateOrderStatus(${ord.id}, 'COMPLETED')">Mark as COMPLETED ✔</button>`;
        } else {
            actionBtnHtml = `<button type="button" class="queue-btn" style="background:#555;" onclick="reprintSlip(${ord.id})">Reprint Slip 🖨️</button>`;
        }

        return `
            <div class="queue-card">
                <div class="queue-card-header">
                    <span class="queue-num">${shortNum}</span>
                    <span class="queue-badge ${ord.status}">${ord.status}</span>
                </div>
                <div style="font-size:11px;color:#888;margin-bottom:8px;">
                    ${ord.order_type} • ${ord.customer_name} • ${new Date(ord.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div class="queue-items-list">
                    ${itemsHtml}
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:800;font-size:14px;color:var(--primary);">
                    <span>Total:</span>
                    <span>${formatCurrency(ord.total_amount)}</span>
                </div>
                ${actionBtnHtml}
            </div>
        `;
    }).join("");
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${API_BASE}/api/pos/orders/${orderId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadStallOrders();
            loadQueueCount();
        }
    } catch (e) {
        console.error("Status update error:", e);
    }
}

function reprintSlip(orderId) {
    const order = state.queueOrders.find(o => o.id === orderId);
    if (order) {
        showReceiptSlip({
            ...order,
            stall_name: state.currentStall ? state.currentStall.business_name : "Food Stall"
        });
    }
}

// Currency Helper
function formatCurrency(val) {
    return "₱" + Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===================================================
// STALL INVENTORY & MENU MANAGEMENT (SELF-SERVICE)
// ===================================================

let stockSearchTerm = "";

function openStockModal() {
    const modal = document.querySelector("#stockMgmtModal");
    if (!modal) return;

    const titleEl = document.querySelector("#stockModalTitle");
    const subEl = document.querySelector("#stockModalSub");
    if (state.currentStall) {
        if (titleEl) titleEl.textContent = `${state.currentStall.business_name} - Inventory & Menu`;
        if (subEl) subEl.textContent = `Live stock monitoring for ${state.currentStall.cart_name || state.currentStall.vendor_code}`;
    }

    // Populate category datalist in Add Item form
    const datalist = document.querySelector("#categoryDatalist");
    if (datalist) {
        const uniqueCats = state.categories.filter(c => c !== "All");
        datalist.innerHTML = uniqueCats.map(c => `<option value="${c}"></option>`).join("");
    }

    switchStockTab("list");
    renderStockList();
    modal.style.display = "flex";
}

function closeStockModal() {
    const modal = document.querySelector("#stockMgmtModal");
    if (modal) modal.style.display = "none";
}

function switchStockTab(tab) {
    const listTab = document.querySelector("#stockListTab");
    const addTab = document.querySelector("#stockAddTab");
    const btnList = document.querySelector("#stockTabListBtn");
    const btnAdd = document.querySelector("#stockTabAddBtn");

    if (btnList) btnList.className = `stock-tab-btn ${tab === 'list' ? 'active' : ''}`;
    if (btnAdd) btnAdd.className = `stock-tab-btn ${tab === 'add' ? 'active' : ''}`;

    if (listTab) listTab.style.display = tab === 'list' ? 'block' : 'none';
    if (addTab) addTab.style.display = tab === 'add' ? 'block' : 'none';

    if (tab === 'list') {
        renderStockList();
    }
}

function onStockSearchChanged() {
    const input = document.querySelector("#stockSearchInput");
    stockSearchTerm = (input ? input.value : "").trim().toLowerCase();
    renderStockList();
}

function renderStockList() {
    const container = document.querySelector("#stockItemsScroll");
    const countBadge = document.querySelector("#stockItemCount");
    if (!container) return;

    let items = state.menuItems || [];
    if (countBadge) countBadge.textContent = items.length;

    if (stockSearchTerm) {
        items = items.filter(i => 
            (i.name && i.name.toLowerCase().includes(stockSearchTerm)) ||
            (i.category && i.category.toLowerCase().includes(stockSearchTerm))
        );
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px 10px;color:#888;">
                <p style="font-weight:700;font-size:14px;color:var(--text-main);">No items found</p>
                <small>Switch to "Add Food Item" above to add new items to your stall!</small>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(it => {
        const stock = Number(it.stock_quantity || 0);
        const threshold = Number(it.low_stock_threshold || 5);
        let badgeClass = "in-stock";
        let badgeText = `In Stock (${stock})`;

        if (stock <= 0) {
            badgeClass = "out-of-stock";
            badgeText = `Out of Stock (0)`;
        } else if (stock <= threshold) {
            badgeClass = "low-stock";
            badgeText = `⚠️ Low Stock (${stock})`;
        }

        return `
            <div class="stock-item-row">
                <div class="stock-item-info">
                    <span class="stock-item-emoji">${it.image_emoji || '🍲'}</span>
                    <div class="stock-item-details">
                        <div class="stock-item-title">${it.name}</div>
                        <div class="stock-item-meta">
                            <span>${it.category || 'General'}</span>
                            <span>•</span>
                            <strong style="color:var(--primary);">${formatCurrency(it.price)}</strong>
                            <span>•</span>
                            <span class="stock-tag ${badgeClass}">${badgeText}</span>
                        </div>
                    </div>
                </div>

                <div class="stock-actions">
                    <button type="button" class="restock-btn" onclick="quickRestock(${it.id}, 10)" title="Add 10 units to stock">+10</button>
                    <button type="button" class="restock-btn" onclick="quickRestock(${it.id}, 25)" title="Add 25 units to stock">+25</button>
                    <button type="button" class="restock-btn" onclick="promptSetStock(${it.id}, ${stock})" title="Set exact stock count">Set</button>
                    <button type="button" class="restock-btn delete-item" onclick="deleteStallItem(${it.id}, '${it.name.replace(/'/g, "\\'")}')" title="Delete menu item">🗑</button>
                </div>
            </div>
        `;
    }).join("");
}

async function quickRestock(itemId, amount) {
    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${itemId}/adjust-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adjustment: amount })
        });
        const json = await res.json();
        if (res.ok && json.success) {
            showToastNotification(`📦 Restocked +${amount}! New stock: ${json.data.stock_quantity}`);
            if (state.currentVendorId) {
                await loadMenu(state.currentVendorId);
            }
            renderStockList();
        } else {
            alert(json.error || "Failed to update stock.");
        }
    } catch (err) {
        console.error("Restock error:", err);
        alert("Network error: Could not update stock.");
    }
}

async function promptSetStock(itemId, currentStock) {
    const item = state.menuItems.find(i => i.id === itemId);
    const itemName = item ? item.name : "item";
    const input = prompt(`Enter new exact inventory stock count for "${itemName}":`, currentStock);
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
            showToastNotification(`📦 Stock updated to ${newStock} for "${itemName}"`);
            if (state.currentVendorId) {
                await loadMenu(state.currentVendorId);
            }
            renderStockList();
        } else {
            alert(json.error || "Failed to update stock.");
        }
    } catch (err) {
        console.error("Set stock error:", err);
        alert("Network error: Could not set stock.");
    }
}

function selectItemEmoji(btnEl, emoji) {
    const hidden = document.querySelector("#newItemEmoji");
    if (hidden) hidden.value = emoji;

    document.querySelectorAll(".emoji-opt").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
}

async function handleAddNewItem(event) {
    event.preventDefault();
    if (!state.currentVendorId) {
        alert("Please select an active stall first.");
        return;
    }

    const saveBtn = document.querySelector("#saveItemBtn");
    const nameInput = document.querySelector("#newItemName");
    const catInput = document.querySelector("#newItemCategory");
    const priceInput = document.querySelector("#newItemPrice");
    const costInput = document.querySelector("#newItemCost");
    const stockInput = document.querySelector("#newItemStock");
    const lowStockInput = document.querySelector("#newItemLowStock");
    const descInput = document.querySelector("#newItemDesc");
    const emojiInput = document.querySelector("#newItemEmoji");

    const payload = {
        vendor_id: state.currentVendorId,
        name: nameInput ? nameInput.value.trim() : "",
        category: catInput ? catInput.value.trim() : "General",
        price: parseFloat(priceInput ? priceInput.value : 0) || 0,
        cost: parseFloat(costInput && costInput.value ? costInput.value : 0) || 0,
        stock_quantity: parseInt(stockInput ? stockInput.value : 50) || 50,
        low_stock_threshold: parseInt(lowStockInput ? lowStockInput.value : 5) || 5,
        description: descInput ? descInput.value.trim() : "",
        image_emoji: emojiInput ? emojiInput.value : "🍲",
        track_inventory: true
    };

    if (!payload.name) {
        alert("Please enter a food item name.");
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
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (res.ok && json.success) {
            showToastNotification(`✅ "${payload.name}" added to stall menu!`);
            // Reset form
            if (nameInput) nameInput.value = "";
            if (priceInput) priceInput.value = "";
            if (costInput) costInput.value = "";
            if (descInput) descInput.value = "";
            if (stockInput) stockInput.value = "50";
            if (lowStockInput) lowStockInput.value = "5";

            // Reload menu and switch to list tab
            await loadMenu(state.currentVendorId);
            switchStockTab("list");
        } else {
            alert(json.error || "Failed to add food item.");
        }
    } catch (err) {
        console.error("Add item error:", err);
        alert("Network error: Could not add food item.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "➕ Add Item to Stall";
        }
    }
}

async function deleteStallItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to remove "${itemName}" from your stall menu?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/pos/menu/${itemId}`, {
            method: "DELETE"
        });
        const json = await res.json();
        if (res.ok && json.success) {
            showToastNotification(`🗑️ "${itemName}" removed from menu.`);
            if (state.currentVendorId) {
                await loadMenu(state.currentVendorId);
            }
            renderStockList();
        } else {
            alert(json.error || "Failed to delete item.");
        }
    } catch (err) {
        console.error("Delete item error:", err);
        alert("Network error: Could not delete item.");
    }
}

let toastTimer = null;
function showToastNotification(msg) {
    const toast = document.querySelector("#toastNotice");
    if (!toast) return;

    toast.innerHTML = msg;
    toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// Window exports for HTML onclick handlers
window.openStockModal = openStockModal;
window.closeStockModal = closeStockModal;
window.switchStockTab = switchStockTab;
window.onStockSearchChanged = onStockSearchChanged;
window.quickRestock = quickRestock;
window.promptSetStock = promptSetStock;
window.selectItemEmoji = selectItemEmoji;
window.handleAddNewItem = handleAddNewItem;
window.deleteStallItem = deleteStallItem;
window.showToastNotification = showToastNotification;
