/* =================================================
   SHOP SETTINGS
================================================= */

/*
  CHANGE THESE TWO VALUES
*/

const SHOP_NAME = "Imaginary Gifts";


/*
  Enter your WhatsApp number here.

  India example:
  917385235738

  Do NOT put + or spaces.
*/

const WHATSAPP_NUMBER = "919730157585";



/* =================================================
   STATE
================================================= */

let products = [];

let currentProduct = null;

let selectedColour = null;

let selectedSize = null;

let currentPrice = 0;

let selectedImageIndex = 0;



/* =================================================
   DOM
================================================= */

const $ = (id) =>
  document.getElementById(id);



/* =================================================
   INITIALIZE
================================================= */

async function init() {

  $("shopName").textContent =
    SHOP_NAME;


  try {

    const response =
      await fetch("/api/products");

    if (!response.ok) {

      throw new Error(
        "Could not load products"
      );

    }


    products =
      await response.json();


    if (!products.length) {

      $("productName").textContent =
        "No products available";

      $("productPrice").textContent =
        "";

      return;

    }


    /*
      If URL contains ?product=ID
      open that product.

      Otherwise open first product.
    */

    const params =
      new URLSearchParams(
        window.location.search
      );

    const productId =
      params.get("product");


    currentProduct =
      productId
        ? products.find(
            p => p.id === productId
          )
        : products[0];


    if (!currentProduct) {

      currentProduct =
        products[0];

    }


    loadProduct(
      currentProduct
    );


  } catch (error) {

    console.error(error);

    $("productName").textContent =
      "Unable to load catalogue";

  }

}



/* =================================================
   LOAD PRODUCT
================================================= */

function loadProduct(product) {

  currentProduct =
    product;


  selectedColour = null;

  selectedSize = null;


  $("productName").textContent =
    product.name;


  /*
    Read variant data from
    admin product data_json
  */

  const data =
    product.data || {};


  const colours =
    Array.isArray(data.colours)
      ? data.colours
      : [];


  const sizes =
    Array.isArray(data.sizes)
      ? data.sizes
      : [];


  /*
    Select first variant automatically
  */

  if (colours.length) {

    selectedColour =
      colours[0];

  }


  if (sizes.length) {

    selectedSize =
      sizes[0];

  }


  renderColours(
    colours
  );


  renderSizes(
    sizes
  );


  renderImages(
    product
  );


  updatePrice();

}



/* =================================================
   COLOUR VARIANTS
================================================= */

function renderColours(colours) {

  const section =
    $("colourSection");

  const container =
    $("colourList");


  if (!colours.length) {

    section.classList.add(
      "hidden"
    );

    container.innerHTML = "";

    return;

  }


  section.classList.remove(
    "hidden"
  );


  container.innerHTML =
    colours.map(
      (colour, index) => {

        return `
          <button
            class="variant-button ${
              selectedColour === colour
                ? "active"
                : ""
            }"
            data-colour-index="${index}"
          >

            ${escapeHtml(
              colour.name
            )}

            ${
              colour.price
                ? `
                  <span class="variant-price">
                    +₹${formatPrice(
                      colour.price
                    )}
                  </span>
                `
                : ""
            }

          </button>
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-colour-index]"
    )
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(
            button.dataset.colourIndex
          );


        selectedColour =
          colours[index];


        renderColours(
          colours
        );


        renderViewerColours(
          colours
        );


        updatePrice();

      };

    });

}



/* =================================================
   SIZE VARIANTS
================================================= */

function renderSizes(sizes) {

  const section =
    $("sizeSection");

  const container =
    $("sizeList");


  if (!sizes.length) {

    section.classList.add(
      "hidden"
    );

    container.innerHTML = "";

    return;

  }


  section.classList.remove(
    "hidden"
  );


  container.innerHTML =
    sizes.map(
      (size, index) => {

        return `
          <button
            class="variant-button ${
              selectedSize === size
                ? "active"
                : ""
            }"
            data-size-index="${index}"
          >

            ${escapeHtml(
              size.name
            )}

            ${
              size.price
                ? `
                  <span class="variant-price">
                    +₹${formatPrice(
                      size.price
                    )}
                  </span>
                `
                : ""
            }

          </button>
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-size-index]"
    )
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(
            button.dataset.sizeIndex
          );


        selectedSize =
          sizes[index];


        renderSizes(
          sizes
        );


        renderViewerSizes(
          sizes
        );


        updatePrice();

      };

    });

}



/* =================================================
   PRICE
================================================= */

function updatePrice() {

  if (!currentProduct) {

    return;

  }


  /*
    Final price:

    Base price
    +
    Colour price
    +
    Size price
  */

  let price =
    Number(
      currentProduct.price || 0
    );


  if (selectedColour) {

    price +=
      Number(
        selectedColour.price || 0
      );

  }


  if (selectedSize) {

    price +=
      Number(
        selectedSize.price || 0
      );

  }


  currentPrice =
    price;


  $("productPrice").textContent =
    "₹" + formatPrice(
      currentPrice
    );


  $("viewerPrice").textContent =
    "₹" + formatPrice(
      currentPrice
    );


  updateOrderSummary();

}



/* =================================================
   PRODUCT IMAGES
================================================= */

function getImages(product) {

  const data =
    product.data || {};


  /*
    Recommended format:

    data.images = [
      "/media/...",
      "/media/..."
    ]
  */


  if (
    Array.isArray(
      data.images
    )
  ) {

    return data.images
      .map(image => {

        if (
          typeof image === "string"
        ) {

          return image;

        }

        return image.url ||
          image.imageUrl ||
          "";

      })
      .filter(Boolean);

  }


  /*
    Fallback to imageUrl
  */

  if (product.imageUrl) {

    return [
      product.imageUrl
    ];

  }


  return [];

}



/* =================================================
   IMAGE GRID
================================================= */

function renderImages(product) {

  const container =
    $("imageGrid");


  const images =
    getImages(product);


  if (!images.length) {

    container.innerHTML =
      `<div class="empty">
        No images available
      </div>`;

    return;

  }


  container.innerHTML =
    images.map(
      (image, index) => {

        return `
          <img
            class="product-image"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(product.name)}"
            data-image-index="${index}"
            loading="lazy"
          >
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-image-index]"
    )
    .forEach(image => {

      image.onclick = () => {

        openViewer(
          Number(
            image.dataset.imageIndex
          )
        );

      };

    });

}



/* =================================================
   OPEN FULLSCREEN VIEWER
================================================= */

function openViewer(index) {

  selectedImageIndex =
    index;


  renderViewerImages();


  renderViewerColours(
    currentProduct?.data?.colours || []
  );


  renderViewerSizes(
    currentProduct?.data?.sizes || []
  );


  $("imageViewer")
    .classList
    .remove("hidden");


  document.body.style.overflow =
    "hidden";


  scrollViewerTo(
    index
  );

}



/* =================================================
   VIEWER IMAGES
================================================= */

function renderViewerImages() {

  const images =
    getImages(
      currentProduct
    );


  $("viewerImages").innerHTML =
    images.map(
      (image, index) => {

        return `
          <div
            class="viewer-slide"
            data-viewer-index="${index}"
          >

            <img
              src="${escapeHtml(image)}"
              alt=""
            >

          </div>
        `;

      }
    ).join("");


  $("viewerCounter").textContent =
    `${selectedImageIndex + 1} / ${images.length}`;


  /*
    Update counter when
    customer swipes image
  */

  $("viewerImages")
    .onscroll = () => {

      const width =
        $("viewerImages").clientWidth;


      if (!width) return;


      const index =
        Math.round(
          $("viewerImages").scrollLeft /
          width
        );


      selectedImageIndex =
        index;


      $("viewerCounter")
        .textContent =
        `${index + 1} / ${images.length}`;

    };

}



/* =================================================
   SCROLL VIEWER
================================================= */

function scrollViewerTo(index) {

  const container =
    $("viewerImages");


  setTimeout(() => {

    container.scrollTo({

      left:
        index *
        container.clientWidth,

      behavior: "instant"

    });

  }, 10);

}



/* =================================================
   VIEWER COLOURS
================================================= */

function renderViewerColours(
  colours
) {

  const section =
    $("viewerColourSection");

  const container =
    $("viewerColours");


  if (!colours.length) {

    section.classList.add(
      "hidden"
    );

    return;

  }


  section.classList.remove(
    "hidden"
  );


  container.innerHTML =
    colours.map(
      (colour, index) => {

        return `
          <button
            class="viewer-variant-button ${
              selectedColour === colour
                ? "active"
                : ""
            }"
            data-viewer-colour="${index}"
          >
            ${escapeHtml(
              colour.name
            )}
          </button>
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-viewer-colour]"
    )
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(
            button.dataset.viewerColour
          );


        selectedColour =
          colours[index];


        renderColours(
          colours
        );


        renderViewerColours(
          colours
        );


        updatePrice();

      };

    });

}



/* =================================================
   VIEWER SIZES
================================================= */

function renderViewerSizes(
  sizes
) {

  const section =
    $("viewerSizeSection");

  const container =
    $("viewerSizes");


  if (!sizes.length) {

    section.classList.add(
      "hidden"
    );

    return;

  }


  section.classList.remove(
    "hidden"
  );


  container.innerHTML =
    sizes.map(
      (size, index) => {

        return `
          <button
            class="viewer-variant-button ${
              selectedSize === size
                ? "active"
                : ""
            }"
            data-viewer-size="${index}"
          >
            ${escapeHtml(
              size.name
            )}
          </button>
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-viewer-size]"
    )
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(
            button.dataset.viewerSize
          );


        selectedSize =
          sizes[index];


        renderSizes(
          sizes
        );


        renderViewerSizes(
          sizes
        );


        updatePrice();

      };

    });

}



/* =================================================
   CLOSE VIEWER
================================================= */

$("closeViewer").onclick =
  closeViewer;


function closeViewer() {

  $("imageViewer")
    .classList
    .add("hidden");


  document.body.style.overflow =
    "";

}



/* =================================================
   ORDER BUTTON
================================================= */

$("orderButton").onclick =
  openOrderForm;


function openOrderForm() {

  if (!currentProduct) {

    return;

  }


  $("orderProductName")
    .textContent =
    currentProduct.name;


  updateOrderSummary();


  $("orderModal")
    .classList
    .remove("hidden");

}



/* =================================================
   ORDER SUMMARY
================================================= */

function updateOrderSummary() {

  if (
    !currentProduct
  ) {

    return;

  }


  $("orderProductName")
    .textContent =
    currentProduct.name;


  $("orderColour")
    .textContent =
    selectedColour
      ? selectedColour.name
      : "Default";


  $("orderSize")
    .textContent =
    selectedSize
      ? selectedSize.name
      : "Default";


  $("orderPrice")
    .textContent =
    "₹" +
    formatPrice(
      currentPrice
    );


  $("viewerPrice")
    .textContent =
    "₹" +
    formatPrice(
      currentPrice
    );

}



/* =================================================
   CLOSE ORDER
================================================= */

$("closeOrder").onclick =
  () => {

    $("orderModal")
      .classList
      .add("hidden");

  };



/* =================================================
   CONFIRM ORDER
================================================= */

$("confirmOrder").onclick =
  submitOrder;


async function submitOrder() {

  const name =
    $("customerName")
      .value
      .trim();


  const phone =
    $("customerPhone")
      .value
      .trim();


  const address =
    $("customerAddress")
      .value
      .trim();


  const pincode =
    $("customerPincode")
      .value
      .trim();


  /*
    Validation
  */

  if (!name) {

    showOrderMessage(
      "Please enter your name."
    );

    return;

  }


  if (!phone) {

    showOrderMessage(
      "Please enter your mobile number."
    );

    return;

  }


  if (!/^[0-9]{10}$/.test(
    phone.replace(/\D/g, "")
  )) {

    showOrderMessage(
      "Please enter a valid 10 digit mobile number."
    );

    return;

  }


  if (!address) {

    showOrderMessage(
      "Please enter your address."
    );

    return;

  }


  if (!/^[0-9]{6}$/.test(
    pincode
  )) {

    showOrderMessage(
      "Please enter a valid 6 digit pincode."
    );

    return;

  }


  /*
    Image customer selected
  */

  const images =
    getImages(
      currentProduct
    );


  const selectedImage =
    images[selectedImageIndex]
      || images[0]
      || "";


  const order = {

    customer: {

      name,

      phone,

      address,

      pincode

    },


    product: {

      id:
        currentProduct.id,

      name:
        currentProduct.name,

      image:
        selectedImage,

      colour:
        selectedColour
          ? selectedColour.name
          : "",

      size:
        selectedSize
          ? selectedSize.name
          : "",

      price:
        currentPrice

    }

  };


  try {

    $("confirmOrder")
      .disabled = true;


    $("confirmOrder")
      .textContent =
      "Saving Order...";


    /*
      Save order to D1
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
            JSON.stringify(order)

        }
      );


    const result =
      await response
        .json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        result.error ||
        "Could not save order."
      );

    }


    /*
      Create WhatsApp message
    */

    const message =
      createWhatsAppMessage(
        order,
        result.orderId
      );


    const whatsappURL =
      "https://wa.me/" +
      WHATSAPP_NUMBER +
      "?text=" +
      encodeURIComponent(
        message
      );


    /*
      Open WhatsApp
    */

    window.location.href =
      whatsappURL;


  } catch (error) {

    console.error(error);

    showOrderMessage(
      error.message
    );


  } finally {

    $("confirmOrder")
      .disabled = false;

    $("confirmOrder")
      .textContent =
      "Order on WhatsApp";

  }

}



/* =================================================
   WHATSAPP MESSAGE
================================================= */

function createWhatsAppMessage(
  order,
  orderId
) {

  const customer =
    order.customer;


  const product =
    order.product;


  return `*NEW ORDER*

*Order ID:* ${orderId}

*CUSTOMER DETAILS*
Name: ${customer.name}
Mobile: ${customer.phone}
Address: ${customer.address}
Pincode: ${customer.pincode}

*PRODUCT DETAILS*
Product: ${product.name}
Colour: ${product.colour || "Default"}
Size: ${product.size || "Default"}
Price: ₹${formatPrice(product.price)}

*PRODUCT IMAGE*
${product.image}

Thank you.`;

}



/* =================================================
   MESSAGE
================================================= */

function showOrderMessage(
  message
) {

  $("orderMessage")
    .textContent =
    message;

}



/* =================================================
   FORMAT PRICE
================================================= */

function formatPrice(
  value
) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-IN"
  );

}



/* =================================================
   ESCAPE HTML
================================================= */

function escapeHtml(
  value
) {

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



/* =================================================
   START
================================================= */

init();
