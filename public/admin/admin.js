/* =========================================================
   IMAGINARY GIFTS ADMIN
   Compatible with original Worker authentication/API
========================================================= */

const $ = (selector) => document.querySelector(selector);

const state = {
  products: [],
  categories: [],

  editingProduct: null,

  selectedImages: [],
  existingImages: [],

  customVariants: []
};


/* =========================================================
   API
========================================================= */

async function api(url, options = {}) {

  const config = {
    credentials: "include",
    ...options
  };

  if (
    config.body &&
    !(config.body instanceof FormData)
  ) {
    config.headers = {
      "content-type": "application/json",
      ...(config.headers || {})
    };
  }

  const response = await fetch(url, config);

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {

    const message =
      data?.error ||
      data?.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {

  bindEvents();

  await checkLogin();
}


/* =========================================================
   AUTH
========================================================= */

async function checkLogin() {

  try {

    const data = await api("/api/me");

    if (
      data &&
      data.loggedIn
    ) {

      showAdmin(data.email);

    } else {

      showAuth();

    }

  } catch {

    showAuth();

  }

}


function showAuth() {

  $("#authScreen").classList.remove("hidden");
  $("#adminApp").classList.add("hidden");

}


function showAdmin(email = "") {

  $("#authScreen").classList.add("hidden");
  $("#adminApp").classList.remove("hidden");

  $("#adminEmail").textContent = email || "";

  loadCategories();
  loadProducts();
}


/* =========================================================
   LOGIN / REGISTER EVENTS
========================================================= */

function bindEvents() {

  $("#loginForm").addEventListener(
    "submit",
    handleLogin
  );

  $("#registerForm").addEventListener(
    "submit",
    handleRegister
  );

  $("#showRegisterBtn").addEventListener(
    "click",
    () => {

      $("#loginBox").classList.add("hidden");
      $("#registerBox").classList.remove("hidden");

    }
  );

  $("#showLoginBtn").addEventListener(
    "click",
    () => {

      $("#registerBox").classList.add("hidden");
      $("#loginBox").classList.remove("hidden");

    }
  );

  $("#logoutBtn").addEventListener(
    "click",
    logout
  );


  /* Navigation */

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          switchSection(
            button.dataset.section
          );

        }
      );

    });


  /* Products */

  $("#newProductBtn").addEventListener(
    "click",
    () => openProductEditor()
  );

  $("#closeEditorBtn").addEventListener(
    "click",
    closeProductEditor
  );

  $("#cancelProductBtn").addEventListener(
    "click",
    closeProductEditor
  );

  $("#productForm").addEventListener(
    "submit",
    saveProduct
  );

  $("#addColourBtn").addEventListener(
    "click",
    () => addColourRow()
  );

  $("#addSizeBtn").addEventListener(
    "click",
    () => addSizeRow()
  );

  $("#addVariantBtn").addEventListener(
    "click",
    () => addCustomVariant()
  );

  $("#refreshProductsBtn").addEventListener(
    "click",
    loadProducts
  );


  /* Image picker */

  $("#imageDropZone").addEventListener(
    "click",
    () => $("#productImages").click()
  );

  $("#productImages").addEventListener(
    "change",
    handleImageSelection
  );


  /* Category */

  $("#createCategoryBtn").addEventListener(
    "click",
    openCategoryModal
  );

  $("#addCategoryPageBtn").addEventListener(
    "click",
    openCategoryModal
  );

  $("#refreshCategoriesBtn").addEventListener(
    "click",
    loadCategories
  );

  $("#categoryForm").addEventListener(
    "submit",
    createCategory
  );

  $("#closeCategoryModalBtn").addEventListener(
    "click",
    closeCategoryModal
  );

  $("#cancelCategoryBtn").addEventListener(
    "click",
    closeCategoryModal
  );


  $("#categoryName").addEventListener(
    "input",
    () => {

      if (
        !$("#categorySlug").dataset.edited
      ) {

        $("#categorySlug").value =
          slugify($("#categoryName").value);

      }

    }
  );

  $("#categorySlug").addEventListener(
    "input",
    () => {

      $("#categorySlug").dataset.edited =
        "true";

    }
  );


  /* Escape */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeCategoryModal();

      }

    }
  );

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

  event.preventDefault();

  const message = $("#loginMessage");

  message.className = "message";
  message.textContent = "Logging in...";

  const email =
    $("#loginEmail").value.trim();

  const password =
    $("#loginPassword").value;


  try {

    const data = await api(
      "/api/login",
      {
        method: "POST",

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    message.className =
      "message success";

    message.textContent =
      "Login successful.";

    showAdmin(data.email || email);

  } catch (error) {

    message.className =
      "message";

    message.textContent =
      error.message;

  }

}


/* =========================================================
   REGISTER
========================================================= */

async function handleRegister(event) {

  event.preventDefault();

  const message =
    $("#registerMessage");

  message.className = "message";

  message.textContent =
    "Creating account...";

  const email =
    $("#registerEmail").value.trim();

  const password =
    $("#registerPassword").value;


  try {

    await api(
      "/api/register",
      {
        method: "POST",

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    message.className =
      "message success";

    message.textContent =
      "Account created. Please login.";

    $("#registerForm").reset();

    setTimeout(() => {

      $("#registerBox")
        .classList.add("hidden");

      $("#loginBox")
        .classList.remove("hidden");

      $("#loginEmail").value =
        email;

    }, 700);

  } catch (error) {

    message.className =
      "message";

    message.textContent =
      error.message;

  }

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  try {

    await api(
      "/api/logout",
      {
        method: "POST"
      }
    );

  } catch {}

  location.reload();
}


/* =========================================================
   NAVIGATION
========================================================= */

function switchSection(sectionId) {

  document
    .querySelectorAll(".admin-section")
    .forEach(section => {

      section.classList.remove("active");

    });

  const section =
    document.getElementById(sectionId);

  if (section) {

    section.classList.add("active");

  }


  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.section === sectionId
      );

    });


  if (
    sectionId === "categoriesSection"
  ) {

    loadCategories();

  }

}


/* =========================================================
   PRODUCTS - LOAD
========================================================= */

async function loadProducts() {

  const container =
    $("#productsList");

  container.innerHTML = `
    <div class="empty-state">
      Loading products...
    </div>
  `;


  try {

    const data =
      await api("/api/admin/products");

    /*
      IMPORTANT:
      Original Worker returns RAW ARRAY.
    */

    state.products =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : [];


    renderProducts();

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div>${escapeHtml(error.message)}</div>
      </div>
    `;

  }

}


/* =========================================================
   PRODUCTS - RENDER
========================================================= */

function renderProducts() {

  const container =
    $("#productsList");

  $("#productCount").textContent =
    state.products.length;


  if (!state.products.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-icon">
          📦
        </div>

        <strong>
          No products yet
        </strong>

        <p>
          Click "Add Product" to create your first product.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    state.products
      .map(product => {

        const image =
          getProductImage(product);

        const category =
          getProductCategory(product);

        const price =
          Number(product.price || 0);


        return `
          <div class="product-row">

            <div class="product-thumb">

              ${
                image
                  ? `
                    <img
                      src="${escapeAttr(image)}"
                      alt="${escapeAttr(product.name || "")}"
                    >
                  `
                  : `
                    <div
                      style="
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#52525b;
                        font-size:22px;
                      "
                    >
                      📦
                    </div>
                  `
              }

            </div>


            <div class="product-info">

              <strong>
                ${escapeHtml(product.name || "Untitled")}
              </strong>

              <small>
                ${escapeHtml(category || "No category")}
              </small>

            </div>


            <div class="product-price">
              ₹${formatMoney(price)}
            </div>


            <div>

              <span
                class="product-status ${
                  product.active ? "" : "off"
                }"
              >
                ${
                  product.active
                    ? "Visible"
                    : "Hidden"
                }
              </span>

            </div>


            <div class="product-actions">

              <button
                class="action-btn"
                onclick="editProduct('${escapeAttr(product.id)}')"
              >
                Edit
              </button>

              <button
                class="action-btn"
                onclick="duplicateProduct('${escapeAttr(product.id)}')"
              >
                Duplicate
              </button>

              <button
                class="action-btn delete"
                onclick="deleteProduct('${escapeAttr(product.id)}')"
              >
                Delete
              </button>

            </div>

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   PRODUCT EDITOR
========================================================= */

function openProductEditor(product = null) {

  state.editingProduct =
    product;

  state.selectedImages = [];
  state.existingImages = [];


  $("#productForm").reset();

  $("#productId").value =
    product?.id || "";

  $("#editorTitle").textContent =
    product
      ? "Edit Product"
      : "Add Product";


  $("#productName").value =
    product?.name || "";

  $("#productPrice").value =
    product?.price ?? "";

  $("#productDescription").value =
    product?.description || "";

  $("#productActive").checked =
    product
      ? Boolean(product.active)
      : true;


  /* Category */

  const categoryId =
    product?.data?.categoryId ||
    product?.data?.category_id ||
    "";

  $("#productCategory").value =
    categoryId;


  /* Colours */

  $("#coloursContainer").innerHTML = "";

  const colours =
    Array.isArray(product?.data?.colours)
      ? product.data.colours
      : [];

  colours.forEach(
    colour => addColourRow(colour)
  );


  /* Sizes */

  $("#sizesContainer").innerHTML = "";

  const sizes =
    Array.isArray(product?.data?.sizes)
      ? product.data.sizes
      : [];

  sizes.forEach(
    size => addSizeRow(size)
  );


  /* Custom variants */

  state.customVariants =
    Array.isArray(product?.data?.variants)
      ? clone(product.data.variants)
      : [];

  renderCustomVariants();


  /* Images */

  state.existingImages =
    getExistingImages(product);

  renderImages();


  $("#productEditor")
    .classList.remove("hidden");

  $("#productsListCard")
    .classList.add("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function closeProductEditor() {

  $("#productEditor")
    .classList.add("hidden");

  $("#productsListCard")
    .classList.remove("hidden");

  state.editingProduct = null;
  state.selectedImages = [];
  state.existingImages = [];
}


/* =========================================================
   EDIT PRODUCT
========================================================= */

async function editProduct(productId) {

  const product =
    state.products.find(
      item => item.id === productId
    );

  if (!product) {

    toast(
      "Product not found.",
      "error"
    );

    return;
  }


  openProductEditor(product);
}


/* =========================================================
   DUPLICATE
========================================================= */

async function duplicateProduct(productId) {

  const product =
    state.products.find(
      item => item.id === productId
    );

  if (!product) {

    toast(
      "Product not found.",
      "error"
    );

    return;
  }


  if (
    !confirm(
      `Duplicate "${product.name}"?`
    )
  ) {

    return;
  }


  try {

    const payload =
      buildProductPayload(product);


    payload.name =
      `${product.name} (Copy)`;


    const result =
      await api(
        "/api/admin/products",
        {
          method: "POST",

          body: JSON.stringify(
            payload
          )
        }
      );


    toast(
      "Product duplicated.",
      "success"
    );


    await loadProducts();


    const newProduct =
      state.products.find(
        item =>
          item.id === result.id
      );


    if (newProduct) {

      openProductEditor(
        newProduct
      );

    }

  } catch (error) {

    toast(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteProduct(productId) {

  const product =
    state.products.find(
      item => item.id === productId
    );

  if (!product) return;


  if (
    !confirm(
      `Delete "${product.name}"?\n\nThis cannot be undone.`
    )
  ) {

    return;
  }


  try {

    await api(
      `/api/admin/products/${encodeURIComponent(productId)}`,
      {
        method: "DELETE"
      }
    );


    toast(
      "Product deleted.",
      "success"
    );


    await loadProducts();

  } catch (error) {

    toast(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   SAVE PRODUCT
========================================================= */

async function saveProduct(event) {

  event.preventDefault();


  const saveButton =
    $("#saveProductBtn");

  saveButton.disabled = true;

  saveButton.textContent =
    "Saving...";


  try {

    const payload =
      buildProductPayload();


    let result;


    if (
      payload.id
    ) {

      result =
        await api(
          `/api/admin/products/${encodeURIComponent(payload.id)}`,
          {
            method: "PUT",

            body: JSON.stringify(
              payload
            )
          }
        );

    } else {

      result =
        await api(
          "/api/admin/products",
          {
            method: "POST",

            body: JSON.stringify(
              payload
            )
          }
        );

    }


    const productId =
      payload.id ||
      result.id;


    if (!productId) {

      throw new Error(
        "Product saved but no product ID was returned."
      );

    }


    /* Upload newly selected images */

    if (
      state.selectedImages.length
    ) {

      await uploadImages(
        productId,
        state.selectedImages
      );

    }


    toast(
      "Product saved successfully.",
      "success"
    );


    await loadProducts();


    const updatedProduct =
      state.products.find(
        item => item.id === productId
      );


    closeProductEditor();


    /*
      Keep editor closed after save.
      User can edit again from product list.
    */


  } catch (error) {

    toast(
      error.message,
      "error"
    );

  } finally {

    saveButton.disabled = false;

    saveButton.textContent =
      "Save Product";

  }

}


/* =========================================================
   BUILD PRODUCT PAYLOAD
========================================================= */

function buildProductPayload(
  productOverride = null
) {

  const source =
    productOverride || {};


  const productId =
    $("#productId")?.value ||
    source.id ||
    "";


  const name =
    $("#productName")?.value.trim() ||
    source.name ||
    "";


  const price =
    Number(
      $("#productPrice")?.value ??
      source.price ??
      0
    );


  const description =
    $("#productDescription")?.value ??
    source.description ??
    "";


  const active =
    $("#productActive")
      ? $("#productActive").checked
      : Boolean(source.active);


  const categoryId =
    $("#productCategory")?.value ||
    source.data?.categoryId ||
    "";


  const colours =
    productOverride
      ? clone(
          source.data?.colours || []
        )
      : readColourRows();


  const sizes =
    productOverride
      ? clone(
          source.data?.sizes || []
        )
      : readSizeRows();


  const variants =
    productOverride
      ? clone(
          source.data?.variants || []
        )
      : clone(
          state.customVariants
        );


  const images =
    productOverride
      ? clone(
          source.data?.images || []
        )
      : getExistingImages(
          state.editingProduct
        );


  const data =
    productOverride
      ? clone(source.data || {})
      : clone(
          state.editingProduct?.data || {}
        );


  data.categoryId =
    categoryId;


  data.colours =
    colours;


  data.sizes =
    sizes;


  data.variants =
    variants;


  data.images =
    images;


  return {

    id: productId,

    name,

    description,

    price,

    active,

    data

  };

}


/* =========================================================
   COLOURS
========================================================= */

function addColourRow(data = {}) {

  const container =
    $("#coloursContainer");


  const row =
    document.createElement("div");

  row.className =
    "variant-row";


  row.innerHTML = `

    <input
      type="text"
      class="colour-name"
      placeholder="Colour name"
      value="${escapeAttr(data.name || "")}"
    >

    <select class="colour-price-type">

      <option
        value="INR"
        ${
          data.priceType !== "%"
            ? "selected"
            : ""
        }
      >
        ₹
      </option>

      <option
        value="%"
        ${
          data.priceType === "%"
            ? "selected"
            : ""
        }
      >
        %
      </option>

    </select>

    <input
      type="number"
      class="colour-price"
      min="0"
      step="0.01"
      placeholder="Price"
      value="${data.price ?? ""}"
    >

    <button
      type="button"
      class="remove-btn"
    >
      ✕
    </button>

  `;


  row
    .querySelector(".remove-btn")
    .addEventListener(
      "click",
      () => row.remove()
    );


  container.appendChild(row);

}


function readColourRows() {

  return [
    ...document.querySelectorAll(
      "#coloursContainer .variant-row"
    )
  ]
    .map(row => {

      const name =
        row
          .querySelector(".colour-name")
          .value
          .trim();

      if (!name) return null;


      return {

        id:
          crypto.randomUUID(),

        name,

        priceType:
          row.querySelector(
            ".colour-price-type"
          ).value,

        price:
          Number(
            row.querySelector(
              ".colour-price"
            ).value || 0
          )

      };

    })
    .filter(Boolean);

}


/* =========================================================
   SIZES
========================================================= */

function addSizeRow(data = {}) {

  const container =
    $("#sizesContainer");


  const row =
    document.createElement("div");

  row.className =
    "variant-row";


  row.innerHTML = `

    <input
      type="text"
      class="size-name"
      placeholder="Size"
      value="${escapeAttr(data.name || "")}"
    >

    <select class="size-price-type">

      <option
        value="INR"
        ${
          data.priceType !== "%"
            ? "selected"
            : ""
        }
      >
        ₹
      </option>

      <option
        value="%"
        ${
          data.priceType === "%"
            ? "selected"
            : ""
        }
      >
        %
      </option>

    </select>

    <input
      type="number"
      class="size-price"
      min="0"
      step="0.01"
      placeholder="Price"
      value="${data.price ?? ""}"
    >

    <button
      type="button"
      class="remove-btn"
    >
      ✕
    </button>

  `;


  row
    .querySelector(".remove-btn")
    .addEventListener(
      "click",
      () => row.remove()
    );


  container.appendChild(row);

}


function readSizeRows() {

  return [
    ...document.querySelectorAll(
      "#sizesContainer .variant-row"
    )
  ]
    .map(row => {

      const name =
        row
          .querySelector(".size-name")
          .value
          .trim();

      if (!name) return null;


      return {

        id:
          crypto.randomUUID(),

        name,

        priceType:
          row.querySelector(
            ".size-price-type"
          ).value,

        price:
          Number(
            row.querySelector(
              ".size-price"
            ).value || 0
          )

      };

    })
    .filter(Boolean);

}


/* =========================================================
   CUSTOM VARIANTS
========================================================= */

function addCustomVariant(data = null) {

  const variant = data
    ? clone(data)
    : {

        id:
          crypto.randomUUID(),

        name: "",

        options: []

      };


  if (
    !Array.isArray(
      variant.options
    )
  ) {

    variant.options = [];

  }


  state.customVariants.push(
    variant
  );

  renderCustomVariants();

}


function renderCustomVariants() {

  const container =
    $("#customVariantsContainer");

  container.innerHTML = "";


  state.customVariants
    .forEach(
      (variant, variantIndex) => {

        const card =
          document.createElement("div");

        card.className =
          "custom-variant-card";


        card.innerHTML = `

          <div class="custom-variant-header">

            <input
              class="custom-variant-name"
              type="text"
              placeholder="Variant name — e.g. Design"
              value="${escapeAttr(variant.name || "")}"
            >

            <button
              type="button"
              class="icon-btn remove-variant"
              title="Remove variant"
            >
              ✕
            </button>

          </div>

          <div class="option-list"></div>

          <button
            type="button"
            class="add-option-btn"
          >
            + Add Option
          </button>

        `;


        const nameInput =
          card.querySelector(
            ".custom-variant-name"
          );


        nameInput.addEventListener(
          "input",
          () => {

            variant.name =
              nameInput.value;

          }
        );


        card
          .querySelector(
            ".remove-variant"
          )
          .addEventListener(
            "click",
            () => {

              state.customVariants
                .splice(
                  variantIndex,
                  1
                );

              renderCustomVariants();

            }
          );


        const optionList =
          card.querySelector(
            ".option-list"
          );


        (variant.options || [])
          .forEach(
            (option, optionIndex) => {

              renderOptionRow(
                optionList,
                variant,
                option,
                optionIndex
              );

            }
          );


        card
          .querySelector(
            ".add-option-btn"
          )
          .addEventListener(
            "click",
            () => {

              variant.options.push({

                id:
                  crypto.randomUUID(),

                name: "",

                priceType: "INR",

                price: 0

              });

              renderCustomVariants();

            }
          );


        container.appendChild(card);

      }
    );

}


function renderOptionRow(
  container,
  variant,
  option,
  optionIndex
) {

  const row =
    document.createElement("div");

  row.className =
    "option-row";


  row.innerHTML = `

    <input
      type="text"
      class="option-name"
      placeholder="Option name"
      value="${escapeAttr(option.name || "")}"
    >

    <select class="option-price-type">

      <option
        value="INR"
        ${
          option.priceType !== "%"
            ? "selected"
            : ""
        }
      >
        ₹
      </option>

      <option
        value="%"
        ${
          option.priceType === "%"
            ? "selected"
            : ""
        }
      >
        %
      </option>

    </select>

    <input
      type="number"
      class="option-price"
      min="0"
      step="0.01"
      placeholder="Price"
      value="${option.price ?? ""}"
    >

    <button
      type="button"
      class="remove-btn"
    >
      ✕
    </button>

  `;


  row
    .querySelector(".option-name")
    .addEventListener(
      "input",
      event => {

        option.name =
          event.target.value;

      }
    );


  row
    .querySelector(".option-price-type")
    .addEventListener(
      "change",
      event => {

        option.priceType =
          event.target.value;

      }
    );


  row
    .querySelector(".option-price")
    .addEventListener(
      "input",
      event => {

        option.price =
          Number(
            event.target.value || 0
          );

      }
    );


  row
    .querySelector(".remove-btn")
    .addEventListener(
      "click",
      () => {

        variant.options
          .splice(
            optionIndex,
            1
          );

        renderCustomVariants();

      }
    );


  container.appendChild(row);

}


/* =========================================================
   IMAGES - SELECTION
========================================================= */

function handleImageSelection(event) {

  const files =
    [...event.target.files];


  if (!files.length) {
    return;
  }


  state.selectedImages.push(
    ...files
  );


  renderImages();


  event.target.value = "";
}


/* =========================================================
   IMAGES - RENDER
========================================================= */

function renderImages() {

  const container =
    $("#imagePreviewContainer");

  container.innerHTML = "";


  /* Existing */

  state.existingImages
    .forEach(
      (image, index) => {

        const item =
          document.createElement("div");

        item.className =
          "image-preview";


        item.innerHTML = `

          <img
            src="${escapeAttr(image.url)}"
            alt=""
          >

          <button
            type="button"
            class="remove-image"
            title="Remove image"
          >
            ✕
          </button>

        `;


        item
          .querySelector(
            ".remove-image"
          )
          .addEventListener(
            "click",
            () => {

              removeExistingImage(
                index
              );

            }
          );


        container.appendChild(item);

      }
    );


  /* New files */

  state.selectedImages
    .forEach(
      (file, index) => {

        const item =
          document.createElement("div");

        item.className =
          "image-preview";


        const image =
          document.createElement("img");


        image.src =
          URL.createObjectURL(file);


        item.appendChild(image);


        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "remove-image";

        button.textContent =
          "✕";


        button.addEventListener(
          "click",
          () => {

            state.selectedImages
              .splice(index, 1);

            renderImages();

          }
        );


        item.appendChild(button);

        container.appendChild(item);

      }
    );

}


function getExistingImages(product) {

  const images =
    product?.data?.images;


  if (!Array.isArray(images)) {
    return [];
  }


  return images
    .map(item => {

      if (
        typeof item === "string"
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
      item => item.url
    );

}


function removeExistingImage(index) {

  const image =
    state.existingImages[index];


  if (!image) return;


  if (
    image.key &&
    state.editingProduct?.id
  ) {

    deleteRemoteImage(
      image,
      index
    );

  } else {

    state.existingImages
      .splice(index, 1);

    renderImages();

  }

}


/* =========================================================
   DELETE REMOTE IMAGE
========================================================= */

async function deleteRemoteImage(
  image,
  index
) {

  if (
    !confirm(
      "Delete this image?"
    )
  ) {

    return;

  }


  try {

    const encodedKey =
      encodeURIComponent(
        image.key
      );


    const url =
      `/api/admin/product-images/${encodedKey}` +
      `?productId=${encodeURIComponent(
        state.editingProduct.id
      )}`;


    await api(
      url,
      {
        method: "DELETE"
      }
    );


    state.existingImages
      .splice(index, 1);


    renderImages();


    toast(
      "Image deleted.",
      "success"
    );

  } catch (error) {

    toast(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   UPLOAD IMAGES
========================================================= */

async function uploadImages(
  productId,
  files
) {

  if (!files.length) {
    return;
  }


  $("#uploadModal")
    .classList.remove("hidden");


  updateUploadProgress(
    0,
    0,
    files.length,
    "Starting..."
  );


  try {

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const file =
        files[i];


      updateUploadProgress(
        0,
        i + 1,
        files.length,
        file.name
      );


      await uploadSingleImage(
        productId,
        file,
        progress => {

          const overall =
            (
              (i + progress / 100)
              /
              files.length
            ) * 100;


          updateUploadProgress(
            overall,
            i + 1,
            files.length,
            file.name
          );

        }
      );

    }


    updateUploadProgress(
      100,
      files.length,
      files.length,
      "Upload complete"
    );


    await sleep(500);

  } finally {

    $("#uploadModal")
      .classList.add("hidden");

  }

}


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


      xhr.withCredentials =
        true;


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

            onProgress(percent);

          }

        };


      xhr.onload =
        () => {

          let data = null;

          try {

            data =
              JSON.parse(
                xhr.responseText
              );

          } catch {}


          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {

            resolve(data);

          } else {

            reject(
              new Error(
                data?.error ||
                `Image upload failed (${xhr.status})`
              )
            );

          }

        };


      xhr.onerror =
        () => {

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
        "image",
        file
      );


      xhr.send(formData);

    }
  );

}


function updateUploadProgress(
  percent,
  current,
  total,
  filename
) {

  const safePercent =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(percent)
      )
    );


  $("#uploadProgressBar")
    .style.width =
      `${safePercent}%`;


  $("#uploadPercent")
    .textContent =
      `${safePercent}%`;


  $("#uploadFileNumber")
    .textContent =
      `${current} / ${total}`;


  $("#uploadFileName")
    .textContent =
      filename || "";


  $("#uploadStatus")
    .textContent =
      safePercent >= 100
        ? "Upload complete"
        : `Uploading image ${current} of ${total}...`;

}


/* =========================================================
   CATEGORIES
========================================================= */

async function loadCategories() {

  try {

    const data =
      await api(
        "/api/admin/categories"
      );


    state.categories =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.categories)
          ? data.categories
          : [];


    renderCategorySelect();
    renderCategoriesList();

  } catch (error) {

    console.error(
      "Category load error:",
      error
    );

  }

}


/* =========================================================
   CATEGORY SELECT
========================================================= */

function renderCategorySelect() {

  const select =
    $("#productCategory");


  if (!select) return;


  const current =
    select.value;


  select.innerHTML = `
    <option value="">
      Select Category
    </option>
  `;


  state.categories
    .forEach(category => {

      const option =
        document.createElement("option");

      option.value =
        category.id;

      option.textContent =
        category.name;


      select.appendChild(option);

    });


  if (current) {

    select.value =
      current;

  }

}


/* =========================================================
   CATEGORY LIST
========================================================= */

function renderCategoriesList() {

  const container =
    $("#categoriesList");


  $("#categoryCount")
    .textContent =
      state.categories.length;


  if (!state.categories.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-icon">
          🏷️
        </div>

        <strong>
          No categories yet
        </strong>

        <p>
          Create your first category.
        </p>

      </div>
    `;

    return;

  }


  container.innerHTML =
    state.categories
      .map(category => `

        <div class="category-row">

          <div class="category-name">
            ${escapeHtml(category.name)}
          </div>

          <div class="category-slug">
            ${escapeHtml(category.slug)}
          </div>

          <div class="category-active">
            ● Active
          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
   CATEGORY MODAL
========================================================= */

function openCategoryModal() {

  $("#categoryModal")
    .classList.remove("hidden");


  $("#categoryForm").reset();

  delete $("#categorySlug")
    .dataset.edited;


  $("#categoryMessage")
    .textContent = "";


  setTimeout(
    () => $("#categoryName").focus(),
    50
  );

}


function closeCategoryModal() {

  $("#categoryModal")
    .classList.add("hidden");

}


/* =========================================================
   CREATE CATEGORY
========================================================= */

async function createCategory(event) {

  event.preventDefault();


  const message =
    $("#categoryMessage");


  const name =
    $("#categoryName")
      .value
      .trim();


  let slug =
    $("#categorySlug")
      .value
      .trim();


  if (!name) {

    message.textContent =
      "Category name is required.";

    return;

  }


  if (!slug) {

    slug =
      slugify(name);

  }


  message.className =
    "message";

  message.textContent =
    "Creating category...";


  try {

    await api(
      "/api/admin/categories",
      {
        method: "POST",

        body: JSON.stringify({
          name,
          slug
        })
      }
    );


    message.className =
      "message success";

    message.textContent =
      "Category created.";


    await loadCategories();


    /*
      If opened from product editor,
      automatically select new category.
    */

    const created =
      state.categories.find(
        category =>
          category.name
            .toLowerCase() ===
          name.toLowerCase()
      );


    if (created) {

      $("#productCategory")
        .value =
          created.id;

    }


    setTimeout(
      closeCategoryModal,
      400
    );

  } catch (error) {

    message.className =
      "message";

    message.textContent =
      error.message;

  }

}


/* =========================================================
   HELPERS
========================================================= */

function getProductImage(product) {

  if (
    product?.imageUrl
  ) {

    return product.imageUrl;

  }


  const images =
    getExistingImages(product);


  return images[0]?.url || "";

}


function getProductCategory(product) {

  const categoryId =
    product?.data?.categoryId ||
    product?.data?.category_id;


  if (!categoryId) {
    return "";
  }


  const category =
    state.categories.find(
      item =>
        item.id === categoryId
    );


  return category?.name || "";

}


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


function slugify(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}


function clone(value) {

  return JSON.parse(
    JSON.stringify(value)
  );

}


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
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

  return escapeHtml(value);

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function toast(
  message,
  type = ""
) {

  const element =
    $("#toast");


  element.textContent =
    message;


  element.className =
    `toast show ${type}`;


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        element.className =
          "toast";

      },
      3000
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   Needed by inline product buttons.
========================================================= */

window.editProduct =
  editProduct;

window.duplicateProduct =
  duplicateProduct;

window.deleteProduct =
  deleteProduct;