/* =========================================================
   IMAGINARY GIFTS - CATALOGUE FRONTEND
   ========================================================= */

const CONFIG = {
  // CHANGE THIS TO YOUR WHATSAPP BUSINESS NUMBER
  // Example: 919876543210
  whatsappNumber: "919730157585"
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
  productViewOpen: false,

  // Product ID => {
  //   groupId: optionId
  // }
  variantSelections: {},

  // Current order
  orderProduct: null,
  orderImageIndex: 0,
  orderSelections: {},

  orderId: null
};


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getProductData(product) {
  return product?.data || {};
}

function getProductImage(product, index = 0) {
  const data = getProductData(product);

  const images = Array.isArray(data.images)
    ? data.images
    : [];

  if (!images.length) {
    return product?.imageUrl || "";
  }

  const image = images[index];

  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return (
    image.url ||
    image.imageUrl ||
    image.objectKey ||
    image.key ||
    ""
  );
}

function getProductImages(product) {
  const data = getProductData(product);

  const images = Array.isArray(data.images)
    ? data.images
    : [];

  if (!images.length) {
    return product?.imageUrl
      ? [product.imageUrl]
      : [];
  }

  return images
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      return (
        image.url ||
        image.imageUrl ||
        image.objectKey ||
        image.key ||
        ""
      );
    })
    .filter(Boolean);
}


/* =========================================================
   VARIANT HELPERS
   ========================================================= */

function normalizeVariantGroup(group, index) {
  if (!group) return null;

  const groupId =
    String(
      group.id ||
      group.variantId ||
      group.key ||
      group.name ||
      `variant-${index}`
    );

  const groupName =
    group.name ||
    group.title ||
    `Option ${index + 1}`;

  const rawOptions =
    Array.isArray(group.options)
      ? group.options
      : [];

  const options = rawOptions.map((option, optionIndex) => {
    if (typeof option === "string") {
      return {
        id: `${groupId}-${optionIndex}`,
        name: option,
        priceType: "fixed",
        price: 0
      };
    }

    return {
      id: String(
        option.id ||
        option.optionId ||
        `${groupId}-${optionIndex}`
      ),

      name:
        option.name ||
        option.title ||
        `Option ${optionIndex + 1}`,

      priceType:
        option.priceType ||
        option.type ||
        "fixed",

      price: Number(
        option.price ??
        option.amount ??
        0
      )
    };
  });

  return {
    id: groupId,
    name: groupName,
    options
  };
}


function getVariantGroups(product) {
  const data = getProductData(product);

  const groups = [];

  /*
   * Custom variant groups
   *
   * Example:
   * variants: [
   *   {
   *     id: "thickness",
   *     name: "Thickness",
   *     options: [...]
   *   }
   * ]
   */

  if (Array.isArray(data.variants)) {
    data.variants.forEach((group, index) => {
      const normalized = normalizeVariantGroup(group, index);

      if (normalized && normalized.options.length) {
        groups.push(normalized);
      }
    });
  }

  /*
   * Colour
   */

  if (Array.isArray(data.colours) && data.colours.length) {
    const group = normalizeVariantGroup(
      {
        id: "colour",
        name: "Colour",
        options: data.colours
      },
      groups.length
    );

    if (group) {
      groups.unshift(group);
    }
  }

  /*
   * Size
   */

  if (Array.isArray(data.sizes) && data.sizes.length) {
    const group = normalizeVariantGroup(
      {
        id: "size",
        name: "Size",
        options: data.sizes
      },
      groups.length
    );

    if (group) {
      groups.push(group);
    }
  }

  /*
   * Remove duplicate groups
   */

  const seen = new Set();

  return groups.filter(group => {
    if (seen.has(group.id)) {
      return false;
    }

    seen.add(group.id);
    return true;
  });
}


/* =========================================================
   VARIANT SELECTION STATE
   ========================================================= */

function getSelections(product) {
  if (!product?.id) {
    return {};
  }

  if (!state.variantSelections[product.id]) {
    state.variantSelections[product.id] = {};
  }

  return state.variantSelections[product.id];
}


function setVariantSelection(product, groupId, optionId) {
  if (!product?.id) return;

  const selections = getSelections(product);

  selections[groupId] = optionId;
}


function getSelectedOption(product, group) {
  const selections = getSelections(product);

  const optionId = selections[group.id];

  if (!optionId) {
    return null;
  }

  return (
    group.options.find(
      option => String(option.id) === String(optionId)
    ) || null
  );
}


function allVariantsSelected(product) {
  const groups = getVariantGroups(product);

  if (!groups.length) {
    return true;
  }

  const selections = getSelections(product);

  return groups.every(group => {
    const selectedId = selections[group.id];

    return Boolean(
      selectedId &&
      group.options.some(
        option =>
          String(option.id) === String(selectedId)
      )
    );
  });
}


/* =========================================================
   PRICE CALCULATION
   ========================================================= */

function calculateVariantPrice(basePrice, option) {
  if (!option) {
    return 0;
  }

  const value = Number(option.price || 0);

  if (!value) {
    return 0;
  }

  const type = String(
    option.priceType || "fixed"
  ).toLowerCase();

  if (
    type === "percentage" ||
    type === "percent" ||
    type === "%"
  ) {
    return Number(basePrice || 0) * value / 100;
  }

  return value;
}


function calculateProductPrice(product, selections = null) {
  const basePrice = Number(
    product?.price || 0
  );

  const groups = getVariantGroups(product);

  const selected =
    selections ||
    getSelections(product);

  let finalPrice = basePrice;

  groups.forEach(group => {
    const optionId = selected[group.id];

    if (!optionId) {
      return;
    }

    const option = group.options.find(
      item =>
        String(item.id) === String(optionId)
    );

    if (!option) {
      return;
    }

    finalPrice += calculateVariantPrice(
      basePrice,
      option
    );
  });

  return Math.round(finalPrice);
}


/* =========================================================
   SELECTED VARIANT DETAILS
   ========================================================= */

function getSelectedVariantDetails(product, selections = null) {
  const groups = getVariantGroups(product);

  const selected =
    selections ||
    getSelections(product);

  return groups
    .map(group => {
      const optionId = selected[group.id];

      if (!optionId) {
        return null;
      }

      const option = group.options.find(
        item =>
          String(item.id) === String(optionId)
      );

      if (!option) {
        return null;
      }

      return {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceType: option.priceType,
        price: Number(option.price || 0)
      };
    })
    .filter(Boolean);
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "cache-control": "no-cache"
    }
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      `Request failed: ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {
  const data = await api("/api/products");

  state.products =
    Array.isArray(data)
      ? data.filter(product => product.active !== false)
      : [];

  renderProducts();
}


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {
  try {
    const data =
      await api("/api/admin/categories");

    state.categories =
      Array.isArray(data)
        ? data.filter(category => category.active !== false)
        : [];

    renderCategories();
  } catch (error) {
    console.error(
      "Category loading failed:",
      error
    );

    state.categories = [];

    renderCategories();
  }
}


/* =========================================================
   CATEGORIES
   ========================================================= */

function renderCategories() {
  const container =
    $("#categoryPills");

  if (!container) return;

  let html = `
    <button
      class="category-pill active"
      data-category=""
    >
      All
    </button>
  `;

  state.categories.forEach(category => {
    html += `
      <button
        class="category-pill"
        data-category="${escapeHtml(category.id)}"
      >
        ${escapeHtml(category.name)}
      </button>
    `;
  });

  container.innerHTML = html;

  $$(".category-pill", container)
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          state.selectedCategory =
            button.dataset.category || "";

          $$(".category-pill", container)
            .forEach(item =>
              item.classList.toggle(
                "active",
                item === button
              )
            );

          renderProducts();
        }
      );
    });
}


/* =========================================================
   CATEGORY MATCH
   ========================================================= */

function productMatchesCategory(product) {
  if (!state.selectedCategory) {
    return true;
  }

  const data = getProductData(product);

  return (
    String(data.categoryId || "") ===
      String(state.selectedCategory) ||

    String(data.category_id || "") ===
      String(state.selectedCategory)
  );
}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function renderProductCard(product) {
  const images =
    getProductImages(product);

  const firstImage =
    images[0] ||
    product.imageUrl ||
    "";

  const groups =
    getVariantGroups(product);

  const selections =
    getSelections(product);

  const price =
    calculateProductPrice(
      product,
      selections
    );

  let variantsHtml = "";

  groups.forEach(group => {
    variantsHtml += `
      <div
        class="product-variant-group"
        data-group-id="${escapeHtml(group.id)}"
      >
        <div class="product-variant-title">
          ${escapeHtml(group.name)}
        </div>

        <div class="product-variant-options">
          ${group.options.map(option => {

            const selected =
              String(selections[group.id]) ===
              String(option.id);

            const optionPrice =
              Number(option.price || 0);

            let priceText = "";

            if (optionPrice > 0) {
              if (
                option.priceType === "percentage" ||
                option.priceType === "percent" ||
                option.priceType === "%"
              ) {
                priceText =
                  ` +${optionPrice}%`;
              } else {
                priceText =
                  ` +${money(optionPrice)}`;
              }
            }

            return `
              <button
                type="button"
                class="variant-option ${selected ? "active" : ""}"
                data-group-id="${escapeHtml(group.id)}"
                data-option-id="${escapeHtml(option.id)}"
              >
                ${escapeHtml(option.name)}
                ${priceText}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  });

  return `
    <article
      class="product-card"
      data-product-id="${escapeHtml(product.id)}"
    >

      <div
        class="product-card-image-wrap"
        data-action="open-product"
      >
        ${
          firstImage
            ? `
              <img
                class="product-grid-image"
                src="${escapeHtml(firstImage)}"
                alt="${escapeHtml(product.name)}"
                loading="lazy"
              >
            `
            : `
              <div class="product-no-image">
                No Image
              </div>
            `
        }
      </div>

      <div class="product-card-content">

        <div class="product-title-row">

          <div class="product-title-block">
            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <div
              class="product-card-price"
              data-price
            >
              ${money(price)}
            </div>
          </div>

          <button
            type="button"
            class="product-order-btn"
            data-action="order"
          >
            Order
          </button>

        </div>

        ${
          product.description
            ? `
              <div class="product-description">
                ${escapeHtml(product.description)}
              </div>
            `
            : ""
        }

        ${
          variantsHtml
            ? `
              <div class="product-variants">
                ${variantsHtml}
              </div>
            `
            : ""
        }

      </div>
    </article>
  `;
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {
  const container =
    $("#productsContainer");

  if (!container) return;

  const products =
    state.products.filter(
      product =>
        productMatchesCategory(product)
    );

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-products">
        No products found.
      </div>
    `;

    return;
  }

  container.innerHTML =
    products
      .map(renderProductCard)
      .join("");

  bindProductEvents();
}


/* =========================================================
   PRODUCT EVENTS
   ========================================================= */

function bindProductEvents() {
  $$(".product-card")
    .forEach(card => {

      const productId =
        card.dataset.productId;

      const product =
        state.products.find(
          item =>
            String(item.id) ===
            String(productId)
        );

      if (!product) return;

      /*
       * IMAGE
       */

      const imageArea =
        $('[data-action="open-product"]', card);

      if (imageArea) {
        imageArea.addEventListener(
          "click",
          () => {
            openProductDetail(
              product,
              0
            );
          }
        );
      }

      /*
       * ORDER
       */

      const orderButton =
        $('[data-action="order"]', card);

      if (orderButton) {
        orderButton.addEventListener(
          "click",
          event => {
            event.stopPropagation();

            startOrderFlow(
              product,
              0
            );
          }
        );
      }

      /*
       * VARIANTS
       *
       * IMPORTANT:
       * Do NOT re-render the complete card.
       * This prevents horizontal variant
       * scrolling from jumping back.
       */

      $$(".variant-option", card)
        .forEach(button => {

          button.addEventListener(
            "click",
            event => {

              event.preventDefault();
              event.stopPropagation();

              const groupId =
                button.dataset.groupId;

              const optionId =
                button.dataset.optionId;

              setVariantSelection(
                product,
                groupId,
                optionId
              );

              /*
               * Update only active buttons
               */

              const group =
                button.closest(
                  ".product-variant-group"
                );

              if (group) {
                $$(".variant-option", group)
                  .forEach(item => {
                    item.classList.toggle(
                      "active",
                      item === button
                    );
                  });
              }

              /*
               * Update price only
               */

              const price =
                calculateProductPrice(
                  product
                );

              const priceElement =
                $("[data-price]", card);

              if (priceElement) {
                priceElement.textContent =
                  money(price);
              }
            }
          );

        });

    });
}


/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

function openProductDetail(
  product,
  imageIndex = 0
) {
  state.selectedProduct = product;
  state.selectedImageIndex =
    Number(imageIndex || 0);

  state.productViewOpen = true;

  const detail =
    $("#productDetailView");

  const products =
    $("#productsContainer");

  const categorySection =
    $(".category-filter-section");

  if (!detail) {
    console.error(
      "Missing #productDetailView"
    );

    return;
  }

  if (products) {
    products.style.display = "none";
  }

  if (categorySection) {
    categorySection.style.display =
      "none";
  }

  detail.style.display = "block";

  renderProductDetail();

  updateProductUrl(
    product.id,
    state.selectedImageIndex
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   DETAIL RENDER
   ========================================================= */

function renderProductDetail() {
  const product =
    state.selectedProduct;

  const detail =
    $("#productDetailView");

  if (!product || !detail) {
    return;
  }

  const images =
    getProductImages(product);

  if (
    state.selectedImageIndex >= images.length
  ) {
    state.selectedImageIndex = 0;
  }

  const selectedImage =
    images[state.selectedImageIndex] ||
    product.imageUrl ||
    "";

  const groups =
    getVariantGroups(product);

  const selections =
    getSelections(product);

  const price =
    calculateProductPrice(
      product,
      selections
    );

  detail.innerHTML = `

    <div class="product-detail-inner">

      <button
        type="button"
        class="product-detail-back"
        id="closeProductDetail"
      >
        ← Back
      </button>

      <div class="detail-main-image-wrap">

        ${
          selectedImage
            ? `
              <img
                class="detail-large-image"
                src="${escapeHtml(selectedImage)}"
                alt="${escapeHtml(product.name)}"
              >
            `
            : `
              <div class="product-no-image">
                No Image
              </div>
            `
        }

      </div>

      ${
        images.length > 1
          ? `
            <div class="detail-thumbnails">
              ${images.map((image, index) => `
                <button
                  type="button"
                  class="detail-thumb ${
                    index === state.selectedImageIndex
                      ? "active"
                      : ""
                  }"
                  data-image-index="${index}"
                >
                  <img
                    src="${escapeHtml(image)}"
                    alt=""
                  >
                </button>
              `).join("")}
            </div>
          `
          : ""
      }

      <div class="detail-info">

        <div class="detail-title-row">

          <h1>
            ${escapeHtml(product.name)}
          </h1>

          <button
            type="button"
            class="detail-order-btn"
            id="detailOrderButton"
          >
            Order
          </button>

        </div>

        <div
          class="detail-price"
          id="detailPrice"
        >
          ${money(price)}
        </div>

        ${
          product.description
            ? `
              <div class="detail-description">
                ${escapeHtml(product.description)}
              </div>
            `
            : ""
        }

        ${
          groups.length
            ? `
              <div class="detail-variants">

                ${groups.map(group => {

                  const selected =
                    selections[group.id];

                  return `
                    <div
                      class="detail-variant-group"
                      data-group-id="${escapeHtml(group.id)}"
                    >

                      <div class="detail-variant-title">
                        ${escapeHtml(group.name)}
                      </div>

                      <div class="detail-variant-options">

                        ${group.options.map(option => {

                          const active =
                            String(selected) ===
                            String(option.id);

                          let priceText = "";

                          if (
                            Number(option.price || 0) > 0
                          ) {
                            if (
                              option.priceType === "percentage" ||
                              option.priceType === "percent" ||
                              option.priceType === "%"
                            ) {
                              priceText =
                                ` +${option.price}%`;
                            } else {
                              priceText =
                                ` +${money(option.price)}`;
                            }
                          }

                          return `
                            <button
                              type="button"
                              class="detail-variant-option ${
                                active ? "active" : ""
                              }"
                              data-group-id="${escapeHtml(group.id)}"
                              data-option-id="${escapeHtml(option.id)}"
                            >
                              ${escapeHtml(option.name)}
                              ${priceText}
                            </button>
                          `;

                        }).join("")}

                      </div>

                    </div>
                  `;

                }).join("")}

              </div>
            `
            : ""
        }

      </div>

      <div class="other-products-section">

        <h2>
          Other Products
        </h2>

        <div class="other-products-grid">

          ${
            state.products
              .filter(item =>
                String(item.id) !==
                String(product.id)
              )
              .map(item => `
                <div
                  class="other-product"
                  data-other-product-id="${escapeHtml(item.id)}"
                >

                  <img
                    src="${escapeHtml(
                      getProductImage(item, 0)
                    )}"
                    alt="${escapeHtml(item.name)}"
                    loading="lazy"
                  >

                  <div>
                    ${escapeHtml(item.name)}
                  </div>

                  <strong>
                    ${money(
                      calculateProductPrice(item)
                    )}
                  </strong>

                </div>
              `)
              .join("")
          }

        </div>

      </div>

    </div>
  `;

  bindDetailEvents();

  showStickyOrder(product, price);
}


/* =========================================================
   DETAIL EVENTS
   ========================================================= */

function bindDetailEvents() {

  const product =
    state.selectedProduct;

  if (!product) return;

  /*
   * BACK
   */

  const back =
    $("#closeProductDetail");

  if (back) {
    back.addEventListener(
      "click",
      closeSingleProductView
    );
  }

  /*
   * THUMBNAILS
   */

  $$(".detail-thumb")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.imageIndex
            );

          state.selectedImageIndex =
            index;

          renderProductDetail();

          updateProductUrl(
            product.id,
            index
          );
        }
      );

    });

  /*
   * DETAIL VARIANTS
   */

  $$(".detail-variant-option")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const groupId =
            button.dataset.groupId;

          const optionId =
            button.dataset.optionId;

          setVariantSelection(
            product,
            groupId,
            optionId
          );

          /*
           * Re-rendering the detail page is okay
           * here because the detail variant groups
           * are not horizontal card sliders.
           */

          renderProductDetail();
        }
      );

    });

  /*
   * ORDER
   */

  const orderButton =
    $("#detailOrderButton");

  if (orderButton) {
    orderButton.addEventListener(
      "click",
      () => {
        startOrderFlow(
          product,
          state.selectedImageIndex
        );
      }
    );
  }

  /*
   * OTHER PRODUCTS
   */

  $$(".other-product")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const productId =
            card.dataset.otherProductId;

          const other =
            state.products.find(
              item =>
                String(item.id) ===
                String(productId)
            );

          if (other) {
            openProductDetail(
              other,
              0
            );
          }
        }
      );

    });
}


/* =========================================================
   CLOSE PRODUCT DETAIL
   ========================================================= */

function closeSingleProductView() {

  state.selectedProduct = null;
  state.productViewOpen = false;

  const detail =
    $("#productDetailView");

  const products =
    $("#productsContainer");

  const categorySection =
    $(".category-filter-section");

  if (detail) {
    detail.style.display = "none";
    detail.innerHTML = "";
  }

  if (products) {
    products.style.display = "";
  }

  if (categorySection) {
    categorySection.style.display = "";
  }

  hideStickyOrder();

  /*
   * Remove product/image from URL
   */

  const url =
    new URL(window.location.href);

  url.searchParams.delete("product");
  url.searchParams.delete("image");

  window.history.pushState(
    {},
    "",
    url.pathname +
      url.search +
      url.hash
  );

  renderProducts();
}


/* =========================================================
   PRODUCT URL
   ========================================================= */

function updateProductUrl(
  productId,
  imageIndex
) {
  const url =
    new URL(window.location.href);

  url.searchParams.set(
    "product",
    productId
  );

  url.searchParams.set(
    "image",
    imageIndex
  );

  window.history.pushState(
    {},
    "",
    url.pathname +
      url.search +
      url.hash
  );
}


/* =========================================================
   DEEP LINK
   ========================================================= */

function handleDeepLink() {

  const url =
    new URL(window.location.href);

  const productId =
    url.searchParams.get("product");

  const imageIndex =
    Number(
      url.searchParams.get("image") || 0
    );

  if (!productId) {
    return;
  }

  const product =
    state.products.find(
      item =>
        String(item.id) ===
        String(productId)
    );

  if (!product) {
    return;
  }

  openProductDetail(
    product,
    imageIndex
  );
}


/* =========================================================
   START ORDER FLOW
   ========================================================= */

function startOrderFlow(
  product,
  imageIndex = 0
) {
  if (!product) return;

  state.orderProduct = product;
  state.orderImageIndex =
    Number(imageIndex || 0);

  /*
   * Copy current product selections.
   */

  state.orderSelections = {
    ...getSelections(product)
  };

  /*
   * IMPORTANT:
   *
   * If every variant is already selected,
   * DO NOT SHOW SELECT OPTIONS POPUP.
   *
   * Go directly to customer form.
   */

  if (allVariantsSelected(product)) {

    openCustomerOrderForm();

    return;
  }

  /*
   * Some variants are missing.
   * Show popup.
   */

  openVariantSelectionPopup();
}


/* =========================================================
   VARIANT POPUP
   ========================================================= */

function openVariantSelectionPopup() {

  const product =
    state.orderProduct;

  if (!product) return;

  let modal =
    $("#variantSelectionModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "variantSelectionModal";

    modal.className =
      "catalogue-modal";

    document.body.appendChild(modal);
  }

  renderVariantPopup(modal);

  modal.style.display = "flex";

  document.body.classList.add(
    "modal-open"
  );
}


/* =========================================================
   RENDER VARIANT POPUP
   ========================================================= */

function renderVariantPopup(modal) {

  const product =
    state.orderProduct;

  const groups =
    getVariantGroups(product);

  const price =
    calculateProductPrice(
      product,
      state.orderSelections
    );

  const images =
    getProductImages(product);

  const image =
    images[state.orderImageIndex] ||
    images[0] ||
    product.imageUrl ||
    "";

  modal.innerHTML = `

    <div class="catalogue-modal-backdrop"
         data-close-variant-modal>
    </div>

    <div class="variant-modal-box">

      <div class="variant-modal-header">

        <div>
          <h2>
            Select Options
          </h2>

          <div class="variant-modal-product-name">
            ${escapeHtml(product.name)}
          </div>
        </div>

        <button
          type="button"
          class="variant-modal-close"
          data-close-variant-modal
        >
          ×
        </button>

      </div>


      <div class="variant-product-summary">

        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(product.name)}"
              >
            `
            : ""
        }

        <div>

          <div class="variant-summary-name">
            ${escapeHtml(product.name)}
          </div>

          <div
            class="variant-summary-price"
            id="variantPopupPrice"
          >
            ${money(price)}
          </div>

        </div>

      </div>


      <div
        class="variant-popup-options"
        id="variantPopupOptions"
      >

        ${groups.map(group => {

          const selectedId =
            state.orderSelections[group.id];

          return `

            <div
              class="popup-variant-group"
              data-group-id="${escapeHtml(group.id)}"
            >

              <div class="popup-variant-title">
                ${escapeHtml(group.name)}
              </div>

              <div class="popup-variant-options">

                ${group.options.map(option => {

                  const active =
                    String(selectedId) ===
                    String(option.id);

                  let priceText = "";

                  if (
                    Number(option.price || 0) > 0
                  ) {

                    if (
                      option.priceType === "percentage" ||
                      option.priceType === "percent" ||
                      option.priceType === "%"
                    ) {

                      priceText =
                        ` +${option.price}%`;

                    } else {

                      priceText =
                        ` +${money(option.price)}`;

                    }
                  }

                  return `
                    <button
                      type="button"
                      class="popup-variant-option ${
                        active ? "active" : ""
                      }"
                      data-group-id="${escapeHtml(group.id)}"
                      data-option-id="${escapeHtml(option.id)}"
                    >
                      ${escapeHtml(option.name)}
                      ${priceText}
                    </button>
                  `;

                }).join("")}

              </div>

            </div>

          `;

        }).join("")}

      </div>


      <div
        class="variant-popup-error"
        id="variantPopupError"
        style="display:none"
      >
        Please select an option from every section.
      </div>


      <button
        type="button"
        class="variant-continue-btn"
        id="variantContinueButton"
      >
        Continue to Order
      </button>

    </div>
  `;

  bindVariantPopupEvents(modal);
}


/* =========================================================
   VARIANT POPUP EVENTS
   ========================================================= */

function bindVariantPopupEvents(modal) {

  /*
   * CLOSE
   */

  $$(
    "[data-close-variant-modal]",
    modal
  ).forEach(element => {

    element.addEventListener(
      "click",
      closeVariantSelectionPopup
    );

  });


  /*
   * VARIANT OPTIONS
   */

  $$(".popup-variant-option", modal)
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const groupId =
            button.dataset.groupId;

          const optionId =
            button.dataset.optionId;

          /*
           * Save selection
           */

          state.orderSelections[groupId] =
            optionId;

          /*
           * Make clicked option active
           */

          const group =
            button.closest(
              ".popup-variant-group"
            );

          if (group) {

            $$(".popup-variant-option", group)
              .forEach(item => {

                item.classList.toggle(
                  "active",
                  item === button
                );

              });

          }

          /*
           * LIVE PRICE UPDATE
           */

          const price =
            calculateProductPrice(
              state.orderProduct,
              state.orderSelections
            );

          const priceElement =
            $("#variantPopupPrice");

          if (priceElement) {
            priceElement.textContent =
              money(price);
          }

          /*
           * Remove validation error
           */

          const error =
            $("#variantPopupError");

          if (error) {
            error.style.display = "none";
          }

        }
      );

    });


  /*
   * CONTINUE
   */

  const continueButton =
    $("#variantContinueButton");

  if (continueButton) {

    continueButton.addEventListener(
      "click",
      () => {

        const product =
          state.orderProduct;

        /*
         * Check all groups
         */

        const groups =
          getVariantGroups(product);

        const missing =
          groups.filter(group => {

            const selected =
              state.orderSelections[group.id];

            return !selected;
          });

        if (missing.length) {

          const error =
            $("#variantPopupError");

          if (error) {
            error.style.display =
              "block";
          }

          return;
        }

        /*
         * Save selected options back to
         * product state.
         */

        state.variantSelections[
          product.id
        ] = {
          ...state.orderSelections
        };

        /*
         * Now open customer form.
         */

        closeVariantSelectionPopup();

        openCustomerOrderForm();

      }
    );

  }
}


/* =========================================================
   CLOSE VARIANT POPUP
   ========================================================= */

function closeVariantSelectionPopup() {

  const modal =
    $("#variantSelectionModal");

  if (modal) {
    modal.style.display = "none";
  }

  document.body.classList.remove(
    "modal-open"
  );
}


/* =========================================================
   CUSTOMER ORDER FORM
   ========================================================= */

function openCustomerOrderForm() {

  const product =
    state.orderProduct;

  if (!product) return;

  /*
   * Make sure latest selections are used.
   */

  state.orderSelections = {
    ...(
      state.variantSelections[product.id] ||
      state.orderSelections ||
      {}
    )
  };

  const price =
    calculateProductPrice(
      product,
      state.orderSelections
    );

  const variants =
    getSelectedVariantDetails(
      product,
      state.orderSelections
    );

  let modal =
    $("#orderModal");

  /*
   * Existing HTML modal
   */

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "orderModal";

    modal.className =
      "catalogue-modal";

    document.body.appendChild(modal);
  }

  modal.innerHTML = `

    <div class="catalogue-modal-backdrop"
         data-close-order-modal>
    </div>

    <div class="order-modal-box">

      <div class="order-modal-header">

        <div>
          <h2>
            Your Details
          </h2>

          <div class="order-product-name">
            ${escapeHtml(product.name)}
          </div>
        </div>

        <button
          type="button"
          class="order-modal-close"
          data-close-order-modal
        >
          ×
        </button>

      </div>


      <div class="order-summary">

        <div>
          <strong>
            ${escapeHtml(product.name)}
          </strong>
        </div>

        <div>
          ${variants.map(item => `
            <div>
              ${escapeHtml(item.groupName)}:
              ${escapeHtml(item.optionName)}
            </div>
          `).join("")}
        </div>

        <div class="order-summary-final-price">
          ${money(price)}
        </div>

      </div>


      <form id="orderForm">

        <div class="form-field">

          <label>
            Name
          </label>

          <input
            id="customerName"
            type="text"
            required
            autocomplete="name"
            placeholder="Enter your name"
          >

        </div>


        <div class="form-field">

          <label>
            Mobile Number
          </label>

          <input
            id="customerPhone"
            type="tel"
            required
            inputmode="numeric"
            autocomplete="tel"
            placeholder="Enter mobile number"
          >

        </div>


        <div class="form-field">

          <label>
            Address
          </label>

          <textarea
            id="customerAddress"
            required
            autocomplete="street-address"
            placeholder="Enter complete address"
          ></textarea>

        </div>


        <div class="form-field">

          <label>
            Pincode
          </label>

          <input
            id="customerPincode"
            type="text"
            required
            inputmode="numeric"
            autocomplete="postal-code"
            maxlength="6"
            placeholder="Enter pincode"
          >

        </div>


        <div
          id="orderMessage"
          class="order-message"
          style="display:none"
        ></div>


        <button
          type="submit"
          id="submitOrderBtn"
          class="submit-order-btn"
        >
          Place Order
        </button>

      </form>

    </div>
  `;

  modal.style.display = "flex";

  document.body.classList.add(
    "modal-open"
  );

  bindCustomerOrderEvents();
}


/* =========================================================
   CUSTOMER ORDER EVENTS
   ========================================================= */

function bindCustomerOrderEvents() {

  const modal =
    $("#orderModal");

  if (!modal) return;

  /*
   * CLOSE
   */

  $$(
    "[data-close-order-modal]",
    modal
  ).forEach(element => {

    element.addEventListener(
      "click",
      closeCustomerOrderForm
    );

  });


  /*
   * FORM
   */

  const form =
    $("#orderForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    submitOrder
  );
}


/* =========================================================
   VALIDATE CUSTOMER
   ========================================================= */

function validatePhone(phone) {

  const clean =
    String(phone)
      .replace(/\D/g, "");

  return (
    clean.length >= 10 &&
    clean.length <= 12
  );
}


function validatePincode(pin) {

  return /^\d{6}$/.test(
    String(pin).trim()
  );
}


/* =========================================================
   GENERATE LOCAL ORDER ID
   ========================================================= */

function generateOrderReference() {

  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase();

  return `IG-${timestamp}-${random}`;
}


/* =========================================================
   SUBMIT ORDER
   ========================================================= */

async function submitOrder(event) {

  event.preventDefault();

  const product =
    state.orderProduct;

  if (!product) {
    return;
  }

  const name =
    String(
      $("#customerName")?.value || ""
    ).trim();

  const phone =
    String(
      $("#customerPhone")?.value || ""
    ).trim();

  const address =
    String(
      $("#customerAddress")?.value || ""
    ).trim();

  const pincode =
    String(
      $("#customerPincode")?.value || ""
    ).trim();


  /*
   * Validation
   */

  const message =
    $("#orderMessage");

  if (!name) {
    showOrderMessage(
      "Please enter your name."
    );
    return;
  }

  if (!validatePhone(phone)) {
    showOrderMessage(
      "Please enter a valid mobile number."
    );
    return;
  }

  if (!address) {
    showOrderMessage(
      "Please enter your complete address."
    );
    return;
  }

  if (!validatePincode(pincode)) {
    showOrderMessage(
      "Please enter a valid 6 digit pincode."
    );
    return;
  }


  /*
   * Current selections
   */

  const selections = {
    ...(
      state.variantSelections[product.id] ||
      state.orderSelections ||
      {}
    )
  };

  /*
   * Make absolutely sure every group
   * is selected.
   */

  if (!allVariantsSelectedUsingSelections(
    product,
    selections
  )) {

    showOrderMessage(
      "Please select all product options."
    );

    return;
  }


  /*
   * Final price
   */

  const finalPrice =
    calculateProductPrice(
      product,
      selections
    );


  /*
   * Selected variants
   */

  const variants =
    getSelectedVariantDetails(
      product,
      selections
    );


  /*
   * Clicked image
   */

  const imageUrl =
    getProductImage(
      product,
      state.orderImageIndex
    );


  /*
   * Product link
   */

  const productLink =
    buildProductLink(
      product.id,
      state.orderImageIndex
    );


  /*
   * Local order reference.
   *
   * Backend will also return its stored
   * order ID. This reference is sent so
   * WhatsApp and admin can identify the
   * same order even if the request fails.
   */

  const clientOrderId =
    generateOrderReference();

  state.orderId =
    clientOrderId;


  /*
   * Full order object
   */

  const orderPayload = {

    id: clientOrderId,

    customer: {
      name,
      phone,
      address,
      pincode
    },

    product: {

      id: product.id,

      name: product.name,

      description:
        product.description || "",

      image:
        imageUrl || "",

      imageIndex:
        state.orderImageIndex,

      imageUrl:
        imageUrl || "",

      productLink,

      basePrice:
        Number(product.price || 0),

      price:
        finalPrice,

      finalPrice,

      variants,

      selections,

      /*
       * Keep simple fields too for
       * compatibility with old Worker.
       */

      colour:
        getSimpleVariantValue(
          variants,
          "colour"
        ),

      size:
        getSimpleVariantValue(
          variants,
          "size"
        )
    },

    orderId:
      clientOrderId,

    createdAt:
      Date.now()
  };


  /*
   * Disable button
   */

  const submitButton =
    $("#submitOrderBtn");

  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.textContent =
      "Saving Order...";
  }


  try {

    /*
     * SAVE TO D1
     */

    const response =
      await api(
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


    /*
     * Backend order ID has priority.
     */

    const savedOrderId =
      response?.orderId ||
      response?.id ||
      clientOrderId;

    state.orderId =
      savedOrderId;


    /*
     * WhatsApp
     */

    const whatsappMessage =
      buildWhatsAppMessage(
        {
          ...orderPayload,
          orderId: savedOrderId
        }
      );


    const whatsappUrl =
      `https://wa.me/${CONFIG.whatsappNumber}` +
      `?text=${encodeURIComponent(
        whatsappMessage
      )}`;


    /*
     * Close form
     */

    closeCustomerOrderForm();


    /*
     * Open WhatsApp
     */

    window.location.href =
      whatsappUrl;

  } catch (error) {

    console.error(
      "Order saving failed:",
      error
    );

    showOrderMessage(
      "Unable to save order. Please try again."
    );

    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "Place Order";
    }
  }
}


/* =========================================================
   CHECK SELECTIONS
   ========================================================= */

function allVariantsSelectedUsingSelections(
  product,
  selections
) {

  const groups =
    getVariantGroups(product);

  if (!groups.length) {
    return true;
  }

  return groups.every(group => {

    const selected =
      selections[group.id];

    return Boolean(
      selected &&
      group.options.some(
        option =>
          String(option.id) ===
          String(selected)
      )
    );

  });
}


/* =========================================================
   SIMPLE VARIANT VALUE
   ========================================================= */

function getSimpleVariantValue(
  variants,
  groupName
) {

  const found =
    variants.find(
      item =>
        String(item.groupName)
          .toLowerCase() ===
        String(groupName)
          .toLowerCase()
    );

  return found
    ? found.optionName
    : "";
}


/* =========================================================
   PRODUCT LINK
   ========================================================= */

function buildProductLink(
  productId,
  imageIndex = 0
) {

  const url =
    new URL(
      window.location.origin +
      window.location.pathname
    );

  url.searchParams.set(
    "product",
    productId
  );

  url.searchParams.set(
    "image",
    imageIndex
  );

  return url.toString();
}


/* =========================================================
   WHATSAPP MESSAGE
   ========================================================= */

function buildWhatsAppMessage(order) {

  const product =
    order.product;

  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];

  let message =
`*NEW ORDER - IMAGINARY GIFTS*

*Order ID:* ${order.orderId}

*CUSTOMER DETAILS*
Name: ${order.customer.name}
Mobile: ${order.customer.phone}
Address: ${order.customer.address}
Pincode: ${order.customer.pincode}

*PRODUCT DETAILS*
Product: ${product.name}
Product ID: ${product.id}
Base Price: ${money(product.basePrice)}
Final Price: ${money(product.finalPrice)}

*SELECTED OPTIONS*`;

  if (variants.length) {

    variants.forEach(item => {

      message +=
        `\n${item.groupName}: ${item.optionName}`;

    });

  } else {

    message +=
      "\nNo variants";
  }


  message +=
`

*PRODUCT IMAGE*
${product.imageUrl || "Not available"}

*PRODUCT LINK*
${product.productLink}

Please confirm this order.`;

  return message;
}


/* =========================================================
   ORDER MESSAGE
   ========================================================= */

function showOrderMessage(
  text
) {

  const element =
    $("#orderMessage");

  if (!element) {
    alert(text);
    return;
  }

  element.textContent =
    text;

  element.style.display =
    "block";
}


/* =========================================================
   CLOSE CUSTOMER FORM
   ========================================================= */

function closeCustomerOrderForm() {

  const modal =
    $("#orderModal");

  if (modal) {
    modal.style.display = "none";
  }

  document.body.classList.remove(
    "modal-open"
  );
}


/* =========================================================
   STICKY ORDER BAR
   ========================================================= */

function showStickyOrder(
  product,
  price
) {

  let bar =
    $("#stickyOrderBar");

  if (!bar) {
    return;
  }

  bar.style.display =
    "flex";

  const name =
    $("#stickyProductName");

  const priceElement =
    $("#stickyProductPrice");

  if (name) {
    name.textContent =
      product.name;
  }

  if (priceElement) {
    priceElement.textContent =
      money(price);
  }

  const button =
    $("#stickyOrderButton");

  if (button) {

    button.onclick =
      () => {

        startOrderFlow(
          product,
          state.selectedImageIndex
        );

      };

  }
}


function hideStickyOrder() {

  const bar =
    $("#stickyOrderBar");

  if (bar) {
    bar.style.display =
      "none";
  }
}


/* =========================================================
   UPDATE STICKY PRICE
   ========================================================= */

function updateStickyPrice(
  product
) {

  const price =
    calculateProductPrice(product);

  const priceElement =
    $("#stickyProductPrice");

  if (priceElement) {
    priceElement.textContent =
      money(price);
  }
}


/* =========================================================
   POPSTATE
   ========================================================= */

window.addEventListener(
  "popstate",
  () => {

    const url =
      new URL(
        window.location.href
      );

    const productId =
      url.searchParams.get(
        "product"
      );

    if (!productId) {

      if (state.productViewOpen) {
        closeSingleProductView();
      }

      return;
    }

    const product =
      state.products.find(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {
      return;
    }

    const image =
      Number(
        url.searchParams.get(
          "image"
        ) || 0
      );

    state.selectedProduct =
      product;

    state.selectedImageIndex =
      image;

    state.productViewOpen =
      true;

    renderProductDetail();

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initCatalogue() {

  try {

    await Promise.all([
      loadProducts(),
      loadCategories()
    ]);

    /*
     * Handle:
     *
     * /?product=PRODUCT_ID&image=2
     */

    handleDeepLink();

  } catch (error) {

    console.error(
      "Catalogue initialization failed:",
      error
    );

    const container =
      $("#productsContainer");

    if (container) {

      container.innerHTML = `
        <div class="empty-products">
          Unable to load products.
          Please refresh the page.
        </div>
      `;

    }

  }
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initCatalogue
  );

} else {

  initCatalogue();

}