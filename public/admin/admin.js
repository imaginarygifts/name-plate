/* =====================================================
   ADMIN PRODUCT MANAGER
===================================================== */

const $ = id => document.getElementById(id);


/* =====================================================
   STATE
===================================================== */

let editingId = null;

let colours = [];
let sizes = [];
let variants = [];

let existingImages = [];
let newImages = [];

let products = [];
let categories = [];



/* =====================================================
   API
===================================================== */

async function api(url, options = {}) {

    const config = {
        ...options,
        headers: {
            ...(options.body instanceof FormData
                ? {}
                : {
                    "content-type": "application/json"
                }),
            ...(options.headers || {})
        }
    };

    const response = await fetch(url, config);

    const data =
        await response
            .json()
            .catch(() => ({}));

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Request failed"
        );

    }

    return data;

}



/* =====================================================
   HELPERS
===================================================== */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function slugify(value) {

    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}


function money(value) {

    return Number(value || 0)
        .toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });

}


function toast(message) {

    const el = $("toast");

    el.textContent = message;

    el.classList.add("show");

    clearTimeout(el._timer);

    el._timer = setTimeout(() => {

        el.classList.remove("show");

    }, 2800);

}


function loading(show, text = "Loading...") {

    $("loadingText").textContent = text;

    $("loadingOverlay")
        .classList.toggle(
            "hidden",
            !show
        );

}



/* =====================================================
   LOGIN / REGISTER
===================================================== */

async function boot() {

    try {

        const me =
            await api("/api/me");

        $("loginBox")
            .classList.add("hidden");

        $("registerBox")
            .classList.add("hidden");

        $("adminBox")
            .classList.remove("hidden");

        $("adminEmail").textContent =
            me.email || "";

        await loadCategories();

        await loadProducts();

        resetForm();

    }
    catch {

        $("loginBox")
            .classList.remove("hidden");

        $("adminBox")
            .classList.add("hidden");

    }

}


$("loginForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        try {

            $("loginMessage").textContent =
                "Logging in...";

            await api(
                "/api/login",
                {
                    method: "POST",

                    body: JSON.stringify({
                        email:
                            $("loginEmail").value.trim(),

                        password:
                            $("loginPassword").value
                    })
                }
            );

            location.reload();

        }
        catch (error) {

            $("loginMessage").textContent =
                error.message;

        }

    }
);



$("showRegisterButton").onclick =
    () => {

        $("loginBox")
            .classList.add("hidden");

        $("registerBox")
            .classList.remove("hidden");

    };



$("backLoginButton").onclick =
    () => {

        $("registerBox")
            .classList.add("hidden");

        $("loginBox")
            .classList.remove("hidden");

    };



$("registerForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        try {

            $("registerMessage").textContent =
                "Creating user...";

            const result =
                await api(
                    "/api/register",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            email:
                                $("registerEmail").value.trim(),

                            password:
                                $("registerPassword").value
                        })
                    }
                );

            $("registerMessage").textContent =
                result.message ||
                "User created. Please login.";

            setTimeout(() => {

                $("registerBox")
                    .classList.add("hidden");

                $("loginBox")
                    .classList.remove("hidden");

            }, 1000);

        }
        catch (error) {

            $("registerMessage").textContent =
                error.message;

        }

    }
);



$("logoutButton").onclick =
    async () => {

        await api(
            "/api/logout",
            {
                method: "POST"
            }
        );

        location.reload();

    };



/* =====================================================
   CATEGORIES
===================================================== */

async function loadCategories() {

    categories =
        await api(
            "/api/admin/categories"
        );

    renderCategorySelect();

}


function renderCategorySelect(
    selected = ""
) {

    const select =
        $("productCategory");

    select.innerHTML = `
        <option value="">
            Select Category
        </option>

        ${categories.map(category => `

            <option
                value="${esc(category.id)}"
                ${category.id === selected
                    ? "selected"
                    : ""}
            >
                ${esc(category.name)}
            </option>

        `).join("")}
    `;

}


$("createCategoryButton").onclick =
    openCategoryModal;



function openCategoryModal() {

    $("categoryModal")
        .classList.remove("hidden");

    $("newCategoryName").value = "";

    $("categoryMessage").textContent = "";

    setTimeout(() => {

        $("newCategoryName").focus();

    }, 100);

}


function closeCategoryModal() {

    $("categoryModal")
        .classList.add("hidden");

}


$("closeCategoryModal").onclick =
    closeCategoryModal;


$("cancelCategoryButton").onclick =
    closeCategoryModal;



$("saveCategoryButton").onclick =
    async () => {

        const name =
            $("newCategoryName")
                .value
                .trim();

        if (!name) {

            $("categoryMessage").textContent =
                "Enter category name.";

            return;

        }

        try {

            $("saveCategoryButton").disabled =
                true;

            const result =
                await api(
                    "/api/admin/categories",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            name
                        })
                    }
                );

            await loadCategories();

            renderCategorySelect(
                result.id
            );

            closeCategoryModal();

            toast(
                "Category created successfully."
            );

        }
        catch (error) {

            $("categoryMessage").textContent =
                error.message;

        }
        finally {

            $("saveCategoryButton").disabled =
                false;

        }

    };



/* =====================================================
   COLOURS
===================================================== */

function addColour(
    value = null
) {

    colours.push({

        id:
            value?.id ||
            crypto.randomUUID(),

        name:
            value?.name ||
            "",

        priceType:
            value?.priceType ||
            "amount",

        price:
            Number(value?.price || 0)

    });

    renderColours();

}


$("addColourButton").onclick =
    () => addColour();



function renderColours() {

    const box =
        $("colourList");

    if (!colours.length) {

        box.innerHTML = `
            <div class="empty-small">
                No colours added.
            </div>
        `;

        return;

    }


    box.innerHTML =
        colours.map((colour, index) => `

            <div
                class="variant-option-row"
                data-colour-row="${index}"
            >

                <input
                    type="text"
                    value="${esc(colour.name)}"
                    placeholder="Black"
                    data-colour-name="${index}"
                >


                <select
                    data-colour-type="${index}"
                >

                    <option
                        value="amount"
                        ${colour.priceType === "amount"
                            ? "selected"
                            : ""}
                    >
                        ₹ Amount
                    </option>

                    <option
                        value="percent"
                        ${colour.priceType === "percent"
                            ? "selected"
                            : ""}
                    >
                        % Percent
                    </option>

                </select>


                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value="${Number(colour.price || 0)}"
                    placeholder="0"
                    data-colour-price="${index}"
                >


                <button
                    type="button"
                    class="remove-btn"
                    data-remove-colour="${index}"
                >
                    ×
                </button>

            </div>

        `).join("");


    box.querySelectorAll(
        "[data-colour-name]"
    ).forEach(input => {

        input.oninput = () => {

            colours[
                Number(input.dataset.colourName)
            ].name = input.value;

        };

    });


    box.querySelectorAll(
        "[data-colour-type]"
    ).forEach(select => {

        select.onchange = () => {

            colours[
                Number(select.dataset.colourType)
            ].priceType = select.value;

        };

    });


    box.querySelectorAll(
        "[data-colour-price]"
    ).forEach(input => {

        input.oninput = () => {

            colours[
                Number(input.dataset.colourPrice)
            ].price = Number(
                input.value || 0
            );

        };

    });


    box.querySelectorAll(
        "[data-remove-colour]"
    ).forEach(button => {

        button.onclick = () => {

            colours.splice(
                Number(
                    button.dataset.removeColour
                ),
                1
            );

            renderColours();

        };

    });

}



/* =====================================================
   SIZES
===================================================== */

function addSize(
    value = null
) {

    sizes.push({

        id:
            value?.id ||
            crypto.randomUUID(),

        name:
            value?.name ||
            "",

        priceType:
            value?.priceType ||
            "amount",

        price:
            Number(value?.price || 0)

    });

    renderSizes();

}


$("addSizeButton").onclick =
    () => addSize();



function renderSizes() {

    const box =
        $("sizeList");

    if (!sizes.length) {

        box.innerHTML = `
            <div class="empty-small">
                No sizes added.
            </div>
        `;

        return;

    }


    box.innerHTML =
        sizes.map((size, index) => `

            <div
                class="variant-option-row"
            >

                <input
                    type="text"
                    value="${esc(size.name)}"
                    placeholder="12 × 18"
                    data-size-name="${index}"
                >


                <select
                    data-size-type="${index}"
                >

                    <option
                        value="amount"
                        ${size.priceType === "amount"
                            ? "selected"
                            : ""}
                    >
                        ₹ Amount
                    </option>

                    <option
                        value="percent"
                        ${size.priceType === "percent"
                            ? "selected"
                            : ""}
                    >
                        % Percent
                    </option>

                </select>


                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value="${Number(size.price || 0)}"
                    placeholder="0"
                    data-size-price="${index}"
                >


                <button
                    type="button"
                    class="remove-btn"
                    data-remove-size="${index}"
                >
                    ×
                </button>

            </div>

        `).join("");


    box.querySelectorAll(
        "[data-size-name]"
    ).forEach(input => {

        input.oninput = () => {

            sizes[
                Number(input.dataset.sizeName)
            ].name = input.value;

        };

    });


    box.querySelectorAll(
        "[data-size-type]"
    ).forEach(select => {

        select.onchange = () => {

            sizes[
                Number(select.dataset.sizeType)
            ].priceType = select.value;

        };

    });


    box.querySelectorAll(
        "[data-size-price]"
    ).forEach(input => {

        input.oninput = () => {

            sizes[
                Number(input.dataset.sizePrice)
            ].price = Number(
                input.value || 0
            );

        };

    });


    box.querySelectorAll(
        "[data-remove-size]"
    ).forEach(button => {

        button.onclick = () => {

            sizes.splice(
                Number(
                    button.dataset.removeSize
                ),
                1
            );

            renderSizes();

        };

    });

}



/* =====================================================
   CUSTOM VARIANTS
===================================================== */

function addVariant(
    value = null
) {

    variants.push({

        id:
            value?.id ||
            crypto.randomUUID(),

        name:
            value?.name ||
            "",

        options:
            Array.isArray(value?.options)
                ? structuredClone(
                    value.options
                )
                : []

    });

    renderVariants();

}


$("addVariantButton").onclick =
    () => addVariant();



function renderVariants() {

    const box =
        $("variantList");

    if (!variants.length) {

        box.innerHTML = `
            <div class="empty-small">
                No custom variants created.
            </div>
        `;

        return;

    }


    box.innerHTML =
        variants.map(
            (variant, variantIndex) => `

            <div
                class="variant-card"
            >

                <div class="variant-card-header">

                    <div>

                        <span class="variant-number">
                            Variant ${variantIndex + 1}
                        </span>

                        <input
                            class="variant-name-input"
                            value="${esc(variant.name)}"
                            placeholder="Design"
                            data-variant-name="${variantIndex}"
                        >

                    </div>


                    <button
                        type="button"
                        class="remove-variant-btn"
                        data-remove-variant="${variantIndex}"
                    >
                        Delete Variant
                    </button>

                </div>


                <div
                    class="variant-options"
                    data-variant-options="${variantIndex}"
                >

                    ${renderVariantOptions(
                        variant,
                        variantIndex
                    )}

                </div>


                <button
                    type="button"
                    class="secondary-btn small-btn"
                    data-add-option="${variantIndex}"
                >
                    + Add Option
                </button>

            </div>

        `).join("");


    box.querySelectorAll(
        "[data-variant-name]"
    ).forEach(input => {

        input.oninput = () => {

            variants[
                Number(
                    input.dataset.variantName
                )
            ].name = input.value;

        };

    });


    box.querySelectorAll(
        "[data-remove-variant]"
    ).forEach(button => {

        button.onclick = () => {

            variants.splice(
                Number(
                    button.dataset.removeVariant
                ),
                1
            );

            renderVariants();

        };

    });


    box.querySelectorAll(
        "[data-add-option]"
    ).forEach(button => {

        button.onclick = () => {

            const index =
                Number(
                    button.dataset.addOption
                );

            variants[index].options.push({

                id:
                    crypto.randomUUID(),

                name: "",

                priceType: "amount",

                price: 0

            });

            renderVariants();

        };

    });


    box.querySelectorAll(
        "[data-option-name]"
    ).forEach(input => {

        input.oninput = () => {

            const v =
                Number(
                    input.dataset.variant
                );

            const o =
                Number(
                    input.dataset.option
                );

            variants[v]
                .options[o]
                .name =
                    input.value;

        };

    });


    box.querySelectorAll(
        "[data-option-type]"
    ).forEach(select => {

        select.onchange = () => {

            const v =
                Number(
                    select.dataset.variant
                );

            const o =
                Number(
                    select.dataset.option
                );

            variants[v]
                .options[o]
                .priceType =
                    select.value;

        };

    });


    box.querySelectorAll(
        "[data-option-price]"
    ).forEach(input => {

        input.oninput = () => {

            const v =
                Number(
                    input.dataset.variant
                );

            const o =
                Number(
                    input.dataset.option
                );

            variants[v]
                .options[o]
                .price =
                    Number(
                        input.value || 0
                    );

        };

    });


    box.querySelectorAll(
        "[data-remove-option]"
    ).forEach(button => {

        button.onclick = () => {

            const v =
                Number(
                    button.dataset.variant
                );

            const o =
                Number(
                    button.dataset.removeOption
                );

            variants[v]
                .options
                .splice(o, 1);

            renderVariants();

        };

    });

}



function renderVariantOptions(
    variant,
    variantIndex
) {

    if (!variant.options.length) {

        return `
            <div class="empty-small">
                No options yet.
            </div>
        `;

    }


    return variant.options
        .map(
            (option, optionIndex) => `

            <div class="custom-option-row">

                <input
                    type="text"
                    value="${esc(option.name)}"
                    placeholder="Floral"
                    data-variant="${variantIndex}"
                    data-option="${optionIndex}"
                    data-option-name
                >


                <select
                    data-variant="${variantIndex}"
                    data-option="${optionIndex}"
                    data-option-type
                >

                    <option
                        value="amount"
                        ${option.priceType === "amount"
                            ? "selected"
                            : ""}
                    >
                        ₹
                    </option>

                    <option
                        value="percent"
                        ${option.priceType === "percent"
                            ? "selected"
                            : ""}
                    >
                        %
                    </option>

                </select>


                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value="${Number(option.price || 0)}"
                    placeholder="0"
                    data-variant="${variantIndex}"
                    data-option="${optionIndex}"
                    data-option-price
                >


                <button
                    type="button"
                    class="remove-btn"
                    data-variant="${variantIndex}"
                    data-remove-option="${optionIndex}"
                >
                    ×
                </button>

            </div>

        `
        )
        .join("");

}



/* =====================================================
   IMAGE SELECTION
===================================================== */

$("productImages").addEventListener(
    "change",
    event => {

        const files =
            Array.from(
                event.target.files || []
            );

        newImages.push(...files);

        renderImagePreview();

        event.target.value = "";

    }
);



function renderImagePreview() {

    const box =
        $("imagePreview");

    let html = "";


    existingImages.forEach(
        (image, index) => {

            html += `

                <div
                    class="image-card"
                    data-existing-image="${index}"
                >

                    <img
                        src="${esc(image.url)}"
                        alt=""
                    >

                    <span class="saved-label">
                        Saved
                    </span>

                </div>

            `;

        }
    );


    newImages.forEach(
        (file, index) => {

            const url =
                URL.createObjectURL(file);

            html += `

                <div
                    class="image-card new-image"
                >

                    <img
                        src="${url}"
                        alt=""
                    >

                    <span class="new-label">
                        New
                    </span>

                    <button
                        type="button"
                        class="image-remove-btn"
                        data-remove-new-image="${index}"
                    >
                        ×
                    </button>

                </div>

            `;

        }
    );


    if (!html) {

        html = `
            <div class="empty-images">
                No images selected.
            </div>
        `;

    }


    box.innerHTML = html;


    box.querySelectorAll(
        "[data-remove-new-image]"
    ).forEach(button => {

        button.onclick = () => {

            newImages.splice(
                Number(
                    button.dataset.removeNewImage
                ),
                1
            );

            renderImagePreview();

        };

    });

}



/* =====================================================
   PRODUCTS
===================================================== */

async function loadProducts() {

    products =
        await api(
            "/api/admin/products"
        );

    renderProducts();

}


function renderProducts() {

    const box =
        $("productList");

    $("productCount").textContent =
        products.length;


    if (!products.length) {

        box.innerHTML = `
            <div class="empty-products">
                No products found.
            </div>
        `;

        return;

    }


    box.innerHTML =
        products.map(product => {

            const image =
                product.data?.images?.[0] ||
                product.imageUrl ||
                "";


            return `

                <div
                    class="product-list-item"
                >

                    <div class="product-thumb">

                        ${
                            image
                            ? `
                                <img
                                    src="${esc(image)}"
                                    alt=""
                                >
                              `
                            : `
                                <span>
                                    IMG
                                </span>
                              `
                        }

                    </div>


                    <div class="product-info">

                        <h3>
                            ${esc(
                                product.name ||
                                "Untitled Product"
                            )}
                        </h3>


                        <div class="product-meta">

                            ₹${money(
                                product.price
                            )}

                            ·

                            ${
                                product.active
                                ? "Published"
                                : "Hidden"
                            }

                        </div>

                    </div>


                    <div class="product-actions">

                        <button
                            class="secondary-btn"
                            data-edit="${esc(product.id)}"
                        >
                            Edit
                        </button>


                        <button
                            class="duplicate-btn"
                            data-duplicate="${esc(product.id)}"
                        >
                            Duplicate
                        </button>


                        <button
                            class="delete-btn"
                            data-delete="${esc(product.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `;

        }).join("");


    box.querySelectorAll(
        "[data-edit]"
    ).forEach(button => {

        button.onclick = () => {

            const product =
                products.find(
                    p =>
                        p.id ===
                        button.dataset.edit
                );

            if (product) {

                editProduct(product);

            }

        };

    });


    box.querySelectorAll(
        "[data-duplicate]"
    ).forEach(button => {

        button.onclick =
            () =>
                duplicateProduct(
                    button.dataset.duplicate
                );

    });


    box.querySelectorAll(
        "[data-delete]"
    ).forEach(button => {

        button.onclick =
            () =>
                deleteProduct(
                    button.dataset.delete
                );

    });

}



/* =====================================================
   EDIT PRODUCT
===================================================== */

function editProduct(product) {

    editingId =
        product.id;


    $("formTitle").textContent =
        "Edit Product";


    $("productId").value =
        product.id;


    $("productName").value =
        product.name || "";


    $("productPrice").value =
        Number(
            product.price || 0
        );


    $("productDescription").value =
        product.description || "";


    $("productActive").checked =
        product.active !== false;


    const data =
        product.data || {};


    renderCategorySelect(
        data.categoryId || ""
    );


    colours =
        structuredClone(
            data.colours || []
        );


    sizes =
        structuredClone(
            data.sizes || []
        );


    variants =
        structuredClone(
            data.variants || []
        );


    existingImages =
        (data.images || [])
            .map(url => ({
                url
            }));


    newImages = [];


    renderColours();

    renderSizes();

    renderVariants();

    renderImagePreview();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}



/* =====================================================
   NEW PRODUCT
===================================================== */

function resetForm() {

    editingId = null;

    $("formTitle").textContent =
        "Add Product";


    $("productId").value =
        "";


    $("productName").value =
        "";


    $("productPrice").value =
        "";


    $("productDescription").value =
        "";


    $("productActive").checked =
        true;


    colours = [];

    sizes = [];

    variants = [];

    existingImages = [];

    newImages = [];


    renderCategorySelect();

    renderColours();

    renderSizes();

    renderVariants();

    renderImagePreview();

}


$("newProductButton").onclick =
    resetForm;


$("cancelEditButton").onclick =
    resetForm;



/* =====================================================
   DUPLICATE PRODUCT
===================================================== */

async function duplicateProduct(
    productId
) {

    const original =
        products.find(
            p =>
                p.id === productId
        );

    if (!original) {

        return;

    }


    try {

        loading(
            true,
            "Duplicating product..."
        );


        const data =
            structuredClone(
                original.data || {}
            );


        const body = {

            name:
                `${original.name || "Product"} (Copy)`,

            slug:
                slugify(
                    `${original.name || "product"}-copy`
                ),

            description:
                original.description || "",

            price:
                Number(
                    original.price || 0
                ),

            imageUrl:
                original.imageUrl || "",

            active:
                original.active !== false,

            data

        };


        const result =
            await api(
                "/api/admin/products",
                {
                    method: "POST",

                    body:
                        JSON.stringify(body)
                }
            );


        await loadProducts();


        const duplicated =
            products.find(
                p =>
                    p.id === result.id
            );


        if (duplicated) {

            editProduct(
                duplicated
            );

        }


        toast(
            "Product duplicated. Now editing the copy."
        );

    }
    catch (error) {

        toast(
            error.message
        );

    }
    finally {

        loading(false);

    }

}



/* =====================================================
   DELETE
===================================================== */

async function deleteProduct(
    id
) {

    const product =
        products.find(
            p =>
                p.id === id
        );


    if (!product) {

        return;

    }


    if (
        !confirm(
            `Delete "${product.name}"?`
        )
    ) {

        return;

    }


    try {

        loading(
            true,
            "Deleting product..."
        );


        await api(
            `/api/admin/products/${id}`,
            {
                method: "DELETE"
            }
        );


        if (editingId === id) {

            resetForm();

        }


        await loadProducts();


        toast(
            "Product deleted."
        );

    }
    catch (error) {

        toast(
            error.message
        );

    }
    finally {

        loading(false);

    }

}



/* =====================================================
   SAVE PRODUCT
===================================================== */

$("productForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            $("productName")
                .value
                .trim();


        const price =
            Number(
                $("productPrice").value || 0
            );


        const categoryId =
            $("productCategory").value;


        if (!name) {

            toast(
                "Product name is required."
            );

            return;

        }


        if (price < 0) {

            toast(
                "Invalid product price."
            );

            return;

        }


        if (!categoryId) {

            toast(
                "Please select a category."
            );

            return;

        }


        const cleanColours =
            colours.filter(
                c =>
                    String(c.name || "")
                        .trim()
            );


        const cleanSizes =
            sizes.filter(
                s =>
                    String(s.name || "")
                        .trim()
            );


        const cleanVariants =
            variants
                .filter(
                    v =>
                        String(v.name || "")
                            .trim()
                )
                .map(v => ({

                    ...v,

                    name:
                        String(
                            v.name
                        ).trim(),

                    options:
                        (v.options || [])
                            .filter(
                                o =>
                                    String(
                                        o.name || ""
                                    ).trim()
                            )
                            .map(o => ({

                                ...o,

                                name:
                                    String(
                                        o.name
                                    ).trim(),

                                price:
                                    Number(
                                        o.price || 0
                                    )

                            }))

                }));


        const body = {

            name,

            slug:
                slugify(name),

            description:
                $("productDescription").value,

            price,

            active:
                $("productActive").checked,

            data: {

                categoryId,

                colours:
                    cleanColours,

                sizes:
                    cleanSizes,

                variants:
                    cleanVariants,

                images:
                    existingImages.map(
                        image =>
                            image.url
                    )

            }

        };


        try {

            $("saveProductButton").disabled =
                true;


            loading(
                true,
                editingId
                    ? "Saving product..."
                    : "Creating product..."
            );


            let productId =
                editingId;


            if (productId) {

                await api(
                    `/api/admin/products/${productId}`,
                    {
                        method: "PUT",

                        body:
                            JSON.stringify(body)
                    }
                );

            }
            else {

                const result =
                    await api(
                        "/api/admin/products",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(body)
                        }
                    );


                productId =
                    result.id;

            }


            loading(false);


            /*
               IMPORTANT:
               Existing product is saved first.
               New images are uploaded after that.
            */


            if (newImages.length) {

                await uploadImagesWithProgress(
                    productId
                );

            }


            await loadProducts();


            const savedProduct =
                products.find(
                    p =>
                        p.id === productId
                );


            if (savedProduct) {

                editProduct(
                    savedProduct
                );

            }


            toast(
                "Product saved successfully."
            );

        }
        catch (error) {

            console.error(error);

            toast(
                error.message ||
                "Unable to save product."
            );

        }
        finally {

            $("saveProductButton").disabled =
                false;

            loading(false);

        }

    }
);



/* =====================================================
   IMAGE UPLOAD WITH REAL PROGRESS
===================================================== */

async function uploadImagesWithProgress(
    productId
) {

    const total =
        newImages.length;


    $("uploadModal")
        .classList.remove("hidden");


    let completed = 0;


    try {

        for (
            let index = 0;
            index < total;
            index++
        ) {

            const file =
                newImages[index];


            $("uploadImageNumber")
                .textContent =
                `${index + 1} / ${total}`;


            $("uploadCurrentText")
                .textContent =
                `Uploading image ${index + 1} of ${total}`;


            $("uploadFileName")
                .textContent =
                file.name;


            await uploadSingleImage(
                productId,
                file,
                progress => {

                    const overall =
                        (
                            (
                                completed +
                                progress / 100
                            )
                            /
                            total
                        ) * 100;


                    updateUploadProgress(
                        overall
                    );

                }
            );


            completed++;


            updateUploadProgress(
                (completed / total) * 100
            );

        }


        $("uploadCurrentText")
            .textContent =
            "All images uploaded";


        $("uploadFileName")
            .textContent =
            "Upload complete";


        $("uploadStatus")
            .textContent =
            "✓ Images uploaded successfully";


        updateUploadProgress(100);


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    700
                )
        );

    }
    finally {

        $("uploadModal")
            .classList.add("hidden");

        $("uploadProgress")
            .style.width =
            "0%";

        $("uploadPercent")
            .textContent =
            "0%";

        $("uploadStatus")
            .textContent =
            "";

        newImages = [];

    }

}



/* =====================================================
   SINGLE IMAGE XHR
===================================================== */

function uploadSingleImage(
    productId,
    file,
    onProgress
) {

    return new Promise(
        (resolve, reject) => {

            const xhr =
                new XMLHttpRequest();


            xhr.open(
                "POST",
                "/api/admin/product-images"
            );


            xhr.withCredentials = true;


            xhr.upload.onprogress =
                event => {

                    if (
                        event.lengthComputable
                    ) {

                        const percent =
                            (
                                event.loaded /
                                event.total
                            ) * 100;


                        onProgress(
                            percent
                        );

                    }

                };


            xhr.onload = () => {

                let data = {};

                try {

                    data =
                        JSON.parse(
                            xhr.responseText
                        );

                }
                catch {}


                if (
                    xhr.status >= 200 &&
                    xhr.status < 300
                ) {

                    resolve(data);

                }
                else {

                    reject(
                        new Error(
                            data.error ||
                            "Image upload failed."
                        )
                    );

                }

            };


            xhr.onerror = () => {

                reject(
                    new Error(
                        "Network error while uploading image."
                    )
                );

            };


            const formData =
                new FormData();


            formData.append(
                "productId",
                productId
            );


            formData.append(
                "file",
                file
            );


            xhr.send(
                formData
            );

        }
    );

}



/* =====================================================
   PROGRESS UI
===================================================== */

function updateUploadProgress(
    percent
) {

    percent =
        Math.max(
            0,
            Math.min(
                100,
                percent
            )
        );


    $("uploadProgress")
        .style.width =
        `${percent}%`;


    $("uploadPercent")
        .textContent =
        `${Math.round(percent)}%`;

}



/* =====================================================
   INIT
===================================================== */

boot();