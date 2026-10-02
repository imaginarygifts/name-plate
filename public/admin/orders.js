/* =========================================================
   IMAGINARY GIFTS
   ADMIN ORDERS
========================================================= */

const state = {
    orders: [],
    selected: new Set(),
    expanded: new Set(),
    editingId: null
};


/* =========================================================
   DOM
========================================================= */

const ordersList =
    document.getElementById("ordersList");

const orderCount =
    document.getElementById("orderCount");

const selectedCount =
    document.getElementById("selectedCount");

const selectAll =
    document.getElementById("selectAll");

const orderFilter =
    document.getElementById("orderFilter");

const paymentFilter =
    document.getElementById("paymentFilter");

const bulkOrderStatus =
    document.getElementById("bulkOrderStatus");

const bulkPaymentStatus =
    document.getElementById("bulkPaymentStatus");

const editModal =
    document.getElementById("editModal");

const editForm =
    document.getElementById("editForm");

const toast =
    document.getElementById("toast");


/* =========================================================
   STATUS LABELS
========================================================= */

function orderStatusLabel(status) {

    const map = {
        pending: "Pending",
        confirmed: "Confirmed",
        in_progress: "In Progress",
        complete: "Complete",
        delivered: "Delivered",
        cancelled: "Cancelled"
    };

    return (
        map[status] ||
        status ||
        "Pending"
    );
}


function paymentStatusLabel(status) {

    const map = {
        pending: "Pending",
        paid: "Paid",
        refund: "Refund"
    };

    return (
        map[status] ||
        status ||
        "Pending"
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MONEY
========================================================= */

function money(value) {

    const number =
        Number(value || 0);

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   DATE
========================================================= */

function formatDate(timestamp) {

    if (!timestamp) {
        return "";
    }

    try {

        return new Date(
            Number(timestamp)
        ).toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch {

        return "";

    }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(
    message,
    error = false
) {

    clearTimeout(toastTimer);

    toast.textContent =
        message;

    toast.style.borderColor =
        error
            ? "rgba(255,82,99,.4)"
            : "rgba(255,255,255,.09)";

    toast.classList.add("show");

    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove("show");
            },
            2600
        );
}


/* =========================================================
   API
========================================================= */

async function api(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                credentials: "include",

                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (
        response.status === 401
    ) {

        window.location.href =
            "/admin/";

        throw new Error(
            "Admin authentication required."
        );
    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Request failed."
        );
    }


    return data;
}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders() {

    ordersList.innerHTML = `

        <div class="loading-box">

            <div class="loader"></div>

            <p>
                Loading orders...
            </p>

        </div>

    `;


    try {

        const data =
            await api(
                "/api/admin/orders"
            );


        state.orders =
            Array.isArray(data)
                ? data
                : [];


        state.orders =
            state.orders.map(
                normalizeOrder
            );


        renderOrders();


    } catch (error) {

        console.error(error);


        ordersList.innerHTML = `

            <div class="empty-box">

                <p>
                    ${esc(
                        error.message ||
                        "Unable to load orders."
                    )}
                </p>

                <button
                    type="button"
                    class="gradient-button"
                    onclick="loadOrders()"
                >
                    Try Again
                </button>

            </div>

        `;
    }
}


/* =========================================================
   NORMALIZE ORDER
========================================================= */

function normalizeOrder(order) {

    const copy = {
        ...order
    };


    /*
     * Old status names
     */

    if (
        copy.status === "new"
    ) {

        copy.status =
            "pending";
    }


    if (
        copy.status === "processing"
    ) {

        copy.status =
            "in_progress";
    }


    if (
        copy.status === "shipped"
    ) {

        copy.status =
            "complete";
    }


    if (
        !copy.payment_status
    ) {

        copy.payment_status =
            "pending";
    }


    /*
     * Parse JSON if Worker has not
     * already parsed it.
     */

    copy.variants =
        parseObject(
            copy.variants,
            copy.variants_json
        );


    copy.selections =
        parseObject(
            copy.selections,
            copy.selections_json
        );


    copy.product_data =
        parseObject(
            copy.product_data,
            copy.product_data_json
        );


    return copy;
}


/* =========================================================
   PARSE OBJECT
========================================================= */

function parseObject(
    value,
    fallback
) {

    if (
        value &&
        typeof value === "object"
    ) {

        return value;
    }


    if (
        typeof fallback === "string" &&
        fallback.trim()
    ) {

        try {

            const parsed =
                JSON.parse(fallback);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                return parsed;
            }

        } catch {

            /* ignore */

        }
    }


    return {};
}


/* =========================================================
   FILTER
========================================================= */

function getFilteredOrders() {

    const orderStatus =
        orderFilter.value;

    const paymentStatus =
        paymentFilter.value;


    return state.orders.filter(
        order => {

            const orderMatch =
                !orderStatus ||
                order.status ===
                    orderStatus;


            const paymentMatch =
                !paymentStatus ||
                order.payment_status ===
                    paymentStatus;


            return (
                orderMatch &&
                paymentMatch
            );
        }
    );
}


/* =========================================================
   RENDER ALL ORDERS
========================================================= */

function renderOrders() {

    const orders =
        getFilteredOrders();


    orderCount.textContent =
        `${orders.length} ${
            orders.length === 1
                ? "order"
                : "orders"
        }`;


    updateSelectionUI();


    if (!orders.length) {

        ordersList.innerHTML = `

            <div class="empty-box">

                <p>
                    No orders found.
                </p>

            </div>

        `;

        return;
    }


    ordersList.innerHTML =
        orders
            .map(renderOrderCard)
            .join("");


    bindOrderEvents();
}


/* =========================================================
   ORDER CARD
========================================================= */

function renderOrderCard(order) {

    const isExpanded =
        state.expanded.has(order.id);

    const isSelected =
        state.selected.has(order.id);


    const image =
        order.image_url ||
        order.product_image ||
        "";


    const orderStatus =
        order.status ||
        "pending";


    const paymentStatus =
        order.payment_status ||
        "pending";


    return `

        <article
            class="order-card ${
                isExpanded
                    ? "expanded"
                    : ""
            }"
            data-order-id="${esc(order.id)}"
        >


            <!-- ================================
                 COMPACT HEADER
            ================================= -->

            <div
                class="order-main"
                data-action="toggle"
            >

                <div class="order-top">


                    <div
                        class="order-checkbox-wrap"
                        data-action="checkbox"
                    >

                        <input
                            type="checkbox"
                            class="order-checkbox"
                            data-id="${esc(order.id)}"
                            ${
                                isSelected
                                    ? "checked"
                                    : ""
                            }
                        >

                    </div>


                    <div class="order-id">

                        ${esc(order.id)}

                    </div>


                    <div class="order-date">

                        ${esc(
                            formatDate(
                                order.created_at
                            )
                        )}

                    </div>

                </div>


                <div class="order-summary">


                    ${
                        image

                            ? `

                                <img
                                    class="product-image"
                                    src="${esc(image)}"
                                    alt="${esc(
                                        order.product_name
                                    )}"
                                    loading="lazy"
                                >

                              `

                            : `

                                <div
                                    class="
                                        product-image-placeholder
                                    "
                                >
                                    📦
                                </div>

                              `
                    }


                    <div class="summary-info">


                        <h3 class="product-name">

                            ${esc(
                                order.product_name ||
                                "Product"
                            )}

                        </h3>


                        <div class="price">

                            ₹${money(
                                order.final_price ??
                                order.price ??
                                0
                            )}

                        </div>


                        <div class="customer-name">

                            ${esc(
                                order.customer_name ||
                                "Customer"
                            )}

                        </div>


                        <div class="status-row">


                            <span
                                class="
                                    status-badge
                                    order-status
                                    status-${esc(
                                        orderStatus
                                    )}
                                "
                            >

                                ${esc(
                                    orderStatusLabel(
                                        orderStatus
                                    )
                                )}

                            </span>


                            <span
                                class="
                                    status-badge
                                    payment-status
                                    status-${esc(
                                        paymentStatus
                                    )}
                                "
                            >

                                ${esc(
                                    paymentStatusLabel(
                                        paymentStatus
                                    )
                                )}

                            </span>


                        </div>


                    </div>

                </div>

            </div>


            <!-- ================================
                 EXPANDED DETAILS
            ================================= -->

            <div class="order-details">


                <!-- CUSTOMER DETAILS -->

                <div class="detail-section">

                    <h4>
                        Customer Details
                    </h4>


                    <div class="detail-grid">


                        <div class="detail-item">

                            <div class="detail-label">
                                Name
                            </div>

                            <div class="detail-value">

                                ${esc(
                                    order.customer_name
                                )}

                            </div>

                        </div>


                        <div class="detail-item">

                            <div class="detail-label">
                                Phone
                            </div>

                            <div class="detail-value">

                                ${esc(
                                    order.customer_phone
                                )}

                            </div>

                        </div>


                        <div class="detail-item">

                            <div class="detail-label">
                                Pincode
                            </div>

                            <div class="detail-value">

                                ${esc(
                                    order.pincode
                                )}

                            </div>

                        </div>


                        <div class="detail-item">

                            <div class="detail-label">
                                Order Date
                            </div>

                            <div class="detail-value">

                                ${esc(
                                    formatDate(
                                        order.created_at
                                    )
                                )}

                            </div>

                        </div>


                    </div>


                    <div
                        class="detail-item"
                        style="margin-top:7px"
                    >

                        <div class="detail-label">
                            Full Address
                        </div>

                        <div
                            class="
                                detail-value
                                full-address
                            "
                        >

                            ${esc(
                                order.customer_address
                            )}

                        </div>

                    </div>

                </div>


                <!-- PRODUCT DETAILS -->

                <div class="detail-section">

                    <h4>
                        Product Details
                    </h4>


                    <div class="detail-grid">


                        <div class="detail-item">

                            <div class="detail-label">
                                Product
                            </div>

                            <div class="detail-value">

                                ${esc(
                                    order.product_name
                                )}

                            </div>

                        </div>


                        <div class="detail-item">

                            <div class="detail-label">
                                Final Price
                            </div>

                            <div class="detail-value">

                                ₹${money(
                                    order.final_price ??
                                    order.price ??
                                    0
                                )}

                            </div>

                        </div>


                    </div>

                </div>


                <!-- SELECTED VARIANTS -->

                <div class="detail-section">

                    <h4>
                        Selected Variants
                    </h4>


                    <div class="variant-list">

                        ${renderVariants(order)}

                    </div>

                </div>


                <!-- ACTIONS -->

                <div class="detail-actions">


                    <button
                        type="button"
                        class="edit-button"
                        data-action="edit"
                        data-id="${esc(order.id)}"
                    >

                        ✏ Edit Order

                    </button>


                    <button
                        type="button"
                        class="delete-button"
                        data-action="delete"
                        data-id="${esc(order.id)}"
                    >

                        🗑 Delete

                    </button>


                </div>


            </div>

        </article>

    `;
}


/* =========================================================
   SELECTED VARIANTS
========================================================= */

function renderVariants(order) {

    const values = [];


    const selections =
        order.selections &&
        typeof order.selections === "object"
            ? order.selections
            : {};


    const variants =
        order.variants &&
        typeof order.variants === "object"
            ? order.variants
            : {};


    /*
     * Use selections first because these
     * represent the customer's actual choice.
     */

    const source =
        Object.keys(selections).length
            ? selections
            : variants;


    const renderedKeys =
        new Set();


    Object.keys(source).forEach(key => {

        const rawValue =
            source[key];


        const displayValue =
            getVariantDisplayValue(
                order,
                key,
                rawValue
            );


        if (!displayValue) {
            return;
        }


        const normalizedKey =
            String(key)
                .toLowerCase()
                .trim();


        /*
         * Avoid duplicate Colour / Size.
         */

        if (
            renderedKeys.has(
                normalizedKey
            )
        ) {

            return;
        }


        renderedKeys.add(
            normalizedKey
        );


        values.push(`

            <span class="variant-chip">

                <strong>
                    ${esc(
                        cleanVariantLabel(key)
                    )}
                </strong>

                : ${esc(displayValue)}

            </span>

        `);

    });


    /*
     * Legacy orders.
     */

    if (
        !renderedKeys.has("colour") &&
        !renderedKeys.has("color") &&
        order.colour
    ) {

        values.push(`

            <span class="variant-chip">

                <strong>
                    Colour
                </strong>

                : ${esc(order.colour)}

            </span>

        `);

    }


    if (
        !renderedKeys.has("size") &&
        order.size
    ) {

        values.push(`

            <span class="variant-chip">

                <strong>
                    Size
                </strong>

                : ${esc(order.size)}

            </span>

        `);

    }


    if (!values.length) {

        return `

            <span class="variant-chip">

                No variants selected

            </span>

        `;
    }


    return values.join("");
}


/* =========================================================
   CLEAN VARIANT LABEL
========================================================= */

function cleanVariantLabel(key) {

    const map = {

        colour: "Colour",
        color: "Colour",
        size: "Size",
        thickness: "Thickness",
        "font colour": "Font Colour",
        "font color": "Font Colour"

    };


    const lower =
        String(key)
            .trim()
            .toLowerCase();


    if (map[lower]) {

        return map[lower];

    }


    return String(key)
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}


/* =========================================================
   CHECK IF VALUE LOOKS LIKE UUID
========================================================= */

function looksLikeId(value) {

    const text =
        String(value || "")
            .trim();


    if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            .test(text)
    ) {

        return true;

    }


    if (
        /^[0-9a-f]{24,}$/i.test(text)
    ) {

        return true;

    }


    return false;
}


/* =========================================================
   GET READABLE VARIANT VALUE
========================================================= */

function getVariantDisplayValue(
    order,
    key,
    rawValue
) {

    if (
        rawValue &&
        typeof rawValue === "object"
    ) {

        const direct =
            rawValue.name ||
            rawValue.label ||
            rawValue.title ||
            rawValue.value ||
            "";


        if (direct) {

            return direct;

        }


        /*
         * Try the ID against product data.
         */

        const id =
            rawValue.id ||
            rawValue.optionId ||
            rawValue.valueId ||
            rawValue.variantId ||
            "";


        if (id) {

            const found =
                findVariantLabel(
                    order.product_data,
                    id
                );


            if (found) {

                return found;

            }

        }

    }


    const primitive =
        String(
            rawValue ?? ""
        ).trim();


    if (!primitive) {
        return "";
    }


    const found =
        findVariantLabel(
            order.product_data,
            primitive
        );


    if (found) {

        return found;

    }


    if (
        looksLikeId(primitive)
    ) {

        return "";

    }


    return primitive;
}


/* =========================================================
   FIND VARIANT LABEL IN PRODUCT DATA
========================================================= */

function findVariantLabel(
    object,
    id
) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return "";

    }


    if (Array.isArray(object)) {

        for (
            const item of object
        ) {

            const result =
                findVariantLabel(
                    item,
                    id
                );


            if (result) {

                return result;

            }

        }


        return "";
    }


    const possibleIds = [

        object.id,
        object.optionId,
        object.valueId,
        object.variantId

    ];


    if (
        possibleIds.some(
            value =>
                String(value || "") ===
                String(id)
        )
    ) {

        return (
            object.name ||
            object.label ||
            object.title ||
            object.value ||
            ""
        );
    }


    for (
        const key of Object.keys(object)
    ) {

        const result =
            findVariantLabel(
                object[key],
                id
            );


        if (result) {

            return result;

        }

    }


    return "";
}


/* =========================================================
   ORDER EVENTS
========================================================= */

function bindOrderEvents() {

    /*
     * Expand / collapse
     */

    document
        .querySelectorAll(
            ".order-main"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest(
                                ".order-checkbox-wrap"
                            )
                        ) {

                            return;

                        }


                        const card =
                            element.closest(
                                ".order-card"
                            );


                        const orderId =
                            card.dataset.orderId;


                        if (
                            state.expanded.has(
                                orderId
                            )
                        ) {

                            state.expanded.delete(
                                orderId
                            );

                        } else {

                            state.expanded.add(
                                orderId
                            );

                        }


                        renderOrders();

                    }
                );

            }
        );


    /*
     * Checkboxes
     */

    document
        .querySelectorAll(
            ".order-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                    }
                );


                checkbox.addEventListener(
                    "change",
                    () => {

                        const id =
                            checkbox.dataset.id;


                        if (
                            checkbox.checked
                        ) {

                            state.selected.add(
                                id
                            );

                        } else {

                            state.selected.delete(
                                id
                            );

                        }


                        updateSelectionUI();

                    }
                );

            }
        );


    /*
     * Edit
     */

    document
        .querySelectorAll(
            '[data-action="edit"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        openEditModal(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    /*
     * Delete
     */

    document
        .querySelectorAll(
            '[data-action="delete"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        deleteOrder(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SELECTION UI
========================================================= */

function updateSelectionUI() {

    const count =
        state.selected.size;


    selectedCount.textContent =
        `${count} selected`;


    const visible =
        getFilteredOrders();


    if (!visible.length) {

        selectAll.checked =
            false;

        selectAll.indeterminate =
            false;

        return;
    }


    const visibleSelected =
        visible.filter(
            order =>
                state.selected.has(
                    order.id
                )
        ).length;


    selectAll.checked =
        visibleSelected ===
        visible.length;


    selectAll.indeterminate =
        visibleSelected > 0 &&
        visibleSelected <
            visible.length;
}


/* =========================================================
   SELECT ALL
========================================================= */

selectAll.addEventListener(
    "change",
    () => {

        const visible =
            getFilteredOrders();


        visible.forEach(
            order => {

                if (
                    selectAll.checked
                ) {

                    state.selected.add(
                        order.id
                    );

                } else {

                    state.selected.delete(
                        order.id
                    );

                }

            }
        );


        renderOrders();

    }
);


/* =========================================================
   FILTER EVENTS
========================================================= */

orderFilter.addEventListener(
    "change",
    renderOrders
);


paymentFilter.addEventListener(
    "change",
    renderOrders
);


/* =========================================================
   BULK ORDER STATUS
========================================================= */

document
    .getElementById(
        "applyOrderStatus"
    )
    .addEventListener(
        "click",
        async () => {

            const status =
                bulkOrderStatus.value;


            if (!status) {

                showToast(
                    "Select an order status.",
                    true
                );

                return;
            }


            await bulkUpdate({
                status
            });

        }
    );


/* =========================================================
   BULK PAYMENT STATUS
========================================================= */

document
    .getElementById(
        "applyPaymentStatus"
    )
    .addEventListener(
        "click",
        async () => {

            const paymentStatus =
                bulkPaymentStatus.value;


            if (!paymentStatus) {

                showToast(
                    "Select a payment status.",
                    true
                );

                return;
            }


            await bulkUpdate({
                payment_status:
                    paymentStatus
            });

        }
    );


/* =========================================================
   BULK UPDATE
========================================================= */

async function bulkUpdate(changes) {

    const ids =
        Array.from(
            state.selected
        );


    if (!ids.length) {

        showToast(
            "Select at least one order.",
            true
        );

        return;
    }


    try {

        await api(
            "/api/admin/orders/bulk",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        ids,
                        ...changes
                    })
            }
        );


        showToast(
            "Orders updated successfully."
        );


        await loadOrders();


    } catch (error) {

        console.error(error);


        showToast(
            error.message ||
            "Unable to update orders.",
            true
        );

    }
}


/* =========================================================
   EDIT MODAL
========================================================= */

function openEditModal(orderId) {

    const order =
        state.orders.find(
            item =>
                item.id === orderId
        );


    if (!order) {
        return;
    }


    state.editingId =
        orderId;


    document.getElementById(
        "editId"
    ).value =
        order.id;


    document.getElementById(
        "editOrderId"
    ).textContent =
        order.id;


    document.getElementById(
        "editCustomerName"
    ).value =
        order.customer_name || "";


    document.getElementById(
        "editCustomerPhone"
    ).value =
        order.customer_phone || "";


    document.getElementById(
        "editCustomerAddress"
    ).value =
        order.customer_address || "";


    document.getElementById(
        "editPincode"
    ).value =
        order.pincode || "";


    document.getElementById(
        "editProductName"
    ).value =
        order.product_name || "";


    document.getElementById(
        "editFinalPrice"
    ).value =
        Number(
            order.final_price ??
            order.price ??
            0
        );


    document.getElementById(
        "editOrderStatus"
    ).value =
        order.status ||
        "pending";


    document.getElementById(
        "editPaymentStatus"
    ).value =
        order.payment_status ||
        "pending";


    /*
     * Build variant editor
     */

    renderEditVariants(order);


    editModal.classList.remove(
        "hidden"
    );
}


/* =========================================================
   RENDER EDIT VARIANTS
========================================================= */

function renderEditVariants(order) {

    const container =
        document.getElementById(
            "editVariants"
        );


    if (!container) {
        return;
    }


    const groups =
        extractVariantGroups(order);


    const selected =
        getSelectedVariantValues(order);


    if (!groups.length) {

        container.innerHTML = `

            <div class="variant-edit-empty">

                No variant options found
                for this order.

            </div>

        `;

        return;
    }


    container.innerHTML =
        groups
            .map(
                group => {

                    const selectedValue =
                        selected[group.key] ??
                        findSelectedByLabel(
                            selected,
                            group.label
                        ) ??
                        "";


                    return `

                        <div
                            class="edit-variant-group"
                            data-variant-key="${esc(
                                group.key
                            )}"
                        >

                            <label>

                                ${esc(
                                    cleanVariantLabel(
                                        group.label
                                    )
                                )}

                            </label>


                            <select
                                class="
                                    edit-variant-select
                                "
                                data-variant-key="${esc(
                                    group.key
                                )}"
                            >

                                <option value="">

                                    Select
                                    ${esc(
                                        cleanVariantLabel(
                                            group.label
                                        )
                                    )}

                                </option>


                                ${
                                    group.options
                                        .map(
                                            option => {

                                                const value =
                                                    String(
                                                        option.id ??
                                                        option.value ??
                                                        option.name ??
                                                        ""
                                                    );


                                                const label =
                                                    option.name ||
                                                    option.label ||
                                                    option.title ||
                                                    option.value ||
                                                    value;


                                                const selectedMatch =
                                                    String(
                                                        selectedValue
                                                    ) ===
                                                    value ||

                                                    String(
                                                        selectedValue
                                                    ) ===
                                                    String(
                                                        label
                                                    );


                                                return `

                                                    <option
                                                        value="${esc(
                                                            value
                                                        )}"
                                                        data-label="${esc(
                                                            label
                                                        )}"
                                                        ${
                                                            selectedMatch
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >

                                                        ${esc(
                                                            label
                                                        )}

                                                    </option>

                                                `;

                                            }
                                        )
                                        .join("")
                                }

                            </select>

                        </div>

                    `;

                }
            )
            .join("");
}


/* =========================================================
   FIND SELECTED BY LABEL
========================================================= */

function findSelectedByLabel(
    selected,
    label
) {

    const target =
        String(label || "")
            .toLowerCase()
            .trim();


    for (
        const key of Object.keys(selected)
    ) {

        if (
            String(key)
                .toLowerCase()
                .trim() ===
            target
        ) {

            return selected[key];

        }

    }


    return "";
}


/* =========================================================
   EXTRACT VARIANT GROUPS
========================================================= */

function extractVariantGroups(order) {

    const groups = [];


    const data =
        order.product_data &&
        typeof order.product_data === "object"
            ? order.product_data
            : {};


    const sources = [

        data.variants,
        data.variantGroups,
        data.variant_groups,
        data.options,
        data.variantOptions

    ];


    for (
        const source of sources
    ) {

        if (!source) {
            continue;
        }


        if (Array.isArray(source)) {

            source.forEach(
                group => {

                    const parsed =
                        normalizeVariantGroup(
                            group
                        );


                    if (parsed) {

                        groups.push(
                            parsed
                        );

                    }

                }
            );

        } else if (
            typeof source === "object"
        ) {

            Object.keys(source)
                .forEach(
                    key => {

                        const parsed =
                            normalizeVariantGroup(
                                source[key],
                                key
                            );


                        if (parsed) {

                            groups.push(
                                parsed
                            );

                        }

                    }
                );
        }


        if (groups.length) {
            break;
        }

    }


    /*
     * If product_data does not contain
     * variant groups, try the actual
     * variants object.
     */

    if (!groups.length) {

        const variants =
            order.variants &&
            typeof order.variants === "object"
                ? order.variants
                : {};


        Object.keys(variants)
            .forEach(
                key => {

                    const parsed =
                        normalizeVariantGroup(
                            variants[key],
                            key
                        );


                    if (parsed) {

                        groups.push(
                            parsed
                        );

                    }

                }
            );

    }


    /*
     * Remove duplicates.
     */

    const unique =
        new Map();


    groups.forEach(
        group => {

            const key =
                String(group.key)
                    .toLowerCase();


            if (
                !unique.has(key)
            ) {

                unique.set(
                    key,
                    group
                );

            }

        }
    );


    return Array.from(
        unique.values()
    );
}


/* =========================================================
   NORMALIZE VARIANT GROUP
========================================================= */

function normalizeVariantGroup(
    group,
    fallbackKey = ""
) {

    if (!group) {
        return null;
    }


    let key =
        fallbackKey;


    let label =
        fallbackKey;


    let options =
        [];


    /*
     * Group itself is an array
     */

    if (
        Array.isArray(group)
    ) {

        options =
            group;

    }

    /*
     * Group is an object
     */

    else if (
        typeof group === "object"
    ) {

        key =
            group.key ||
            group.id ||
            group.name ||
            group.title ||
            fallbackKey;


        label =
            group.label ||
            group.name ||
            group.title ||
            key;


        if (
            Array.isArray(
                group.options
            )
        ) {

            options =
                group.options;

        }

        else if (
            Array.isArray(
                group.values
            )
        ) {

            options =
                group.values;

        }

        else if (
            Array.isArray(
                group.items
            )
        ) {

            options =
                group.items;

        }

    }


    /*
     * Some systems store options
     * directly as an object.
     */

    if (
        !options.length &&
        group &&
        typeof group === "object" &&
        !Array.isArray(group)
    ) {

        const possible =
            Object.keys(group)
                .filter(
                    key =>
                        ![
                            "id",
                            "key",
                            "name",
                            "label",
                            "title"
                        ].includes(
                            key
                        )
                );


        if (possible.length) {

            const values =
                possible.map(
                    key => {

                        const item =
                            group[key];


                        if (
                            item &&
                            typeof item === "object"
                        ) {

                            return {
                                id:
                                    item.id ??
                                    key,

                                name:
                                    item.name ??
                                    item.label ??
                                    item.title ??
                                    item.value ??
                                    key,

                                value:
                                    item.value ??
                                    item.name ??
                                    key
                            };

                        }


                        return {

                            id: key,

                            name:
                                String(
                                    item
                                ),

                            value:
                                String(
                                    item
                                )

                        };

                    }
                );


            options =
                values;

        }

    }


    if (!options.length) {
        return null;
    }


    return {

        key:
            String(
                key ||
                fallbackKey
            ),

        label:
            String(
                label ||
                key ||
                fallbackKey
            ),

        options:
            options
                .map(
                    option => {

                        if (
                            typeof option === "string" ||
                            typeof option === "number"
                        ) {

                            return {

                                id:
                                    String(option),

                                value:
                                    String(option),

                                name:
                                    String(option)

                            };

                        }


                        return option;

                    }
                )
                .filter(Boolean)

    };
}


/* =========================================================
   GET SELECTED VARIANT VALUES
========================================================= */

function getSelectedVariantValues(order) {

    const result = {};


    const selections =
        order.selections &&
        typeof order.selections === "object"
            ? order.selections
            : {};


    const variants =
        order.variants &&
        typeof order.variants === "object"
            ? order.variants
            : {};


    /*
     * Customer selections first.
     */

    Object.keys(selections)
        .forEach(
            key => {

                const value =
                    selections[key];


                if (
                    value &&
                    typeof value === "object"
                ) {

                    result[key] =
                        value.id ??
                        value.value ??
                        value.name ??
                        value.label ??
                        "";

                } else {

                    result[key] =
                        value;

                }

            }
        );


    /*
     * Fill missing values from variants.
     */

    Object.keys(variants)
        .forEach(
            key => {

                if (
                    result[key] !== undefined
                ) {

                    return;

                }


                const value =
                    variants[key];


                if (
                    value &&
                    typeof value === "object"
                ) {

                    result[key] =
                        value.id ??
                        value.value ??
                        value.name ??
                        value.label ??
                        "";

                } else {

                    result[key] =
                        value;

                }

            }
        );


    /*
     * Legacy fields.
     */

    if (
        result.Colour === undefined &&
        order.colour
    ) {

        result.Colour =
            order.colour;

    }


    if (
        result.Size === undefined &&
        order.size
    ) {

        result.Size =
            order.size;

    }


    return result;
}


/* =========================================================
   COLLECT EDITED VARIANTS
========================================================= */

function collectEditedVariants(order) {

    const variants = {};
    const selections = {};


    document
        .querySelectorAll(
            ".edit-variant-select"
        )
        .forEach(
            select => {

                const key =
                    select.dataset.variantKey;


                const option =
                    select.options[
                        select.selectedIndex
                    ];


                if (
                    !key ||
                    !option
                ) {

                    return;

                }


                const value =
                    option.value;


                if (!value) {
                    return;
                }


                const label =
                    option.dataset.label ||
                    option.textContent.trim();


                selections[key] = {

                    id: value,

                    name: label,

                    value: label

                };


                variants[key] = {

                    id: value,

                    name: label,

                    value: label

                };

            }
        );


    let colour = "";
    let size = "";


    Object.keys(selections)
        .forEach(
            key => {

                const lower =
                    key.toLowerCase();


                const value =
                    selections[key];


                if (
                    lower === "colour" ||
                    lower === "color"
                ) {

                    colour =
                        value.name || "";

                }


                if (
                    lower === "size"
                ) {

                    size =
                        value.name || "";

                }

            }
        );


    return {

        variants,

        selections,

        colour,

        size

    };
}


/* =========================================================
   CLOSE EDIT MODAL
========================================================= */

function closeEditModal() {

    editModal.classList.add(
        "hidden"
    );


    state.editingId =
        null;
}


document
    .getElementById(
        "closeEdit"
    )
    .addEventListener(
        "click",
        closeEditModal
    );


document
    .getElementById(
        "cancelEdit"
    )
    .addEventListener(
        "click",
        closeEditModal
    );


const modalBackdrop =
    document.querySelector(
        ".modal-backdrop"
    );


if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        closeEditModal
    );

}


/* =========================================================
   SAVE EDIT
========================================================= */

editForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const id =
            state.editingId;


        if (!id) {
            return;
        }


        const order =
            state.orders.find(
                item =>
                    item.id === id
            );


        if (!order) {
            return;
        }


        const variantData =
            collectEditedVariants(
                order
            );


        const payload = {

            customer_name:
                document
                    .getElementById(
                        "editCustomerName"
                    )
                    .value
                    .trim(),


            customer_phone:
                document
                    .getElementById(
                        "editCustomerPhone"
                    )
                    .value
                    .trim(),


            customer_address:
                document
                    .getElementById(
                        "editCustomerAddress"
                    )
                    .value
                    .trim(),


            pincode:
                document
                    .getElementById(
                        "editPincode"
                    )
                    .value
                    .trim(),


            product_name:
                document
                    .getElementById(
                        "editProductName"
                    )
                    .value
                    .trim(),


            final_price:
                Number(
                    document
                        .getElementById(
                            "editFinalPrice"
                        )
                        .value ||
                    0
                ),


            price:
                Number(
                    document
                        .getElementById(
                            "editFinalPrice"
                        )
                        .value ||
                    0
                ),


            status:
                document
                    .getElementById(
                        "editOrderStatus"
                    )
                    .value,


            payment_status:
                document
                    .getElementById(
                        "editPaymentStatus"
                    )
                    .value,


            variants:
                variantData.variants,


            selections:
                variantData.selections,


            colour:
                variantData.colour,


            size:
                variantData.size

        };


        try {

            await api(
                `/api/admin/orders/${encodeURIComponent(
                    id
                )}`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


            showToast(
                "Order updated successfully."
            );


            closeEditModal();


            await loadOrders();


        } catch (error) {

            console.error(error);


            showToast(
                error.message ||
                "Unable to update order.",
                true
            );

        }

    }
);


/* =========================================================
   DELETE ORDER
========================================================= */

async function deleteOrder(
    orderId
) {

    const order =
        state.orders.find(
            item =>
                item.id === orderId
        );


    if (!order) {
        return;
    }


    const confirmed =
        confirm(
            `Delete order ${order.id}?\n\nThis cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/admin/orders/${encodeURIComponent(
                orderId
            )}`,
            {
                method: "DELETE"
            }
        );


        state.selected.delete(
            orderId
        );


        state.expanded.delete(
            orderId
        );


        showToast(
            "Order deleted."
        );


        await loadOrders();


    } catch (error) {

        console.error(error);


        showToast(
            error.message ||
            "Unable to delete order.",
            true
        );

    }
}


/* =========================================================
   REFRESH
========================================================= */

document
    .getElementById(
        "refreshButton"
    )
    .addEventListener(
        "click",
        loadOrders
    );


/* =========================================================
   BACK
========================================================= */

document
    .getElementById(
        "backButton"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "/admin/";

        }
    );


/* =========================================================
   INITIAL LOAD
========================================================= */

loadOrders();