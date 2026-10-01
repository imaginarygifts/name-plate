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
     VARIANT POPUP OPTION
     
     IMPORTANT:
     This MUST come BEFORE the generic
     .variant-option handler because popup
     buttons have BOTH classes:

     .variant-option
     .order-variant-option
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
     NORMAL PRODUCT / DETAIL VARIANT
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
    String(
      state.selectedVariants[
        product.id
      ]?.[groupKey] ?? ""
    );


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

              /*
                IMPORTANT:
                Always convert option ID
                to string.

                This prevents:
                number 123 !== string "123"
              */

              const optionId =
                String(
                  option.id ??
                  option.name ??
                  ""
                );


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
========================================================= */

function handleVariantSelection(
  button
) {

  const productId =
    button.dataset.productId;

  const group =
    button.dataset.variantGroup;

  const optionId =
    String(
      button.dataset.optionId || ""
    );


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
    Only change active state.
    The complete card is NOT rerendered.
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


  /*
    If this is the currently opened
    product page, update its price too.
  */

  if (
    state.productViewOpen &&
    state.selectedProduct?.id ===
      productId
  ) {

    const detailPrice =
      document.querySelector(
        `#detailPrice-${CSS.escape(
          productId
        )}`
      );


    if (detailPrice) {

      detailPrice.textContent =
        `₹${formatMoney(
          price
        )}`;

    }

  }


  /*
    Update sticky order price.
  */

  if (
    state.orderProduct?.id ===
    productId
  ) {

    const stickyPrice =
      $("#stickyProductPrice");


    if (stickyPrice) {

      stickyPrice.textContent =
        `₹${formatMoney(
          price
        )}`;

    }

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

    const selectedColourId =
      String(
        selected.colours
      );


    applyOption(
      colours.find(
        option =>
          String(
            option.id ??
            option.name ??
            ""
          ) ===
          selectedColourId
      )
    );

  }


  if (
    selected.sizes
  ) {

    const selectedSizeId =
      String(
        selected.sizes
      );


    applyOption(
      sizes.find(
        option =>
          String(
            option.id ??
            option.name ??
            ""
          ) ===
          selectedSizeId
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


      const selectedCustomId =
        String(
          selectedId
        );


      const option =
        (
          variant.options ||
          []
        ).find(
          item =>
            String(
              item.id ??
              item.name ??
              ""
            ) ===
            selectedCustomId
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


    const selectedOptionId =
      String(
        selectedId
      );


    const option =
      options.find(
        item =>
          String(
            item.id ??
            item.name ??
            ""
          ) ===
          selectedOptionId
      );


    if (option) {

      result.push({

        label,

        name:
          option.name || "",

        optionId:
          String(
            option.id ??
            option.name ??
            ""
          ),

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
   CHECK WHETHER ALL VARIANTS ARE SELECTED
========================================================= */

function areAllVariantsSelected(
  product
) {

  const groups =
    getVariantGroups(
      product
    );


  /*
    No variants means
    nothing needs to be selected.
  */

  if (
    !groups.length
  ) {

    return true;

  }


  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  return groups.every(
    group =>
      Boolean(
        selected[
          group.key
        ]
      )
  );

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
    ======================================================
    CURRENT WORKING BEHAVIOUR PRESERVED

    If ALL variants have already been
    selected on the product card/detail
    page, do NOT show the popup.

    Go directly to customer form.
    ======================================================
  */

  if (
    areAllVariantsSelected(
      product
    )
  ) {

    openOrderModal(
      product
    );

    return;

  }


  /*
    At least one variant is missing.
    Show selection popup.
  */

  openVariantSelectionPopup(
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
                    font-size:15px;
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
          : `
            <div
              style="
                margin-bottom:15px;
              "
            >
              <span
                id="variantPopupPrice"
                style="
                  display:block;
                  color:#c084fc;
                  font-size:15px;
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
          `
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

                        /*
                          IMPORTANT:
                          Normalize ID to string.
                        */

                        const optionId =
                          String(
                            option.id ??
                            option.name ??
                            ""
                          );


                        const isSelected =
                          String(
                            selected[
                              group.key
                            ] ?? ""
                          ) ===
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

  /*
    ALWAYS store as string.
    This prevents numeric/string ID mismatch.
  */

  const optionId =
    String(
      button.dataset.optionId || ""
    );


  if (
    !state.selectedVariants[
      productId
    ]
  ) {

    state.selectedVariants[
      productId
    ] = {};

  }


  /*
    Save selected option.
  */

  state.selectedVariants[
    productId
  ][group] =
    optionId;


  /*
    IMPORTANT:
    Only update classes.

    DO NOT rebuild popup.

    This keeps popup scroll position.
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


  /*
    LIVE PRICE UPDATE
  */

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (product) {

    const price =
      calculateProductPrice(
        product
      );


    const priceElement =
      $("#variantPopupPrice");


    if (priceElement) {

      priceElement.textContent =
        `₹${formatMoney(
          price
        )}`;

    }


    /*
      Also update the product/detail/sticky
      price without rebuilding anything.
    */

    updatePriceDisplays(
      productId
    );

  }


  /*
    Clear previous validation message.
  */

  const message =
    $("#variantSelectionMessage");


  if (message) {

    message.textContent =
      "";

  }

}


/* =========================================================
   CONTINUE ORDER AFTER VARIANT SELECTION
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


    /*
      Bring the missing group
      into view if possible.
    */

    const popup =
      $("#variantSelectionModal");


    if (popup) {

      const groupsInPopup =
        popup.querySelectorAll(
          ".variant-group"
        );


      const missingIndex =
        groups.findIndex(
          group =>
            group.key ===
            missing.key
        );


      if (
        groupsInPopup[
          missingIndex
        ]
      ) {

        groupsInPopup[
          missingIndex
        ].scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      }

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


  const categorySection =
    document.querySelector(
      ".category-filter-section"
    );


  if (categorySection) {

    categorySection.classList.add(
      "hidden"
    );

  }


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
                  padding:0;
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

    if (
      state.productViewOpen
    ) {

      closeSingleProductView();

    }

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


  if (!name) {

    message.textContent =
      "Please enter your name.";

    return;

  }


  if (
    !/^[0-9]{10}$/.test(
      phone
    )
  ) {

    message.textContent =
      "Please enter a valid 10 digit mobile number.";

    return;

  }


  if (!address) {

    message.textContent =
      "Please enter your complete address.";

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
    make sure every available variant
    is selected before saving.
  */

  if (
    !areAllVariantsSelected(
      product
    )
  ) {

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

    /*
      FINAL PRICE
    */

    const price =
      calculateProductPrice(
        product
      );


    /*
      ALL SELECTED VARIANTS
    */

    const selectedVariants =
      getSelectedVariantDetails(
        product
      );


    /*
      Complete selected variant object
      for database storage.
    */

    const variantsObject =
      {};


    selectedVariants
      .forEach(
        item => {

          variantsObject[
            item.label
          ] = {

            optionId:
              item.optionId,

            name:
              item.name,

            priceType:
              item.priceType,

            price:
              item.price

          };

        }
      );


    /*
      IMAGE
    */

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


    /*
      PRODUCT LINK
    */

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


    /*
      BASE PRICE
    */

    const basePrice =
      Number(
        product.price || 0
      );


    /*
      BACKEND PAYLOAD
    */

    const orderPayload = {

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

        description:
          product.description || "",

        image:
          clickedImage,

        imageUrl:
          clickedImage,

        imageIndex:
          state.selectedImageIndex,

        price:
          price,

        basePrice:
          basePrice,

        finalPrice:
          price,

        colour:
          variantsObject.Colour?.name ||
          "",

        size:
          variantsObject.Size?.name ||
          "",

        /*
          Human readable variants.
        */

        variants:
          variantsObject,

        /*
          Raw selection IDs.
        */

        selections:
          clone(
            state.selectedVariants[
              product.id
            ] || {}
          ),

        /*
          Complete product data snapshot.
          This is useful in Admin Orders because
          if the product is edited/deleted later,
          the old order still has its details.
        */

        productData:
          clone(
            product.data || {}
          ),

        productLink:
          productLink.toString()

      }

    };


    /*
      SAVE TO CLOUDFLARE D1
    */

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
            JSON.stringify(
              orderPayload
            )

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Could not create order."
      );

    }


    /*
      Order ID is generated by Worker.
    */

    const orderId =
      data?.orderId ||
      data?.id ||
      "";


    /*
      WHATSAPP MESSAGE
    */

    const whatsappMessage =
      buildWhatsAppMessage({

        orderId,

        name,

        phone,

        address,

        pincode,

        product,

        basePrice,

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


    /*
      CLOSE CUSTOMER FORM
    */

    closeOrderModal();


    /*
      OPEN WHATSAPP
    */

    window.location.href =
      whatsappUrl;


  } catch (error) {

    console.error(
      "Order error:",
      error
    );


    message.textContent =
      error.message ||
      "Could not create order.";

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

  let variantText =
    "None";


  if (
    data.selectedVariants.length
  ) {

    variantText =
      data.selectedVariants
        .map(
          item =>
            `${item.label}: ${item.name}`
        )
        .join("\n");

  }


  return `
🛍️ *NEW ORDER — IMAGINARY GIFTS*

━━━━━━━━━━━━━━━━━━

🆔 *ORDER ID*
${data.orderId}

━━━━━━━━━━━━━━━━━━

👤 *CUSTOMER DETAILS*

Name: ${data.name}

Mobile:
${data.phone}

Address:
${data.address}

Pincode:
${data.pincode}

━━━━━━━━━━━━━━━━━━

📦 *PRODUCT DETAILS*

Product:
${data.product.name}

Product ID:
${data.product.id}

Base Price:
₹${formatMoney(
    data.basePrice
  )}

Final Price:
₹${formatMoney(
    data.price
  )}

━━━━━━━━━━━━━━━━━━

🎨 *SELECTED OPTIONS*

${variantText}

━━━━━━━━━━━━━━━━━━

🖼️ *PRODUCT IMAGE*

https://catalogue.imaginarygifts.workers.dev${data.clickedImage || "Not available"}

━━━━━━━━━━━━━━━━━━

🔗 *PRODUCT LINK*

${data.productLink}

━━━━━━━━━━━━━━━━━━

Please confirm this order.
`.trim();

}