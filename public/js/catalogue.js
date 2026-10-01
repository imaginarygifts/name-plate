/* =========================================================
   IMAGINARY GIFTS FRONTEND
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

  /*
    Replace with your WhatsApp number.

    Example:
    919876543210

    No +, spaces or hyphens.
  */

  whatsappNumber:
    "919730157585"

};


/* =========================================================
   STATE
========================================================= */

const state = {

  products: [],

  categories: [],

  selectedCategory: "",

  selectedProduct: null,

  selectedImageIndex: 0,

  selectedVariants: {},

  orderProduct: null,

  /*
    true when customer is viewing
    a single product page.
  */

  productViewOpen: false

};


/* =========================================================
   BASIC HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);


function formatMoney(value) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


function escapeHtml(value) {

  return String(
    value ?? ""
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


function escapeAttr(value) {

  return escapeHtml(
    value
  );

}


function clone(value) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );

}


/* =========================================================
   GET PRODUCT IMAGES
========================================================= */

function getImages(product) {

  const images =
    product?.data?.images;


  if (
    !Array.isArray(images)
  ) {

    return [];

  }


  return images
    .map(item => {

      if (
        typeof item ===
        "string"
      ) {

        return {
          url: item,
          key: ""
        };

      }


      return {

        url:
          item.url ||
          item.imageUrl ||
          "",

        key:
          item.key ||
          item.objectKey ||
          ""

      };

    })
    .filter(
      item =>
        item.url
    );

}


/* =========================================================
   CATEGORY
========================================================= */

function getProductCategoryId(
  product
) {

  return (
    product?.data?.categoryId ||
    product?.data?.category_id ||
    ""
  );

}


function getCategoryName(
  categoryId
) {

  const category =
    state.categories.find(
      item =>
        item.id ===
        categoryId
    );


  return (
    category?.name ||
    ""
  );

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {

  bindEvents();


  await Promise.all([
    loadCategories(),
    loadProducts()
  ]);


  handleDeepLink();

}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

  document.addEventListener(
    "click",
    handleGlobalClick
  );


  $("#closeOrderModal")
    ?.addEventListener(
      "click",
      closeOrderModal
    );


  $("#orderModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("#orderModal")
        ) {

          closeOrderModal();

        }

      }
    );


  $("#orderForm")
    ?.addEventListener(
      "submit",
      submitOrder
    );


  $("#stickyOrderBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          state.orderProduct
        ) {

          startOrderProcess(
            state.orderProduct
          );

        }

      }
    );


  window.addEventListener(
    "popstate",
    handleDeepLink
  );

}


/* =========================================================
   GLOBAL CLICK HANDLER
========================================================= */

function handleGlobalClick(
  event
) {

  /* ---------------------------------------------
     CATEGORY
  --------------------------------------------- */

  const categoryButton =
    event.target.closest(
      ".category-pill"
    );


  if (categoryButton) {

    selectCategory(
      categoryButton.dataset.categoryId ||
      ""
    );

    return;

  }


  /* ---------------------------------------------
     PRODUCT IMAGE
  --------------------------------------------- */

  const image =
    event.target.closest(
      ".product-grid-image"
    );


  if (image) {

    openProductDetail(
      image.dataset.productId,
      Number(
        image.dataset.imageIndex || 0
      )
    );

    return;

  }


  /* ---------------------------------------------
     DETAIL THUMBNAIL
  --------------------------------------------- */

  const thumbnail =
    event.target.closest(
      ".detail-thumb"
    );


  if (thumbnail) {

    openProductDetail(
      thumbnail.dataset.productId,
      Number(
        thumbnail.dataset.imageIndex || 0
      )
    );

    return;

  }


  /* ---------------------------------------------
     PRODUCT ORDER
  --------------------------------------------- */

  const orderButton =
    event.target.closest(
      ".product-order-btn"
    );


  if (orderButton) {

    startOrderProcess(
      orderButton.dataset.productId
    );

    return;

  }


  /* ---------------------------------------------
     STICKY ORDER
  --------------------------------------------- */

  const stickyButton =
    event.target.closest(
      "#stickyOrderBtn"
    );


  if (stickyButton) {

    if (
      state.orderProduct
    ) {

      startOrderProcess(
        state.orderProduct
      );

    }

    return;

  }


  /* ---------------------------------------------
     OTHER PRODUCT
  --------------------------------------------- */

  const otherProduct =
    event.target.closest(
      ".other-product"
    );


  if (otherProduct) {

    openProductDetail(
      otherProduct.dataset.productId,
      0
    );

    return;

  }


  /* ---------------------------------------------
     VARIANT
  --------------------------------------------- */

  const variantButton =
    event.target.closest(
      ".variant-option"
    );


  if (variantButton) {

    handleVariantSelection(
      variantButton
    );

    return;

  }


  /* ---------------------------------------------
     VARIANT POPUP OPTION
  --------------------------------------------- */

  const popupOption =
    event.target.closest(
      ".order-variant-option"
    );


  if (popupOption) {

    handleOrderVariantSelection(
      popupOption
    );

    return;

  }


  /* ---------------------------------------------
     VARIANT POPUP CONTINUE
  --------------------------------------------- */

  const continueButton =
    event.target.closest(
      "#continueVariantOrderBtn"
    );


  if (continueButton) {

    continueOrderAfterVariantSelection();

    return;

  }


  /* ---------------------------------------------
     VARIANT POPUP CLOSE
  --------------------------------------------- */

  const closeVariantButton =
    event.target.closest(
      "#closeVariantPopup"
    );


  if (closeVariantButton) {

    closeVariantPopup();

    return;

  }

}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {

  try {

    const response =
      await fetch(
        "/api/admin/categories"
      );


    if (!response.ok) {

      throw new Error(
        "Could not load categories."
      );

    }


    const data =
      await response.json();


    state.categories =
      Array.isArray(data)
        ? data
        : Array.isArray(
            data?.categories
          )
          ? data.categories
          : [];


    state.categories.sort(
      (
        a,
        b
      ) => {

        const orderA =
          Number(
            a.sort_order ??
            a.position ??
            999999
          );


        const orderB =
          Number(
            b.sort_order ??
            b.position ??
            999999
          );


        if (
          orderA !==
          orderB
        ) {

          return (
            orderA -
            orderB
          );

        }


        return String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          )
        );

      }
    );


    renderCategoryPills();

  } catch (error) {

    console.error(
      "Category load error:",
      error
    );


    renderCategoryPills();

  }

}


/* =========================================================
   CATEGORY PILLS
========================================================= */

function renderCategoryPills() {

  const container =
    $("#categoryPills");


  if (!container) {
    return;
  }


  container.innerHTML = `

    <button
      type="button"
      class="category-pill ${
        state.selectedCategory === ""
          ? "active"
          : ""
      }"
      data-category-id=""
    >
      All
    </button>

  `;


  state.categories
    .forEach(
      category => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "category-pill";


        if (
          state.selectedCategory ===
          category.id
        ) {

          button.classList.add(
            "active"
          );

        }


        button.dataset.categoryId =
          category.id;


        button.textContent =
          category.name;


        container.appendChild(
          button
        );

      }
    );

}


/* =========================================================
   SELECT CATEGORY
========================================================= */

function selectCategory(
  categoryId
) {

  closeSingleProductView();


  state.selectedCategory =
    categoryId || "";


  renderCategoryPills();

  renderProducts();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

  const container =
    $("#productsContainer");


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="loading-state">
      Loading products...
    </div>
  `;


  try {

    const response =
      await fetch(
        "/api/products"
      );


    if (!response.ok) {

      throw new Error(
        `Failed to load products (${response.status})`
      );

    }


    const data =
      await response.json();


    state.products =
      Array.isArray(data)
        ? data
        : Array.isArray(
            data?.products
          )
          ? data.products
          : [];


    state.products =
      state.products.filter(
        product =>
          product.active !== false
      );


    renderProducts();

  } catch (error) {

    console.error(
      "Product load error:",
      error
    );


    container.innerHTML = `
      <div class="empty-state">

        <div>
          ⚠️
        </div>

        <strong>
          Could not load products
        </strong>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;

  }

}


/* =========================================================
   FILTER
========================================================= */

function getFilteredProducts() {

  if (
    !state.selectedCategory
  ) {

    return [
      ...state.products
    ];

  }


  return state.products.filter(
    product =>
      getProductCategoryId(
        product
      ) ===
      state.selectedCategory
  );

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

  const container =
    $("#productsContainer");


  if (!container) {
    return;
  }


  const products =
    getFilteredProducts();


  if (!products.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div>
          📦
        </div>

        <strong>
          No products found
        </strong>

        <p>
          No products are available
          in this category.
        </p>

      </div>
    `;

    return;

  }


  container.innerHTML =
    products
      .map(
        product =>
          renderProductCard(
            product
          )
      )
      .join("");

}


/* =========================================================
   PRODUCT CARD
========================================================= */

function renderProductCard(
  product
) {

  const images =
    getImages(
      product
    );


  const price =
    calculateProductPrice(
      product
    );


  const variantHtml =
    renderProductVariants(
      product
    );


  const imageHtml =
    images.length
      ? images
          .map(
            (
              image,
              index
            ) => `

              <div
                class="product-grid-image"
                data-product-id="${escapeAttr(
                  product.id
                )}"
                data-image-index="${index}"
              >

                <img
                  src="${escapeAttr(
                    image.url
                  )}"
                  alt="${escapeAttr(
                    product.name || ""
                  )}"
                  loading="lazy"
                >

                <span class="image-number">
                  ${index + 1}
                </span>

              </div>

            `
          )
          .join("")
      : "";


  return `

    <article
      class="product-card"
      data-product-card="${escapeAttr(
        product.id
      )}"
    >

      <div class="product-header">

        <div class="product-heading">

          <h2 class="product-name">
            ${escapeHtml(
              product.name ||
              "Untitled Product"
            )}
          </h2>


          <div
            class="product-price"
            data-product-price="${escapeAttr(
              product.id
            )}"
          >
            ₹${formatMoney(
              price
            )}
          </div>


          ${
            product.description
              ? `
                <p class="product-description">
                  ${escapeHtml(
                    product.description
                  )}
                </p>
              `
              : ""
          }

        </div>


        <button
          type="button"
          class="product-order-btn"
          data-product-id="${escapeAttr(
            product.id
          )}"
        >
          Order
        </button>

      </div>


      ${
        variantHtml
          ? `
            <div class="variant-area">
              ${variantHtml}
            </div>
          `
          : ""
      }


      ${
        imageHtml
          ? `
            <div class="product-image-grid">
              ${imageHtml}
            </div>
          `
          : ""
      }

    </article>

  `;

}


/* =========================================================
   PRODUCT VARIANTS
========================================================= */

function renderProductVariants(
  product
) {

  const groups = [];


  const colours =
    Array.isArray(
      product?.data?.colours
    )
      ? product.data.colours
      : [];


  const sizes =
    Array.isArray(
      product?.data?.sizes
    )
      ? product.data.sizes
      : [];


  const customVariants =
    Array.isArray(
      product?.data?.variants
    )
      ? product.data.variants
      : [];


  if (colours.length) {

    groups.push(
      renderVariantGroup(
        product,
        "Colour",
        "colours",
        colours
      )
    );

  }


  if (sizes.length) {

    groups.push(
      renderVariantGroup(
        product,
        "Size",
        "sizes",
        sizes
      )
    );

  }


  customVariants
    .forEach(
      (
        variant,
        index
      ) => {

        if (
          Array.isArray(
            variant.options
          ) &&
          variant.options.length
        ) {

          groups.push(
            renderVariantGroup(
              product,
              variant.name ||
                `Option ${index + 1}`,
              `custom_${index}`,
              variant.options
            )
          );

        }

      }
    );


  return groups.join("");

}


function renderVariantGroup(
  product,
  label,
  groupKey,
  options
) {

  const current =
    state.selectedVariants[
      product.id
    ]?.[groupKey] || "";


  return `

    <div class="variant-group">

      <span class="variant-label">
        ${escapeHtml(
          label
        )}
      </span>


      <div class="variant-options">

        ${options
          .map(
            option => {

              const optionId =
                option.id ||
                option.name;


              const selected =
                current ===
                optionId;


              return `

                <button
                  type="button"
                  class="variant-option ${
                    selected
                      ? "selected"
                      : ""
                  }"
                  data-product-id="${escapeAttr(
                    product.id
                  )}"
                  data-variant-group="${escapeAttr(
                    groupKey
                  )}"
                  data-option-id="${escapeAttr(
                    optionId
                  )}"
                  data-option-name="${escapeAttr(
                    option.name || ""
                  )}"
                  data-price-type="${escapeAttr(
                    option.priceType ||
                    "INR"
                  )}"
                  data-price="${Number(
                    option.price || 0
                  )}"
                >

                  ${escapeHtml(
                    option.name ||
                    "Option"
                  )}

                  ${
                    Number(
                      option.price || 0
                    ) !== 0
                      ? `
                        <span>
                          ${
                            option.priceType === "%"
                              ? ` +${option.price}%`
                              : ` +₹${formatMoney(
                                  option.price
                                )}`
                          }
                        </span>
                      `
                      : ""
                  }

                </button>

              `;

            }
          )
          .join("")}

      </div>

    </div>

  `;

}


/* =========================================================
   VARIANT SELECTION
   IMPORTANT:
   DO NOT RE-RENDER THE CARD.
   This preserves horizontal scroll.
========================================================= */

function handleVariantSelection(
  button
) {

  const productId =
    button.dataset.productId;

  const group =
    button.dataset.variantGroup;

  const optionId =
    button.dataset.optionId;


  if (
    !state.selectedVariants[
      productId
    ]
  ) {

    state.selectedVariants[
      productId
    ] = {};

  }


  state.selectedVariants[
    productId
  ][group] =
    optionId;


  /*
    Only change selected classes
    inside this variant group.

    We intentionally DO NOT call
    renderProductCard() here.

    Therefore horizontal scroll
    position stays exactly where
    customer clicked.
  */

  const card =
    document.querySelector(
      `[data-product-card="${CSS.escape(
        productId
      )}"]`
    );


  if (card) {

    card
      .querySelectorAll(
        `.variant-option[data-variant-group="${CSS.escape(
          group
        )}"]`
      )
      .forEach(
        option => {

          option.classList.toggle(
            "selected",
            option === button
          );

        }
      );

  }


  updatePriceDisplays(
    productId
  );


  /*
    If this product is currently
    open in single-product mode,
    update its detail price only.
  */

  if (
    state.productViewOpen &&
    state.selectedProduct?.id ===
      productId
  ) {

    updateDetailPrice(
      productId
    );

  }

}


/* =========================================================
   UPDATE PRICE
========================================================= */

function updatePriceDisplays(
  productId
) {

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {
    return;
  }


  const price =
    calculateProductPrice(
      product
    );


  document
    .querySelectorAll(
      `[data-product-price="${CSS.escape(
        productId
      )}"]`
    )
    .forEach(
      element => {

        element.textContent =
          `₹${formatMoney(
            price
          )}`;

      }
    );


  if (
    state.orderProduct?.id ===
    productId
  ) {

    $("#stickyProductPrice")
      ?.replaceChildren(
        document.createTextNode(
          `₹${formatMoney(
            price
          )}`
        )
      );

  }

}


/* =========================================================
   PRICE CALCULATION
========================================================= */

function calculateProductPrice(
  product
) {

  let price =
    Number(
      product.price || 0
    );


  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const applyOption =
    option => {

      if (!option) {
        return;
      }


      const amount =
        Number(
          option.price || 0
        );


      if (
        option.priceType === "%"
      ) {

        price +=
          price *
          amount /
          100;

      } else {

        price +=
          amount;

      }

    };


  const colours =
    product?.data?.colours ||
    [];


  const sizes =
    product?.data?.sizes ||
    [];


  const variants =
    product?.data?.variants ||
    [];


  if (
    selected.colours
  ) {

    applyOption(
      colours.find(
        option =>
          (
            option.id ||
            option.name
          ) ===
          selected.colours
      )
    );

  }


  if (
    selected.sizes
  ) {

    applyOption(
      sizes.find(
        option =>
          (
            option.id ||
            option.name
          ) ===
          selected.sizes
      )
    );

  }


  variants.forEach(
    (
      variant,
      index
    ) => {

      const selectedId =
        selected[
          `custom_${index}`
        ];


      if (!selectedId) {
        return;
      }


      const option =
        (
          variant.options ||
          []
        ).find(
          item =>
            (
              item.id ||
              item.name
            ) ===
            selectedId
        );


      applyOption(
        option
      );

    }
  );


  return price;

}


/* =========================================================
   GET SELECTED VARIANTS
========================================================= */

function getSelectedVariantDetails(
  product
) {

  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const result = [];


  function addSelected(
    label,
    groupKey,
    options
  ) {

    const selectedId =
      selected[groupKey];


    if (!selectedId) {
      return;
    }


    const option =
      options.find(
        item =>
          (
            item.id ||
            item.name
          ) ===
          selectedId
      );


    if (option) {

      result.push({

        label,

        name:
          option.name || "",

        priceType:
          option.priceType ||
          "INR",

        price:
          Number(
            option.price || 0
          )

      });

    }

  }


  addSelected(
    "Colour",
    "colours",
    product?.data?.colours || []
  );


  addSelected(
    "Size",
    "sizes",
    product?.data?.sizes || []
  );


  (
    product?.data?.variants ||
    []
  )
    .forEach(
      (
        variant,
        index
      ) => {

        addSelected(
          variant.name ||
            `Option ${index + 1}`,
          `custom_${index}`,
          variant.options ||
            []
        );

      }
    );


  return result;

}


/* =========================================================
   CHECK AVAILABLE VARIANTS
========================================================= */

function getVariantGroups(
  product
) {

  const groups = [];


  const colours =
    product?.data?.colours || [];


  const sizes =
    product?.data?.sizes || [];


  const customVariants =
    product?.data?.variants || [];


  if (
    Array.isArray(colours) &&
    colours.length
  ) {

    groups.push({

      key: "colours",

      label: "Colour",

      options: colours

    });

  }


  if (
    Array.isArray(sizes) &&
    sizes.length
  ) {

    groups.push({

      key: "sizes",

      label: "Size",

      options: sizes

    });

  }


  customVariants
    .forEach(
      (
        variant,
        index
      ) => {

        if (
          Array.isArray(
            variant.options
          ) &&
          variant.options.length
        ) {

          groups.push({

            key:
              `custom_${index}`,

            label:
              variant.name ||
              `Option ${index + 1}`,

            options:
              variant.options

          });

        }

      }
    );


  return groups;

}


/* =========================================================
   START ORDER PROCESS
========================================================= */

function startOrderProcess(
  productOrId
) {

  const product =
    typeof productOrId ===
    "object"

      ? productOrId

      : state.products.find(
          item =>
            item.id ===
            productOrId
        );


  if (!product) {
    return;
  }


  state.orderProduct =
    product;


  /*
    If product has variants,
    customer MUST select them first.
  */

  const groups =
    getVariantGroups(
      product
    );


  if (
    groups.length
  ) {

    openVariantSelectionPopup(
      product
    );

    return;

  }


  /*
    No variants:
    directly show customer form.
  */

  openOrderModal(
    product
  );

}


/* =========================================================
   VARIANT SELECTION POPUP
========================================================= */

function openVariantSelectionPopup(
  product
) {

  let popup =
    $("#variantSelectionModal");


  /*
    Create popup dynamically.
    No HTML change required.
  */

  if (!popup) {

    popup =
      document.createElement(
        "div"
      );

    popup.id =
      "variantSelectionModal";

    popup.className =
      "modal-overlay";


    document.body.appendChild(
      popup
    );

  }


  const groups =
    getVariantGroups(
      product
    );


  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const image =
    getImages(
      product
    )[0]?.url ||
    product.imageUrl ||
    "";


  popup.innerHTML = `

    <div
      class="order-modal variant-selection-modal"
    >

      <div class="modal-header">

        <div>

          <h2>
            Select Options
          </h2>

          <p>
            ${escapeHtml(
              product.name || ""
            )}
          </p>

        </div>


        <button
          type="button"
          id="closeVariantPopup"
          class="close-btn"
        >
          ×
        </button>

      </div>


      ${
        image
          ? `
            <div
              style="
                display:flex;
                align-items:center;
                gap:10px;
                padding:10px;
                margin-bottom:15px;
                border:1px solid #27272a;
                border-radius:10px;
                background:#0f0f11;
              "
            >

              <img
                src="${escapeAttr(
                  image
                )}"
                alt=""
                style="
                  width:55px;
                  height:55px;
                  object-fit:cover;
                  border-radius:8px;
                "
              >

              <div>

                <strong
                  style="
                    display:block;
                    font-size:13px;
                  "
                >
                  ${escapeHtml(
                    product.name || ""
                  )}
                </strong>

                <span
                  id="variantPopupPrice"
                  style="
                    display:block;
                    margin-top:4px;
                    color:#c084fc;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  ₹${formatMoney(
                    calculateProductPrice(
                      product
                    )
                  )}
                </span>

              </div>

            </div>
          `
          : ""
      }


      <div>

        ${groups
          .map(
            group => `

              <div
                class="variant-group"
                style="
                  margin-bottom:18px;
                "
              >

                <span
                  class="variant-label"
                  style="
                    display:block;
                    margin-bottom:8px;
                  "
                >
                  ${escapeHtml(
                    group.label
                  )}
                </span>


                <div
                  class="variant-options"
                  style="
                    display:flex;
                    gap:8px;
                    overflow-x:auto;
                    padding-bottom:4px;
                  "
                >

                  ${group.options
                    .map(
                      option => {

                        const optionId =
                          option.id ||
                          option.name;


                        const isSelected =
                          selected[
                            group.key
                          ] ===
                          optionId;


                        return `

                          <button
                            type="button"
                            class="
                              variant-option
                              order-variant-option
                              ${
                                isSelected
                                  ? "selected"
                                  : ""
                              }
                            "
                            data-product-id="${escapeAttr(
                              product.id
                            )}"
                            data-variant-group="${escapeAttr(
                              group.key
                            )}"
                            data-option-id="${escapeAttr(
                              optionId
                            )}"
                          >

                            ${escapeHtml(
                              option.name ||
                              "Option"
                            )}

                            ${
                              Number(
                                option.price ||
                                0
                              ) !== 0
                                ? `
                                  <span>
                                    ${
                                      option.priceType ===
                                      "%"
                                        ? ` +${option.price}%`
                                        : ` +₹${formatMoney(
                                            option.price
                                          )}`
                                    }
                                  </span>
                                `
                                : ""
                            }

                          </button>

                        `;

                      }
                    )
                    .join("")}

                </div>

              </div>

            `
          )
          .join("")}

      </div>


      <div
        id="variantSelectionMessage"
        style="
          min-height:18px;
          margin-bottom:8px;
          color:#fca5a5;
          font-size:12px;
        "
      ></div>


      <button
        type="button"
        id="continueVariantOrderBtn"
        class="submit-order-btn"
      >
        Continue to Order
      </button>

    </div>

  `;


  popup.classList.remove(
    "hidden"
  );

}


/* =========================================================
   VARIANT POPUP SELECTION
========================================================= */

function handleOrderVariantSelection(
  button
) {

  const productId =
    button.dataset.productId;

  const group =
    button.dataset.variantGroup;

  const optionId =
    button.dataset.optionId;


  if (
    !state.selectedVariants[
      productId
    ]
  ) {

    state.selectedVariants[
      productId
    ] = {};

  }


  state.selectedVariants[
    productId
  ][group] =
    optionId;


  /*
    Change selected state ONLY.
    Do not recreate popup.
  */

  const popup =
    $("#variantSelectionModal");


  if (popup) {

    popup
      .querySelectorAll(
        `.order-variant-option[data-variant-group="${CSS.escape(
          group
        )}"]`
      )
      .forEach(
        item => {

          item.classList.toggle(
            "selected",
            item === button
          );

        }
      );

  }


  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (product) {

    const priceElement =
      $("#variantPopupPrice");


    if (priceElement) {

      priceElement.textContent =
        `₹${formatMoney(
          calculateProductPrice(
            product
          )
        )}`;

    }

  }

}


/* =========================================================
   CONTINUE ORDER AFTER VARIANTS
========================================================= */

function continueOrderAfterVariantSelection() {

  const product =
    state.orderProduct;


  if (!product) {
    return;
  }


  const groups =
    getVariantGroups(
      product
    );


  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const missing =
    groups.find(
      group =>
        !selected[
          group.key
        ]
    );


  if (missing) {

    const message =
      $("#variantSelectionMessage");


    if (message) {

      message.textContent =
        `Please select ${missing.label}.`;

    }


    return;

  }


  closeVariantPopup();


  openOrderModal(
    product
  );

}


/* =========================================================
   CLOSE VARIANT POPUP
========================================================= */

function closeVariantPopup() {

  const popup =
    $("#variantSelectionModal");


  if (popup) {

    popup.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   SINGLE PRODUCT VIEW
========================================================= */

function openProductDetail(
  productId,
  imageIndex = 0,
  updateUrl = true
) {

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {
    return;
  }


  const images =
    getImages(
      product
    );


  if (
    images.length
  ) {

    imageIndex =
      Math.max(
        0,
        Math.min(
          imageIndex,
          images.length - 1
        )
      );

  } else {

    imageIndex = 0;

  }


  state.selectedProduct =
    product;

  state.selectedImageIndex =
    imageIndex;

  state.productViewOpen =
    true;


  /*
    Hide category filters.
  */

  const categorySection =
    document.querySelector(
      ".category-filter-section"
    );


  if (categorySection) {

    categorySection.classList.add(
      "hidden"
    );

  }


  /*
    Render ONLY this product.
  */

  const container =
    $("#productsContainer");


  if (!container) {
    return;
  }


  container.innerHTML =
    renderSingleProductPage(
      product,
      imageIndex
    );


  updateStickyOrder(
    product
  );


  if (updateUrl) {

    updateProductUrl(
      product.id,
      imageIndex
    );

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   SINGLE PRODUCT PAGE HTML
========================================================= */

function renderSingleProductPage(
  product,
  imageIndex
) {

  const images =
    getImages(
      product
    );


  const selectedImage =
    images[
      imageIndex
    ]?.url ||
    product.imageUrl ||
    "";


  const price =
    calculateProductPrice(
      product
    );


  const variants =
    renderProductVariants(
      product
    );


  const otherProducts =
    state.products.filter(
      item =>
        item.id !==
        product.id
    );


  return `

    <article
      class="product-card single-product-card"
      data-product-card="${escapeAttr(
        product.id
      )}"
    >

      ${
        selectedImage
          ? `
            <div
              style="
                padding:10px;
              "
            >

              <img
                class="detail-large-image"
                src="${escapeAttr(
                  selectedImage
                )}"
                alt="${escapeAttr(
                  product.name || ""
                )}"
              >

            </div>
          `
          : ""
      }


      ${
        images.length > 1
          ? `
            <div
              class="detail-thumbnails"
              style="
                padding:
                  0 10px 10px;
              "
            >

              ${images
                .map(
                  (
                    image,
                    index
                  ) => `

                    <button
                      type="button"
                      class="detail-thumb ${
                        index ===
                        imageIndex
                          ? "active"
                          : ""
                      }"
                      data-product-id="${escapeAttr(
                        product.id
                      )}"
                      data-image-index="${index}"
                    >

                      <img
                        src="${escapeAttr(
                          image.url
                        )}"
                        alt=""
                      >

                    </button>

                  `
                )
                .join("")}

            </div>
          `
          : ""
      }


      <div
        class="detail-info"
        style="
          padding:
            8px 15px 20px;
        "
      >

        <div
          style="
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
          "
        >

          <div>

            <h2>
              ${escapeHtml(
                product.name || ""
              )}
            </h2>


            ${
              product.description
                ? `
                  <p class="detail-description">
                    ${escapeHtml(
                      product.description
                    )}
                  </p>
                `
                : ""
            }


            <div
              class="detail-price"
              id="detailPrice-${escapeAttr(
                product.id
              )}"
            >
              ₹${formatMoney(
                price
              )}
            </div>

          </div>


          <button
            type="button"
            class="product-order-btn"
            data-product-id="${escapeAttr(
              product.id
            )}"
          >
            Order
          </button>

        </div>


        ${
          variants
            ? `
              <div
                class="variant-area"
                style="
                  padding:
                    0;
                  margin-top:10px;
                "
              >
                ${variants}
              </div>
            `
            : ""
        }

      </div>


      ${
        otherProducts.length
          ? `

            <div
              style="
                padding:
                  0 15px 20px;
              "
            >

              <div class="other-products-title">
                Other Products
              </div>


              <div class="other-products">

                ${otherProducts
                  .map(
                    other => {

                      const image =
                        getImages(
                          other
                        )[0]?.url ||
                        other.imageUrl ||
                        "";


                      return `

                        <div
                          class="other-product"
                          data-product-id="${escapeAttr(
                            other.id
                          )}"
                        >

                          ${
                            image
                              ? `
                                <img
                                  src="${escapeAttr(
                                    image
                                  )}"
                                  alt="${escapeAttr(
                                    other.name || ""
                                  )}"
                                  loading="lazy"
                                >
                              `
                              : `
                                <div
                                  style="
                                    height:110px;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                  "
                                >
                                  📦
                                </div>
                              `
                          }


                          <div class="other-product-info">

                            <span class="other-product-name">
                              ${escapeHtml(
                                other.name || ""
                              )}
                            </span>


                            <div class="other-product-price">
                              ₹${formatMoney(
                                other.price
                              )}
                            </div>

                          </div>

                        </div>

                      `;

                    }
                  )
                  .join("")}

              </div>

            </div>

          `
          : ""
      }

    </article>

  `;

}


/* =========================================================
   UPDATE DETAIL PRICE
========================================================= */

function updateDetailPrice(
  productId
) {

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {
    return;
  }


  const element =
    document.querySelector(
      `#detailPrice-${CSS.escape(
        productId
      )}`
    );


  if (element) {

    element.textContent =
      `₹${formatMoney(
        calculateProductPrice(
          product
        )
      )}`;

  }


  updateStickyOrder(
    product
  );

}


/* =========================================================
   CLOSE SINGLE PRODUCT VIEW
========================================================= */

function closeSingleProductView() {

  if (
    !state.productViewOpen
  ) {

    return;

  }


  state.productViewOpen =
    false;

  state.selectedProduct =
    null;

  state.selectedImageIndex =
    0;


  const categorySection =
    document.querySelector(
      ".category-filter-section"
    );


  if (categorySection) {

    categorySection.classList.remove(
      "hidden"
    );

  }


  const container =
    $("#productsContainer");


  if (container) {

    renderProducts();

  }


  const url =
    new URL(
      window.location.href
    );


  url.searchParams.delete(
    "product"
  );

  url.searchParams.delete(
    "image"
  );


  window.history.replaceState(
    {},
    "",
    url
  );


  hideStickyOrder();

}


/* =========================================================
   UPDATE URL
========================================================= */

function updateProductUrl(
  productId,
  imageIndex
) {

  const url =
    new URL(
      window.location.href
    );


  url.searchParams.set(
    "product",
    productId
  );


  url.searchParams.set(
    "image",
    String(
      imageIndex
    )
  );


  window.history.pushState(
    {},
    "",
    url
  );

}


/* =========================================================
   DEEP LINK
========================================================= */

function handleDeepLink() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const productId =
    params.get(
      "product"
    );


  if (!productId) {

    closeSingleProductView();

    return;

  }


  const imageIndex =
    Number(
      params.get(
        "image"
      ) || 0
    );


  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {

    return;

  }


  openProductDetail(
    productId,
    imageIndex,
    false
  );

}


/* =========================================================
   STICKY ORDER
========================================================= */

function updateStickyOrder(
  product
) {

  const bar =
    $("#stickyOrderBar");


  if (!bar) {
    return;
  }


  state.orderProduct =
    product;


  $("#stickyProductName")
    .textContent =
      product.name ||
      "Product";


  $("#stickyProductPrice")
    .textContent =
      `₹${formatMoney(
        calculateProductPrice(
          product
        )
      )}`;


  bar.classList.remove(
    "hidden"
  );

}


function hideStickyOrder() {

  const bar =
    $("#stickyOrderBar");


  if (bar) {

    bar.classList.add(
      "hidden"
    );

  }


  state.orderProduct =
    null;

}


/* =========================================================
   ORDER MODAL
========================================================= */

function openOrderModal(
  product
) {

  state.orderProduct =
    product;


  const price =
    calculateProductPrice(
      product
    );


  const images =
    getImages(
      product
    );


  const image =
    images[
      state.selectedImageIndex
    ]?.url ||
    images[0]?.url ||
    product.imageUrl ||
    "";


  const selectedVariants =
    getSelectedVariantDetails(
      product
    );


  const variantText =
    selectedVariants.length
      ? selectedVariants
          .map(
            item =>
              `${item.label}: ${item.name}`
          )
          .join(" • ")
      : "No variants";


  $("#orderSummary")
    .innerHTML = `

      ${
        image
          ? `
            <img
              class="order-summary-image"
              src="${escapeAttr(
                image
              )}"
              alt=""
            >
          `
          : ""
      }


      <div class="order-summary-info">

        <strong>
          ${escapeHtml(
            product.name || ""
          )}
        </strong>


        <small>
          ${escapeHtml(
            variantText
          )}
        </small>


        <div class="order-summary-price">
          ₹${formatMoney(
            price
          )}
        </div>

      </div>

    `;


  $("#orderMessage")
    .textContent =
      "";


  $("#orderModal")
    .classList.remove(
      "hidden"
    );


  setTimeout(
    () =>
      $("#customerName")
        ?.focus(),
    50
  );

}


function closeOrderModal() {

  $("#orderModal")
    ?.classList.add(
      "hidden"
    );

}


/* =========================================================
   SUBMIT ORDER
========================================================= */

async function submitOrder(
  event
) {

  event.preventDefault();


  const product =
    state.orderProduct;


  if (!product) {
    return;
  }


  const name =
    $("#customerName")
      .value
      .trim();


  const phone =
    $("#customerPhone")
      .value
      .trim();


  const address =
    $("#customerAddress")
      .value
      .trim();


  const pincode =
    $("#customerPincode")
      .value
      .trim();


  const message =
    $("#orderMessage");


  const submit =
    $("#submitOrderBtn");


  if (
    !/^[0-9]{10}$/.test(
      phone
    )
  ) {

    message.textContent =
      "Please enter a valid 10 digit mobile number.";

    return;

  }


  if (
    !/^[0-9]{6}$/.test(
      pincode
    )
  ) {

    message.textContent =
      "Please enter a valid 6 digit PIN code.";

    return;

  }


  /*
    Extra safety:
    make sure all variants are selected
    before submitting.
  */

  const groups =
    getVariantGroups(
      product
    );


  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const missing =
    groups.find(
      group =>
        !selected[
          group.key
        ]
    );


  if (missing) {

    closeOrderModal();

    openVariantSelectionPopup(
      product
    );

    return;

  }


  submit.disabled =
    true;

  submit.textContent =
    "Creating Order...";


  message.textContent =
    "";


  try {

    const price =
      calculateProductPrice(
        product
      );


    const images =
      getImages(
        product
      );


    const clickedImage =
      images[
        state.selectedImageIndex
      ]?.url ||
      images[0]?.url ||
      product.imageUrl ||
      "";


    const selectedVariants =
      getSelectedVariantDetails(
        product
      );


    const variantObject =
      {};


    selectedVariants
      .forEach(
        item => {

          variantObject[
            item.label
          ] =
            item.name;

        }
      );


    const productLink =
      new URL(
        window.location.href
      );


    productLink.searchParams.set(
      "product",
      product.id
    );


    productLink.searchParams.set(
      "image",
      String(
        state.selectedImageIndex
      )
    );


    productLink.hash =
      "";


    const response =
      await fetch(
        "/api/orders",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({

              customer: {

                name,

                phone,

                address,

                pincode

              },


              product: {

                id:
                  product.id,

                name:
                  product.name,

                image:
                  clickedImage,

                colour:
                  variantObject.Colour ||
                  "",

                size:
                  variantObject.Size ||
                  "",

                price,

                variants:
                  variantObject,

                productLink:
                  productLink.toString()

              }

            })

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch {}


    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Could not create order."
      );

    }


    const orderId =
      data?.orderId ||
      data?.id ||
      `IG-${Date.now()}`;


    const whatsappMessage =
      buildWhatsAppMessage({

        orderId,

        name,

        phone,

        address,

        pincode,

        product,

        price,

        clickedImage,

        selectedVariants,

        productLink:
          productLink.toString()

      });


    const whatsappUrl =
      `https://wa.me/${CONFIG.whatsappNumber}` +
      `?text=${encodeURIComponent(
        whatsappMessage
      )}`;


    closeOrderModal();


    window.location.href =
      whatsappUrl;


  } catch (error) {

    console.error(
      "Order error:",
      error
    );


    message.textContent =
      error.message;

  } finally {

    submit.disabled =
      false;

    submit.textContent =
      "Order on WhatsApp";

  }

}


/* =========================================================
   WHATSAPP MESSAGE
========================================================= */

function buildWhatsAppMessage(
  data
) {

  const variants =
    data.selectedVariants;


  let variantText =
    "None";


  if (
    variants.length
  ) {

    variantText =
      variants
        .map(
          item =>
            `${item.label}: ${item.name}`
        )
        .join("\n");

  }


  return `
🛍️ *NEW ORDER — IMAGINARY GIFTS*

━━━━━━━━━━━━━━━━━━

🆔 *Order ID*
${data.orderId}

━━━━━━━━━━━━━━━━━━

👤 *CUSTOMER DETAILS*

Name: ${data.name}
Mobile: ${data.phone}

Address:
${data.address}

PIN Code: ${data.pincode}

━━━━━━━━━━━━━━━━━━

📦 *PRODUCT DETAILS*

Product:
${data.product.name}

Price:
₹${formatMoney(
    data.price
  )}

Variants:
${variantText}

━━━━━━━━━━━━━━━━━━

🖼️ *PRODUCT IMAGE*

${data.clickedImage}

━━━━━━━━━━━━━━━━━━

🔗 *PRODUCT LINK*

${data.productLink}

━━━━━━━━━━━━━━━━━━

Please confirm the order.
`.trim();

}