/* =========================================================
   IMAGINARY GIFTS FRONTEND
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

  /*
    IMPORTANT:
    Replace this with the WhatsApp number that
    should receive customer orders.

    India example:
    919876543210

    Do NOT put +, spaces or hyphens.
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

  orderProduct: null

};


/* =========================================================
   HELPERS
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

          openOrderModal(
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

  const categoryButton =
    event.target.closest(
      ".category-pill"
    );


  if (categoryButton) {

    const categoryId =
      categoryButton.dataset.categoryId ||
      "";

    selectCategory(
      categoryId
    );

    return;

  }


  const image =
    event.target.closest(
      ".product-grid-image"
    );


  if (image) {

    const productId =
      image.dataset.productId;

    const imageIndex =
      Number(
        image.dataset.imageIndex
      );


    openProductDetail(
      productId,
      imageIndex
    );

    return;

  }


  const thumbnail =
    event.target.closest(
      ".detail-thumb"
    );


  if (thumbnail) {

    const productId =
      thumbnail.dataset.productId;

    const imageIndex =
      Number(
        thumbnail.dataset.imageIndex
      );


    openProductDetail(
      productId,
      imageIndex
    );

    return;

  }


  const orderButton =
    event.target.closest(
      ".product-order-btn"
    );


  if (orderButton) {

    const productId =
      orderButton.dataset.productId;

    openOrderForProduct(
      productId
    );

    return;

  }


  const otherProduct =
    event.target.closest(
      ".other-product"
    );


  if (otherProduct) {

    const productId =
      otherProduct.dataset.productId;

    openProductDetail(
      productId,
      0
    );

  }


  const variantButton =
    event.target.closest(
      ".variant-option"
    );


  if (variantButton) {

    handleVariantSelection(
      variantButton
    );

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


    /*
      Frontend should only show
      active products.
    */

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
   FILTERED PRODUCTS
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


      <div
        class="product-detail hidden"
        id="detail-${escapeAttr(
          product.id
        )}"
      ></div>

    </article>

  `;

}


/* =========================================================
   VARIANTS
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


      <div
        class="variant-options"
      >

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
    Re-render this product so
    selected state + price update.
  */

  refreshProductCard(
    productId
  );

}


function refreshProductCard(
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


  const oldCard =
    document.querySelector(
      `[data-product-card="${CSS.escape(
        productId
      )}"]`
    );


  if (!oldCard) {
    return;
  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.innerHTML =
    renderProductCard(
      product
    );


  const newCard =
    wrapper.firstElementChild;


  oldCard.replaceWith(
    newCard
  );


  /*
    If this product is currently
    open, restore its detail view.
  */

  if (
    state.selectedProduct?.id ===
    productId
  ) {

    openProductDetail(
      productId,
      state.selectedImageIndex,
      false
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
    (
      option
    ) => {

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


  const selectedColour =
    selected.colours;


  if (
    selectedColour
  ) {

    applyOption(
      colours.find(
        option =>
          (
            option.id ||
            option.name
          ) ===
          selectedColour
      )
    );

  }


  const selectedSize =
    selected.sizes;


  if (
    selectedSize
  ) {

    applyOption(
      sizes.find(
        option =>
          (
            option.id ||
            option.name
          ) ===
          selectedSize
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
   GET SELECTED VARIANT DETAILS
========================================================= */

function getSelectedVariantDetails(
  product
) {

  const selected =
    state.selectedVariants[
      product.id
    ] || {};


  const result = [];


  const addSelected =
    (
      label,
      groupKey,
      options
    ) => {

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

    };


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
   PRODUCT DETAIL
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


  if (!images.length) {
    imageIndex = 0;
  } else {

    imageIndex =
      Math.max(
        0,
        Math.min(
          imageIndex,
          images.length - 1
        )
      );

  }


  state.selectedProduct =
    product;

  state.selectedImageIndex =
    imageIndex;


  const detail =
    document.querySelector(
      `#detail-${CSS.escape(
        productId
      )}`
    );


  if (!detail) {
    return;
  }


  detail.classList.remove(
    "hidden"
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


  detail.innerHTML = `

    ${
      selectedImage
        ? `
          <img
            class="detail-large-image"
            src="${escapeAttr(
              selectedImage
            )}"
            alt="${escapeAttr(
              product.name || ""
            )}"
          >
        `
        : ""
    }


    ${
      images.length > 1
        ? `
          <div class="detail-thumbnails">

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


    <div class="detail-info">

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


      <div class="detail-price">
        ₹${formatMoney(
          price
        )}
      </div>


      ${
        variants
          ? `
            <div class="variant-area">
              ${variants}
            </div>
          `
          : ""
      }

    </div>


    ${
      otherProducts.length
        ? `
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
                            Number(
                              other.price || 0
                            )
                          )}
                        </div>

                      </div>

                    </div>

                  `;

                }
              )
              .join("")}

          </div>
        `
        : ""
    }

  `;


  /*
    Scroll to the selected product.
  */

  requestAnimationFrame(
    () => {

      const card =
        document.querySelector(
          `[data-product-card="${CSS.escape(
            productId
          )}"]`
        );


      if (card) {

        card.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }

    }
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

}


/* =========================================================
   URL / DEEP LINK
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


  const categoryId =
    getProductCategoryId(
      product
    );


  if (
    categoryId &&
    state.categories.some(
      category =>
        category.id ===
        categoryId
    )
  ) {

    state.selectedCategory =
      categoryId;

    renderCategoryPills();

    renderProducts();

  }


  setTimeout(
    () => {

      openProductDetail(
        productId,
        imageIndex,
        false
      );

    },
    100
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


  const price =
    calculateProductPrice(
      product
    );


  $("#stickyProductName")
    .textContent =
      product.name ||
      "Product";


  $("#stickyProductPrice")
    .textContent =
      `₹${formatMoney(
        price
      )}`;


  bar.classList.remove(
    "hidden"
  );

}


/* =========================================================
   ORDER FOR PRODUCT
========================================================= */

function openOrderForProduct(
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


  /*
    If product isn't already selected,
    select its first image.
  */

  if (
    !state.selectedProduct ||
    state.selectedProduct.id !==
      product.id
  ) {

    state.selectedProduct =
      product;

    state.selectedImageIndex =
      0;

    updateProductUrl(
      product.id,
      0
    );

  }


  openOrderModal(
    product
  );

}


/* =========================================================
   OPEN ORDER MODAL
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
      : "No variants selected";


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


    /*
      Create the exact product link
      customer clicked.
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


    /*
      Remove unrelated hash.
    */

    productLink.hash = "";


    /*
      Send order to Worker.
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


    /*
      Build WhatsApp message.
    */

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


    /*
      Open WhatsApp.
    */

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

🔗 *CUSTOMER PRODUCT LINK*

${data.productLink}

━━━━━━━━━━━━━━━━━━

Please confirm the order.
`.trim();

}


/* =========================================================
   UPDATE PRICE DISPLAY
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
      .textContent =
        `₹${formatMoney(
          price
        )}`;

  }

}