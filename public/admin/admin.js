const $ = (id) => document.getElementById(id);

let colours = [];
let sizes = [];
let editingProductId = null;


/* ================= API ================= */

async function api(url, options = {}) {

  const response = await fetch(url, {
    ...options,

    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),

      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}


/* ================= LOGIN STATE ================= */

async function checkLogin() {

  try {

    const user = await api("/api/me");

    if (user.loggedIn) {

      showAdmin();

      loadProducts();

      return;
    }

  } catch (error) {}

  showLogin();
}


function showLogin() {

  $("loginPage").classList.remove("hidden");
  $("adminPage").classList.add("hidden");

  $("logoutBtn").classList.add("hidden");

  showLoginForm();
}


function showAdmin() {

  $("loginPage").classList.add("hidden");
  $("adminPage").classList.remove("hidden");

  $("logoutBtn").classList.remove("hidden");
}


/* ================= LOGIN FORM ================= */

function showLoginForm() {

  $("authTitle").textContent = "Admin Login";

  $("authSubtitle").textContent =
    "Login to manage your products";

  $("loginForm").classList.remove("hidden");

  $("registerForm").classList.add("hidden");

  $("loginMessage").textContent = "";
  $("registerMessage").textContent = "";
}


function showRegisterForm() {

  $("authTitle").textContent = "New User";

  $("authSubtitle").textContent =
    "Create your admin account";

  $("loginForm").classList.add("hidden");

  $("registerForm").classList.remove("hidden");

  $("registerMessage").textContent = "";
}


/* ================= LOGIN ================= */

$("loginBtn").onclick = async () => {

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;

  if (!email || !password) {

    $("loginMessage").textContent =
      "Enter email and password.";

    return;
  }

  try {

    $("loginBtn").disabled = true;

    await api("/api/login", {

      method: "POST",

      body: JSON.stringify({
        email,
        password
      })

    });

    showAdmin();

    loadProducts();

  } catch (error) {

    $("loginMessage").textContent =
      error.message;

  } finally {

    $("loginBtn").disabled = false;

  }

};


/* ================= NEW USER ================= */

$("showRegisterBtn").onclick =
  showRegisterForm;


$("showLoginBtn").onclick =
  showLoginForm;


$("registerBtn").onclick = async () => {

  const email =
    $("registerEmail").value.trim();

  const password =
    $("registerPassword").value;

  const password2 =
    $("registerPassword2").value;


  if (!email || !password) {

    $("registerMessage").textContent =
      "Enter email and password.";

    return;
  }


  if (password.length < 8) {

    $("registerMessage").textContent =
      "Password must be at least 8 characters.";

    return;
  }


  if (password !== password2) {

    $("registerMessage").textContent =
      "Passwords do not match.";

    return;
  }


  try {

    $("registerBtn").disabled = true;

    const result = await api("/api/register", {

      method: "POST",

      body: JSON.stringify({
        email,
        password
      })

    });


    $("registerEmail").value = "";
    $("registerPassword").value = "";
    $("registerPassword2").value = "";

    showLoginForm();

    $("loginEmail").value = email;

    $("loginMessage").textContent =
      result.message ||
      "User created successfully. Please login.";

    $("loginMessage").classList.add("success");

  } catch (error) {

    $("registerMessage").textContent =
      error.message;

  } finally {

    $("registerBtn").disabled = false;

  }

};


/* ================= LOGOUT ================= */

$("logoutBtn").onclick = async () => {

  try {

    await api("/api/logout", {
      method: "POST"
    });

  } catch (error) {}

  location.reload();
};


/* ================= COLOURS ================= */

$("addColourBtn").onclick = () => {

  colours.push({
    id: crypto.randomUUID(),
    name: "",
    price: 0
  });

  renderColours();
};


function renderColours() {

  $("colourList").innerHTML =
    colours.map((colour, index) => {

      return `
        <div class="option-row">

          <input
            type="text"
            placeholder="Colour e.g. Black"
            value="${escapeHtml(colour.name)}"
            data-colour-name="${index}"
          >

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value="${Number(colour.price || 0)}"
            data-colour-price="${index}"
          >

          <button
            class="remove-btn"
            data-remove-colour="${index}"
          >
            ×
          </button>

        </div>
      `;

    }).join("");


  document
    .querySelectorAll("[data-colour-name]")
    .forEach(input => {

      input.oninput = () => {

        colours[input.dataset.colourName].name =
          input.value;

      };

    });


  document
    .querySelectorAll("[data-colour-price]")
    .forEach(input => {

      input.oninput = () => {

        colours[input.dataset.colourPrice].price =
          Number(input.value || 0);

      };

    });


  document
    .querySelectorAll("[data-remove-colour]")
    .forEach(button => {

      button.onclick = () => {

        colours.splice(
          Number(button.dataset.removeColour),
          1
        );

        renderColours();

      };

    });

}


/* ================= SIZES ================= */

$("addSizeBtn").onclick = () => {

  sizes.push({
    id: crypto.randomUUID(),
    name: "",
    price: 0
  });

  renderSizes();
};


function renderSizes() {

  $("sizeList").innerHTML =
    sizes.map((size, index) => {

      return `
        <div class="option-row">

          <input
            type="text"
            placeholder="Size e.g. 12x18"
            value="${escapeHtml(size.name)}"
            data-size-name="${index}"
          >

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value="${Number(size.price || 0)}"
            data-size-price="${index}"
          >

          <button
            class="remove-btn"
            data-remove-size="${index}"
          >
            ×
          </button>

        </div>
      `;

    }).join("");


  document
    .querySelectorAll("[data-size-name]")
    .forEach(input => {

      input.oninput = () => {

        sizes[input.dataset.sizeName].name =
          input.value;

      };

    });


  document
    .querySelectorAll("[data-size-price]")
    .forEach(input => {

      input.oninput = () => {

        sizes[input.dataset.sizePrice].price =
          Number(input.value || 0);

      };

    });


  document
    .querySelectorAll("[data-remove-size]")
    .forEach(button => {

      button.onclick = () => {

        sizes.splice(
          Number(button.dataset.removeSize),
          1
        );

        renderSizes();

      };

    });

}


/* ================= IMAGE PREVIEW ================= */

$("productImages").onchange = () => {

  const files =
    Array.from($("productImages").files || []);

  $("imagePreview").innerHTML = "";

  files.forEach(file => {

    const url =
      URL.createObjectURL(file);

    const div =
      document.createElement("div");

    div.className =
      "preview-item";

    div.innerHTML =
      `<img src="${url}" alt="">`;

    $("imagePreview").appendChild(div);

  });

};


/* ================= SAVE PRODUCT ================= */

$("saveProductBtn").onclick = async () => {

  const name =
    $("productName").value.trim();

  const price =
    Number($("productPrice").value || 0);

  const active =
    $("productActive").checked;


  if (!name) {

    showProductMessage(
      "Enter product name."
    );

    return;

  }


  try {

    $("saveProductBtn").disabled = true;


    const body = {

      name,

      price,

      active,

      data: {

        colours,

        sizes

      }

    };


    let result;


    if (editingProductId) {

      result = await api(
        `/api/admin/products/${editingProductId}`,
        {
          method: "PUT",
          body: JSON.stringify(body)
        }
      );

    } else {

      result = await api(
        "/api/admin/products",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );

    }


    const productId =
      editingProductId || result.id;


    /* Upload selected images */

    const files =
      Array.from(
        $("productImages").files || []
      );


    for (const file of files) {

      const form =
        new FormData();

      form.append(
        "productId",
        productId
      );

      form.append(
        "file",
        file
      );


      await fetch(
        "/api/admin/product-images",
        {
          method: "POST",
          body: form
        }
      );

    }


    showProductMessage(
      editingProductId
        ? "Product updated successfully."
        : "Product saved successfully.",
      true
    );


    resetProductForm();

    await loadProducts();


  } catch (error) {

    showProductMessage(
      error.message
    );

  } finally {

    $("saveProductBtn").disabled = false;

  }

};


/* ================= LOAD PRODUCTS ================= */

async function loadProducts() {

  try {

    const products =
      await api("/api/admin/products");

    renderProducts(products);

  } catch (error) {

    $("productsList").innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;

  }

}


function renderProducts(products) {

  if (!products.length) {

    $("productsList").innerHTML =
      `<div class="empty">
        No products added yet.
      </div>`;

    return;

  }


  $("productsList").innerHTML =
    products.map(product => {

      const data =
        product.data || {};

      const image =
        product.imageUrl ||
        data.images?.[0] ||
        "";


      return `
        <div class="product-item">

          ${
            image
              ? `<img
                  class="product-image"
                  src="${escapeHtml(image)}"
                  alt=""
                >`
              : `<div class="product-image"></div>`
          }


          <div class="product-info">

            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <p>
              ₹${Number(product.price || 0).toLocaleString("en-IN")}
            </p>

            <span class="product-status ${
              product.active
                ? "status-on"
                : "status-off"
            }">

              ${
                product.active
                  ? "Shown on Frontend"
                  : "Hidden"
              }

            </span>

          </div>


          <div class="product-actions">

            <button
              class="edit-btn"
              data-edit="${product.id}"
            >
              Edit
            </button>

            <button
              class="delete-btn"
              data-delete="${product.id}"
            >
              Delete
            </button>

          </div>

        </div>
      `;

    }).join("");


  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.onclick =
        () => editProduct(
          button.dataset.edit,
          products
        );

    });


  document
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.onclick =
        () => deleteProduct(
          button.dataset.delete
        );

    });

}


/* ================= EDIT ================= */

function editProduct(id, products) {

  const product =
    products.find(
      item => item.id === id
    );

  if (!product) return;


  editingProductId =
    product.id;


  $("productFormTitle").textContent =
    "Edit Product";


  $("productId").value =
    product.id;


  $("productName").value =
    product.name || "";


  $("productPrice").value =
    product.price || 0;


  $("productActive").checked =
    product.active !== false;


  const data =
    product.data || {};


  colours =
    structuredClone(
      data.colours || []
    );


  sizes =
    structuredClone(
      data.sizes || []
    );


  renderColours();
  renderSizes();


  $("productImages").value = "";

  $("imagePreview").innerHTML = "";


  $("cancelEditBtn")
    .classList
    .remove("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ================= DELETE ================= */

async function deleteProduct(id) {

  if (!confirm(
    "Are you sure you want to delete this product?"
  )) {

    return;

  }


  try {

    await api(
      `/api/admin/products/${id}`,
      {
        method: "DELETE"
      }
    );


    await loadProducts();


  } catch (error) {

    alert(error.message);

  }

}


/* ================= RESET ================= */

$("cancelEditBtn").onclick =
  resetProductForm;


function resetProductForm() {

  editingProductId = null;

  $("productFormTitle").textContent =
    "Add Product";

  $("productId").value = "";

  $("productName").value = "";

  $("productPrice").value = "";

  $("productActive").checked = true;

  $("productImages").value = "";

  $("imagePreview").innerHTML = "";

  colours = [];

  sizes = [];

  renderColours();

  renderSizes();

  $("cancelEditBtn")
    .classList
    .add("hidden");

}


/* ================= REFRESH ================= */

$("refreshProductsBtn").onclick =
  loadProducts;


/* ================= MESSAGE ================= */

function showProductMessage(
  message,
  success = false
) {

  $("productMessage").textContent =
    message;

  $("productMessage")
    .classList
    .toggle(
      "success",
      success
    );

}


/* ================= ESCAPE HTML ================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* ================= START ================= */

checkLogin();
