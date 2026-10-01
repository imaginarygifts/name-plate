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
    document.getElementById(
        "ordersList"
    );


const orderCount =
    document.getElementById(
        "orderCount"
    );


const selectedCount =
    document.getElementById(
        "selectedCount"
    );


const selectAll =
    document.getElementById(
        "selectAll"
    );


const orderFilter =
    document.getElementById(
        "orderFilter"
    );


const paymentFilter =
    document.getElementById(
        "paymentFilter"
    );


const bulkOrderStatus =
    document.getElementById(
        "bulkOrderStatus"
    );


const bulkPaymentStatus =
    document.getElementById(
        "bulkPaymentStatus"
    );


const editModal =
    document.getElementById(
        "editModal"
    );


const editForm =
    document.getElementById(
        "editForm"
    );


const toast =
    document.getElementById(
        "toast"
    );


/* =========================================================
   STATUS LABEL
========================================================= */

function orderStatusLabel(
    status
) {

    const map = {

        pending:
            "Pending",

        confirmed:
            "Confirmed",

        in_progress:
            "In Progress",

        complete:
            "Complete",

        delivered:
            "Delivered",

        cancelled:
            "Cancelled"

    };


    return (
        map[status] ||
        status ||
        "Pending"
    );

}


function paymentStatusLabel(
    status
) {

    const map = {

        pending:
            "Pending",

        paid:
            "Paid",

        refund:
            "Refund"

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

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

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
            maximumFractionDigits:
                2
        }
    );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(
    timestamp
) {

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

    clearTimeout(
        toastTimer
    );


    toast.textContent =
        message;


    toast.style.borderColor =
        error
            ? "rgba(255,82,99,.4)"
            : "rgba(255,255,255,.09)";


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

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
                credentials:
                    "include",

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
            .catch(
                () => ({})
            );


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


        /*
          Convert old status values if
          there are orders created before
          the new status system.
        */

        state.orders =
            state.orders.map(
                normalizeOrder
            );


        renderOrders();


    } catch (error) {

        console.error(
            error
        );


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

function normalizeOrder(
    order
) {

    const copy = {
        ...order
    };


    /*
      Old Worker used:
      new / processing / shipped

      Convert them visually to
      the new status names.
    */

    if (
        copy.status ===
        "new"
    ) {

        copy.status =
            "pending";

    }


    if (
        copy.status ===
        "processing"
    ) {

        copy.status =
            "in_progress";

    }


    if (
        copy.status ===
        "shipped"
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


    copy.variants =
        copy.variants ||
        {};


    copy.selections =
        copy.selections ||
        {};


    copy.product_data =
        copy.product_data ||
        {};


    return copy;

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
   RENDER
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
            .map(
                renderOrderCard
            )
            .join("");


    bindOrderEvents();

}


/* =========================================================
   RENDER ORDER CARD
========================================================= */

function renderOrderCard(
    order
) {

    const isExpanded =
        state.expanded.has(
            order.id
        );


    const isSelected =
        state.selected.has(
            order.id
        );


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
            data-order-id="${esc(
                order.id
            )}"
        >


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
                            data-id="${esc(
                                order.id
                            )}"
                            ${
                                isSelected
                                    ? "checked"
                                    : ""
                            }
                        >

                    </div>


                    <div class="order-id">

                        ${esc(
                            order.id
                        )}

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
                                    src="${esc(
                                        image
                                    )}"
                                    alt="${esc(
                                        order.product_name
                                    )}"
                                    loading="lazy"
                                >

                              `

                            : `

                                <div
                                    class="product-image-placeholder"
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


            <!-- =====================================
                 EXPANDED DETAILS
            ====================================== -->

            <div class="order-details">


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

                        <div class="detail-value full-address">

                            ${esc(
                                order.customer_address
                            )}

                        </div>

                    </div>

                </div>


                <!-- PRODUCT -->

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
                                Product ID
                            </div>

                            <div class="detail-value">
                                ${esc(
                                    order.product_id
                                )}
                            </div>

                        </div>


                        <div class="detail-item">

                            <div class="detail-label">
                                Base Price
                            </div>

                            <div class="detail-value">
                                ₹${money(
                                    order.base_price ??
                                    order.price ??
                                    0
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


                <!-- VARIANTS -->

                <div class="detail-section">

                    <h4>
                        Selected Variants
                    </h4>


                    <div class="variant-list">

                        ${renderVariants(
                            order
                        )}

                    </div>

                </div>


                <!-- DESCRIPTION -->

                ${
                    order.product_description

                        ? `

                            <div class="detail-section">

                                <h4>
                                    Product Description
                                </h4>

                                <div class="product-description">

                                    ${esc(
                                        order.product_description
                                    )}

                                </div>

                            </div>

                          `

                        : ""
                }


                <!-- LINK -->

                ${
                    order.product_link

                        ? `

                            <div class="detail-section">

                                <h4>
                                    Product Link
                                </h4>

                                <div class="detail-item">

                                    <div class="detail-value">

                                        ${esc(
                                            order.product_link
                                        )}

                                    </div>

                                </div>

                            </div>

                          `

                        : ""
                }


                <!-- ACTIONS -->

                <div class="detail-actions">


                    <button
                        type="button"
                        class="edit-button"
                        data-action="edit"
                        data-id="${esc(
                            order.id
                        )}"
                    >

                        ✏ Edit Order

                    </button>


                    <button
                        type="button"
                        class="delete-button"
                        data-action="delete"
                        data-id="${esc(
                            order.id
                        )}"
                    >

                        🗑 Delete

                    </button>


                </div>


            </div>

        </article>

    `;

}


/* =========================================================
   RENDER VARIANTS
========================================================= */

function renderVariants(
    order
) {

    const values = [];


    const variants =
        order.variants ||
        {};


    Object.keys(
        variants
    ).forEach(
        key => {

            const value =
                variants[key];


            if (
                value &&
                typeof value === "object"
            ) {

                const name =
                    value.name ||
                    value.value ||
                    "";


                if (name) {

                    values.push(
                        `<span class="variant-chip">
                            ${esc(
                                key
                            )}: ${esc(
                                name
                            )}
                        </span>`
                    );

                }

            } else if (
                value !== null &&
                value !== undefined &&
                String(value).trim()
            ) {

                values.push(
                    `<span class="variant-chip">
                        ${esc(
                            key
                        )}: ${esc(
                            value
                        )}
                    </span>`
                );

            }

        }
    );


    const selections =
        order.selections ||
        {};


    Object.keys(
        selections
    ).forEach(
        key => {

            const value =
                selections[key];


            if (
                value &&
                typeof value === "object"
            ) {

                const name =
                    value.name ||
                    value.value ||
                    "";


                if (name) {

                    values.push(
                        `<span class="variant-chip">
                            ${esc(
                                key
                            )}: ${esc(
                                name
                            )}
                        </span>`
                    );

                }

            } else if (
                value !== null &&
                value !== undefined &&
                String(value).trim()
            ) {

                values.push(
                    `<span class="variant-chip">
                        ${esc(
                            key
                        )}: ${esc(
                            value
                        )}
                    </span>`
                );

            }

        }
    );


    if (
        order.colour
    ) {

        values.push(
            `<span class="variant-chip">
                Colour: ${esc(
                    order.colour
                )}
            </span>`
        );

    }


    if (
        order.size
    ) {

        values.push(
            `<span class="variant-chip">
                Size: ${esc(
                    order.size
                )}
            </span>`
        );

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
   EVENTS
========================================================= */

function bindOrderEvents() {

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


            await bulkUpdate(
                {
                    status
                }
            );

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


            await bulkUpdate(
                {
                    payment_status:
                        paymentStatus
                }
            );

        }
    );


/* =========================================================
   BULK UPDATE
========================================================= */

async function bulkUpdate(
    changes
) {

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
                method:
                    "POST",

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

        console.error(
            error
        );


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

function openEditModal(
    orderId
) {

    const order =
        state.orders.find(
            item =>
                item.id ===
                orderId
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
        order.customer_name ||
        "";


    document.getElementById(
        "editCustomerPhone"
    ).value =
        order.customer_phone ||
        "";


    document.getElementById(
        "editCustomerAddress"
    ).value =
        order.customer_address ||
        "";


    document.getElementById(
        "editPincode"
    ).value =
        order.pincode ||
        "";


    document.getElementById(
        "editProductName"
    ).value =
        order.product_name ||
        "";


    document.getElementById(
        "editProductImage"
    ).value =
        order.image_url ||
        order.product_image ||
        "";


    document.getElementById(
        "editColour"
    ).value =
        order.colour ||
        "";


    document.getElementById(
        "editSize"
    ).value =
        order.size ||
        "";


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


    editModal.classList.remove(
        "hidden"
    );

}


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


document
    .querySelector(
        ".modal-backdrop"
    )
    .addEventListener(
        "click",
        closeEditModal
    );


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


        const payload = {

            customer_name:
                document.getElementById(
                    "editCustomerName"
                ).value.trim(),

            customer_phone:
                document.getElementById(
                    "editCustomerPhone"
                ).value.trim(),

            customer_address:
                document.getElementById(
                    "editCustomerAddress"
                ).value.trim(),

            pincode:
                document.getElementById(
                    "editPincode"
                ).value.trim(),

            product_name:
                document.getElementById(
                    "editProductName"
                ).value.trim(),

            product_image:
                document.getElementById(
                    "editProductImage"
                ).value.trim(),

            image_url:
                document.getElementById(
                    "editProductImage"
                ).value.trim(),

            colour:
                document.getElementById(
                    "editColour"
                ).value.trim(),

            size:
                document.getElementById(
                    "editSize"
                ).value.trim(),

            final_price:
                Number(
                    document.getElementById(
                        "editFinalPrice"
                    ).value || 0
                ),

            price:
                Number(
                    document.getElementById(
                        "editFinalPrice"
                    ).value || 0
                ),

            status:
                document.getElementById(
                    "editOrderStatus"
                ).value,

            payment_status:
                document.getElementById(
                    "editPaymentStatus"
                ).value

        };


        try {

            await api(
                `/api/admin/orders/${encodeURIComponent(
                    id
                )}`,
                {
                    method:
                        "PUT",

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

            console.error(
                error
            );


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
                item.id ===
                orderId
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
                method:
                    "DELETE"
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

        console.error(
            error
        );


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