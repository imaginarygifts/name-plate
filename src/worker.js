const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra
    }
  });

const text = (data, status = 200, extra = {}) =>
  new Response(data, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...extra
    }
  });

const now = () => Date.now();

const id = () => crypto.randomUUID();


/* =========================================================
   BASE64 HELPERS
========================================================= */

function b64(bytes) {
  let s = "";

  const arr = new Uint8Array(bytes);

  for (
    let i = 0;
    i < arr.length;
    i += 0x8000
  ) {
    s += String.fromCharCode(
      ...arr.subarray(i, i + 0x8000)
    );
  }

  return btoa(s)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


function unb64(s) {

  s = s
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (s.length % 4) {
    s += "=";
  }

  const bin = atob(s);

  return Uint8Array.from(
    bin,
    c => c.charCodeAt(0)
  );
}


/* =========================================================
   HASHING
========================================================= */

async function sha256(value) {

  const data =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value;

  return b64(
    await crypto.subtle.digest(
      "SHA-256",
      data
    )
  );
}


async function derivePassword(
  password,
  saltB64
) {

  const salt =
    unb64(saltB64);

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

  return b64(bits);
}


async function hashPassword(
  password
) {

  const salt =
    new Uint8Array(16);

  crypto.getRandomValues(salt);

  const saltB64 =
    b64(salt);

  return {
    salt: saltB64,
    hash:
      await derivePassword(
        password,
        saltB64
      )
  };
}


/* =========================================================
   HELPERS
========================================================= */

function parseJSON(
  value,
  fallback
) {

  try {

    return JSON.parse(
      value ?? ""
    );

  } catch {

    return fallback;

  }

}


function cleanProduct(row) {

  return {

    id: row.id,

    name: row.name,

    slug:
      row.slug || "",

    description:
      row.description || "",

    price:
      Number(row.price || 0),

    imageUrl:
      row.image_url || "",

    active:
      Boolean(row.active),

    data:
      parseJSON(
        row.data_json,
        {}
      )

  };

}


function mediaUrl(
  objectKey
) {

  return `/media/${encodeURIComponent(
    objectKey
  )}`;

}


/* =========================================================
   ADMIN SESSION
========================================================= */

async function adminFromRequest(
  request,
  env
) {

  const cookie =
    request.headers.get(
      "cookie"
    ) || "";

  const match =
    cookie.match(
      /(?:^|;\s*)cf_admin=([^;]+)/
    );

  if (!match) {
    return null;
  }

  const token =
    decodeURIComponent(
      match[1]
    );

  const tokenHash =
    await sha256(token);

  const row =
    await env.DB.prepare(`
      SELECT
        a.id,
        a.email
      FROM sessions s
      JOIN admins a
        ON a.id = s.admin_id
      WHERE
        s.token_hash = ?
        AND s.expires_at > ?
    `)
      .bind(
        tokenHash,
        now()
      )
      .first();

  return row || null;

}


/* =========================================================
   API
========================================================= */

async function api(
  request,
  env
) {

  const url =
    new URL(request.url);

  const path =
    url.pathname;


  /* =======================================================
     HEALTH
  ======================================================= */

  if (
    path === "/api/health" &&
    request.method === "GET"
  ) {

    return json({
      ok: true,
      service: "catalogue-api",
      time: now()
    });

  }


  /* =======================================================
     PUBLIC PRODUCTS
  ======================================================= */

  if (
    path === "/api/products" &&
    request.method === "GET"
  ) {

    const rows =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE active = 1
        ORDER BY name ASC
      `).all();


    return json(
      rows.results.map(
        cleanProduct
      ),
      200,
      {
        "cache-control":
          "public, max-age=30"
      }
    );

  }


  /* =======================================================
     PUBLIC SINGLE PRODUCT
  ======================================================= */

  const publicProduct =
    path.match(
      /^\/api\/products\/([^/]+)$/
    );


  if (
    publicProduct &&
    request.method === "GET"
  ) {

    const product =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
          AND active = 1
      `)
        .bind(
          publicProduct[1]
        )
        .first();


    if (!product) {

      return json(
        {
          error:
            "Product not found"
        },
        404
      );

    }


    return json(
      cleanProduct(product),
      200,
      {
        "cache-control":
          "public, max-age=30"
      }
    );

  }


  /* =======================================================
     FIRST ADMIN SETUP
  ======================================================= */

  if (
    path === "/api/setup" &&
    request.method === "POST"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    if (
      !env.SETUP_KEY ||
      body.setupKey !==
        env.SETUP_KEY
    ) {

      return json(
        {
          error:
            "Invalid setup key"
        },
        403
      );

    }


    const existing =
      await env.DB.prepare(
        "SELECT id FROM admins LIMIT 1"
      ).first();


    if (existing) {

      return json(
        {
          error:
            "Admin already exists. Setup is locked."
        },
        409
      );

    }


    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();


    const password =
      String(
        body.password || ""
      );


    if (
      !email ||
      password.length < 8
    ) {

      return json(
        {
          error:
            "Email and password (8+ characters) are required."
        },
        400
      );

    }


    const hp =
      await hashPassword(
        password
      );


    const adminId =
      id();


    await env.DB.prepare(`
      INSERT INTO admins
      (
        id,
        email,
        password_hash,
        salt,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        adminId,
        email,
        hp.hash,
        hp.salt,
        now()
      )
      .run();


    return json(
      {
        ok: true,
        message:
          "Admin created successfully."
      },
      201
    );

  }


  /* =======================================================
     LOGIN
  ======================================================= */

  if (
    path === "/api/login" &&
    request.method === "POST"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();


    const password =
      String(
        body.password || ""
      );


    const admin =
      await env.DB.prepare(`
        SELECT *
        FROM admins
        WHERE email = ?
      `)
        .bind(email)
        .first();


    if (!admin) {

      return json(
        {
          error:
            "Invalid login"
        },
        401
      );

    }


    const check =
      await derivePassword(
        password,
        admin.salt
      );


    if (
      check !==
      admin.password_hash
    ) {

      return json(
        {
          error:
            "Invalid login"
        },
        401
      );

    }


    const tokenBytes =
      new Uint8Array(32);


    crypto.getRandomValues(
      tokenBytes
    );


    const token =
      b64(tokenBytes);


    const tokenHash =
      await sha256(token);


    const expires =
      now() +
      7 *
      24 *
      60 *
      60 *
      1000;


    await env.DB.prepare(`
      INSERT INTO sessions
      (
        token_hash,
        admin_id,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?)
    `)
      .bind(
        tokenHash,
        admin.id,
        expires,
        now()
      )
      .run();


    return json(
      {
        ok: true,
        email:
          admin.email
      },
      200,
      {
        "set-cookie":
          `cf_admin=${encodeURIComponent(
            token
          )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      }
    );

  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  if (
    path === "/api/logout" &&
    request.method === "POST"
  ) {

    const cookie =
      request.headers.get(
        "cookie"
      ) || "";


    const match =
      cookie.match(
        /(?:^|;\s*)cf_admin=([^;]+)/
      );


    if (match) {

      const token =
        decodeURIComponent(
          match[1]
        );


      const tokenHash =
        await sha256(token);


      await env.DB.prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
      `)
        .bind(tokenHash)
        .run();

    }


    return json(
      {
        ok: true
      },
      200,
      {
        "set-cookie":
          "cf_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      }
    );

  }


  /* =======================================================
     CURRENT USER
  ======================================================= */

  if (
    path === "/api/me" &&
    request.method === "GET"
  ) {

    const admin =
      await adminFromRequest(
        request,
        env
      );


    if (!admin) {

      return json(
        {
          loggedIn: false
        },
        401
      );

    }


    return json({
      loggedIn: true,
      email:
        admin.email
    });

  }


  /* =======================================================
     NEW USER / ADMIN REGISTRATION
     
     NOTE:
     This is intentionally open because you requested
     a "New User" button.
  ======================================================= */

  if (
    path === "/api/register" &&
    request.method === "POST"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();


    const password =
      String(
        body.password || ""
      );


    if (!email) {

      return json(
        {
          error:
            "Email is required."
        },
        400
      );

    }


    if (
      password.length < 8
    ) {

      return json(
        {
          error:
            "Password must be at least 8 characters."
        },
        400
      );

    }


    const existing =
      await env.DB.prepare(`
        SELECT id
        FROM admins
        WHERE email = ?
      `)
        .bind(email)
        .first();


    if (existing) {

      return json(
        {
          error:
            "User already exists."
        },
        409
      );

    }


    const hp =
      await hashPassword(
        password
      );


    const adminId =
      id();


    await env.DB.prepare(`
      INSERT INTO admins
      (
        id,
        email,
        password_hash,
        salt,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        adminId,
        email,
        hp.hash,
        hp.salt,
        now()
      )
      .run();


    return json(
      {
        ok: true,
        message:
          "User created successfully. Please login."
      },
      201
    );

  }


  /* =======================================================
     EVERYTHING BELOW HERE REQUIRES ADMIN LOGIN
  ======================================================= */

  const admin =
    await adminFromRequest(
      request,
      env
    );


  if (!admin) {

    return json(
      {
        error:
          "Admin authentication required"
      },
      401
    );

  }


  /* =======================================================
     ADMIN - ALL PRODUCTS
  ======================================================= */

  if (
    path === "/api/admin/products" &&
    request.method === "GET"
  ) {

    const rows =
      await env.DB.prepare(`
        SELECT *
        FROM products
        ORDER BY name ASC
      `).all();


    return json(
      rows.results.map(
        cleanProduct
      )
    );

  }


  /* =======================================================
     ADMIN - CREATE PRODUCT
  ======================================================= */

  if (
    path === "/api/admin/products" &&
    request.method === "POST"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const productId =
      id();


    const timestamp =
      now();


    const name =
      String(
        body.name || ""
      ).trim();


    if (!name) {

      return json(
        {
          error:
            "Product name is required."
        },
        400
      );

    }


    const data =
      body.data &&
      typeof body.data === "object"
        ? body.data
        : {};


    /*
      Always create an images array.
    */

    if (
      !Array.isArray(
        data.images
      )
    ) {

      data.images = [];

    }


    await env.DB.prepare(`
      INSERT INTO products
      (
        id,
        name,
        slug,
        description,
        price,
        image_url,
        active,
        data_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        productId,
        name,
        String(
          body.slug || ""
        ).trim(),
        String(
          body.description || ""
        ),
        Number(
          body.price || 0
        ),
        "",
        body.active === false
          ? 0
          : 1,
        JSON.stringify(
          data
        ),
        timestamp,
        timestamp
      )
      .run();


    return json(
      {
        ok: true,
        id:
          productId
      },
      201
    );

  }


  /* =======================================================
     ADMIN - EDIT PRODUCT
  ======================================================= */

  const productRoute =
    path.match(
      /^\/api\/admin\/products\/([^/]+)$/
    );


  if (
    productRoute &&
    request.method === "PUT"
  ) {

    const productId =
      productRoute[1];


    const oldProduct =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
      `)
        .bind(
          productId
        )
        .first();


    if (!oldProduct) {

      return json(
        {
          error:
            "Product not found."
        },
        404
      );

    }


    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const oldData =
      parseJSON(
        oldProduct.data_json,
        {}
      );


    const newData =
      body.data &&
      typeof body.data === "object"
        ? body.data
        : {};


    /*
      IMPORTANT:
      Preserve existing R2 images.
    */

    if (
      !Array.isArray(
        newData.images
      )
    ) {

      newData.images =
        Array.isArray(
          oldData.images
        )
          ? oldData.images
          : [];

    }


    const imageUrl =
      body.imageUrl !== undefined
        ? String(
            body.imageUrl || ""
          )
        : (
            oldProduct.image_url ||
            newData.images[0] ||
            ""
          );


    await env.DB.prepare(`
      UPDATE products
      SET
        name = ?,
        slug = ?,
        description = ?,
        price = ?,
        image_url = ?,
        active = ?,
        data_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        String(
          body.name ||
          oldProduct.name
        ).trim(),

        String(
          body.slug ??
          oldProduct.slug ??
          ""
        ).trim(),

        String(
          body.description ??
          oldProduct.description ??
          ""
        ),

        Number(
          body.price ??
          oldProduct.price ??
          0
        ),

        imageUrl,

        body.active === false
          ? 0
          : 1,

        JSON.stringify(
          newData
        ),

        now(),

        productId
      )
      .run();


    return json({
      ok: true
    });

  }


  /* =======================================================
     ADMIN - DELETE PRODUCT
     
     Also removes its R2 images.
  ======================================================= */

  if (
    productRoute &&
    request.method === "DELETE"
  ) {

    const product =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
      `)
        .bind(
          productRoute[1]
        )
        .first();


    if (!product) {

      return json(
        {
          error:
            "Product not found."
        },
        404
      );

    }


    const data =
      parseJSON(
        product.data_json,
        {}
      );


    const images =
      Array.isArray(
        data.images
      )
        ? data.images
        : [];


    /*
      Delete R2 files.
    */

    for (
      const image of images
    ) {

      if (
        typeof image !== "string"
      ) {

        continue;

      }


      if (
        !image.startsWith(
          "/media/"
        )
      ) {

        continue;

      }


      const objectKey =
        decodeURIComponent(
          image.slice(
            "/media/".length
          )
        );


      try {

        await env.MEDIA.delete(
          objectKey
        );

      } catch (e) {

        console.error(
          "R2 delete failed:",
          e
        );

      }

    }


    await env.DB.prepare(`
      DELETE FROM products
      WHERE id = ?
    `)
      .bind(
        productRoute[1]
      )
      .run();


    return json({
      ok: true
    });

  }


  /* =======================================================
     ADMIN - UPLOAD PRODUCT IMAGE
  ======================================================= */

  if (
    path ===
      "/api/admin/product-images" &&
    request.method === "POST"
  ) {

    const form =
      await request.formData();


    const productId =
      String(
        form.get(
          "productId"
        ) || ""
      );


    const file =
      form.get(
        "file"
      );


    if (!productId) {

      return json(
        {
          error:
            "productId is required."
        },
        400
      );

    }


    if (
      !(file instanceof File)
    ) {

      return json(
        {
          error:
            "Image file is required."
        },
        400
      );

    }


    /*
      Check product.
    */

    const product =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
      `)
        .bind(
          productId
        )
        .first();


    if (!product) {

      return json(
        {
          error:
            "Product not found."
        },
        404
      );

    }


    /*
      Basic image validation.
    */

    const allowedTypes =
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif"
      ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      return json(
        {
          error:
            "Only JPG, PNG, WEBP, GIF or AVIF images are allowed."
        },
        400
      );

    }


    /*
      Maximum 10 MB per image.
    */

    if (
      file.size >
      10 * 1024 * 1024
    ) {

      return json(
        {
          error:
            "Image must be smaller than 10 MB."
        },
        400
      );

    }


    /*
      Extension.
    */

    let ext =
      (
        file.name
          .split(".")
          .pop() ||
        ""
      )
        .replace(
          /[^a-zA-Z0-9]/g,
          ""
        )
        .toLowerCase();


    if (!ext) {

      ext =
        file.type ===
        "image/jpeg"
          ? "jpg"
          : "bin";

    }


    /*
      R2 object key.
    */

    const objectKey =
      `products/${productId}/${crypto.randomUUID()}.${ext}`;


    /*
      Upload directly to R2.
    */

    await env.MEDIA.put(
      objectKey,
      file.stream(),
      {
        httpMetadata: {

          contentType:
            file.type,

          cacheControl:
            "public, max-age=31536000, immutable"

        }
      }
    );


    const imageUrl =
      mediaUrl(
        objectKey
      );


    /*
      Read existing data.
    */

    const data =
      parseJSON(
        product.data_json,
        {}
      );


    if (
      !Array.isArray(
        data.images
      )
    ) {

      data.images = [];

    }


    /*
      Add new image.
    */

    data.images.push(
      imageUrl
    );


    /*
      First image becomes
      product image.
    */

    const mainImage =
      product.image_url ||
      imageUrl;


    await env.DB.prepare(`
      UPDATE products
      SET
        image_url = ?,
        data_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        mainImage,
        JSON.stringify(
          data
        ),
        now(),
        productId
      )
      .run();


    return json(
      {
        ok: true,

        imageUrl,

        totalImages:
          data.images.length
      },
      201
    );

  }


  /* =======================================================
     ADMIN - DELETE PRODUCT IMAGE
  ======================================================= */

  const productImageDelete =
    path.match(
      /^\/api\/admin\/product-images\/(.+)$/
    );


  if (
    productImageDelete &&
    request.method === "DELETE"
  ) {

    const encodedKey =
      productImageDelete[1];


    const objectKey =
      decodeURIComponent(
        encodedKey
      );


    const productId =
      String(
        new URL(
          request.url
        ).searchParams.get(
          "productId"
        ) || ""
      );


    if (!productId) {

      return json(
        {
          error:
            "productId is required."
        },
        400
      );

    }


    const product =
      await env.DB.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
      `)
        .bind(
          productId
        )
        .first();


    if (!product) {

      return json(
        {
          error:
            "Product not found."
        },
        404
      );

    }


    const data =
      parseJSON(
        product.data_json,
        {}
      );


    data.images =
      Array.isArray(
        data.images
      )
        ? data.images.filter(
            image =>
              image !==
              mediaUrl(
                objectKey
              )
          )
        : [];


    await env.MEDIA.delete(
      objectKey
    );


    const newMainImage =
      data.images[0] || "";


    await env.DB.prepare(`
      UPDATE products
      SET
        image_url = ?,
        data_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        newMainImage,
        JSON.stringify(
          data
        ),
        now(),
        productId
      )
      .run();


    return json({
      ok: true
    });

  }


  /* =======================================================
     ORDERS
  ======================================================= */

  if (
    path === "/api/orders" &&
    request.method === "POST"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const customer =
      body.customer || {};


    const product =
      body.product || {};


    const customerName =
      String(
        customer.name || ""
      ).trim();


    const customerPhone =
      String(
        customer.phone || ""
      ).trim();


    const address =
      String(
        customer.address || ""
      ).trim();


    const pincode =
      String(
        customer.pincode || ""
      ).trim();


    const productId =
      String(
        product.id || ""
      ).trim();


    const productName =
      String(
        product.name || ""
      ).trim();


    const productImage =
      String(
        product.image || ""
      ).trim();


    const colour =
      String(
        product.colour || ""
      ).trim();


    const size =
      String(
        product.size || ""
      ).trim();


    const price =
      Number(
        product.price || 0
      );


    if (
      !customerName ||
      !customerPhone ||
      !address ||
      !pincode ||
      !productId ||
      !productName
    ) {

      return json(
        {
          error:
            "Required order details are missing."
        },
        400
      );

    }


    /*
      Make sure the product
      actually exists.
    */

    const realProduct =
      await env.DB.prepare(`
        SELECT id, name
        FROM products
        WHERE id = ?
          AND active = 1
      `)
        .bind(
          productId
        )
        .first();


    if (!realProduct) {

      return json(
        {
          error:
            "Product is no longer available."
        },
        400
      );

    }


    const orderId =
      "IG-" +
      Date.now()
        .toString(36)
        .toUpperCase() +
      "-" +
      crypto.randomUUID()
        .slice(0, 6)
        .toUpperCase();


    const createdAt =
      now();


    /*
      IMPORTANT:
      The orders table must exist.
    */

    await env.DB.prepare(`
      INSERT INTO orders
      (
        id,
        customer_name,
        customer_phone,
        customer_address,
        pincode,
        product_id,
        product_name,
        product_image,
        colour,
        size,
        price,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        orderId,
        customerName,
        customerPhone,
        address,
        pincode,
        productId,
        productName,
        productImage,
        colour,
        size,
        price,
        "new",
        createdAt
      )
      .run();


    return json(
      {
        ok: true,
        orderId
      },
      201
    );

  }


  /* =======================================================
     ADMIN - ORDERS
  ======================================================= */

  if (
    path === "/api/admin/orders" &&
    request.method === "GET"
  ) {

    const rows =
      await env.DB.prepare(`
        SELECT *
        FROM orders
        ORDER BY created_at DESC
      `).all();


    return json(
      rows.results
    );

  }


  /* =======================================================
     ADMIN - ORDER STATUS
  ======================================================= */

  const orderRoute =
    path.match(
      /^\/api\/admin\/orders\/([^/]+)$/
    );


  if (
    orderRoute &&
    request.method === "PUT"
  ) {

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const status =
      String(
        body.status || "new"
      );


    const allowed =
      [
        "new",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ];


    if (
      !allowed.includes(
        status
      )
    ) {

      return json(
        {
          error:
            "Invalid order status."
        },
        400
      );

    }


    await env.DB.prepare(`
      UPDATE orders
      SET status = ?
      WHERE id = ?
    `)
      .bind(
        status,
        orderRoute[1]
      )
      .run();


    return json({
      ok: true
    });

  }


  /* =======================================================
     OLD CATALOGUE API
     
     Kept so existing catalogue data
     doesn't suddenly stop working.
  ======================================================= */

  if (
    path === "/api/catalogues" &&
    request.method === "GET"
  ) {

    const rows =
      await env.DB.prepare(`
        SELECT c.*,
          (
            SELECT COUNT(*)
            FROM catalogue_images i
            WHERE i.catalogue_id = c.id
          ) AS image_count
        FROM catalogues c
        WHERE c.active = 1
        ORDER BY
          c.display_order ASC,
          c.created_at ASC
      `).all();


    return json(
      rows.results.map(
        c => ({
          id: c.id,

          name: c.name,

          description:
            c.description,

          order:
            c.display_order,

          active:
            Boolean(c.active),

          colours:
            parseJSON(
              c.colours_json,
              []
            ),

          sizes:
            parseJSON(
              c.sizes_json,
              []
            ),

          imageCount:
            c.image_count
        })
      )
    );

  }


  /* =======================================================
     NOT FOUND
  ======================================================= */

  return json(
    {
      error:
        "Not found"
    },
    404
  );

}


/* =========================================================
   WORKER
========================================================= */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(
        request.url
      );


    /*
      API
    */

    if (
      url.pathname.startsWith(
        "/api/"
      )
    ) {

      try {

        return await api(
          request,
          env
        );

      } catch (error) {

        console.error(
          error
        );

        return json(
          {
            error:
              error?.message ||
              "Server error"
          },
          500
        );

      }

    }


    /*
      R2 media
    */

    if (
      url.pathname.startsWith(
        "/media/"
      )
    ) {

      const key =
        decodeURIComponent(
          url.pathname.slice(
            "/media/".length
          )
        );


      const object =
        await env.MEDIA.get(
          key
        );


      if (!object) {

        return text(
          "Not found",
          404
        );

      }


      const headers =
        new Headers();


      object.writeHttpMetadata(
        headers
      );


      headers.set(
        "etag",
        object.httpEtag
      );


      headers.set(
        "cache-control",
        "public, max-age=31536000, immutable"
      );


      return new Response(
        object.body,
        {
          headers
        }
      );

    }


    /*
      Website files
    */

    return env.ASSETS.fetch(
      request
    );

  }

};
