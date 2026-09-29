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

function b64(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 0x8000) {
    s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function sha256(value) {
  const data = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return b64(await crypto.subtle.digest("SHA-256", data));
}

async function derivePassword(password, saltB64) {
  const salt = unb64(saltB64);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits);
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltB64 = b64(salt);
  return { salt: saltB64, hash: await derivePassword(password, saltB64) };
}

function parseJSON(value, fallback) {
  try { return JSON.parse(value ?? ""); } catch { return fallback; }
}

function cleanProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || "",
    description: row.description || "",
    price: Number(row.price || 0),
    imageUrl: row.image_url || "",
    active: Boolean(row.active),
    data: parseJSON(row.data_json, {})
  };
}

async function adminFromRequest(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)cf_admin=([^;]+)/);
  if (!match) return null;
  const tokenHash = await sha256(decodeURIComponent(match[1]));
  const row = await env.DB.prepare(`
    SELECT a.id, a.email
    FROM sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, now()).first();
  return row || null;
}

function requireMethod(request, method) {
  return request.method === method;
}

async function api(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "catalogue-api", time: now() });
  }

  if (path === "/api/catalogues" && request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM catalogue_images i WHERE i.catalogue_id = c.id) AS image_count
      FROM catalogues c
      WHERE c.active = 1
      ORDER BY c.display_order ASC, c.created_at ASC
    `).all();

    const result = rows.results.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      order: c.display_order,
      active: Boolean(c.active),
      colours: parseJSON(c.colours_json, []),
      sizes: parseJSON(c.sizes_json, []),
      imageCount: c.image_count
    }));

    return json(result, 200, {
      "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
    });
  }

  const publicCat = path.match(/^\/api\/catalogues\/([^/]+)$/);
  if (publicCat && request.method === "GET") {
    const cid = publicCat[1];
    const c = await env.DB.prepare(`
      SELECT * FROM catalogues WHERE id = ? AND active = 1
    `).bind(cid).first();
    if (!c) return json({ error: "Catalogue not found" }, 404);

    const imgs = await env.DB.prepare(`
      SELECT i.*, p.name AS product_name, p.image_url AS product_image
      FROM catalogue_images i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE i.catalogue_id = ?
      ORDER BY i.display_order ASC, i.created_at ASC
    `).bind(cid).all();

    return json({
      id: c.id,
      name: c.name,
      description: c.description,
      order: c.display_order,
      colours: parseJSON(c.colours_json, []),
      sizes: parseJSON(c.sizes_json, []),
      images: imgs.results.map(i => ({
        id: i.id,
        productId: i.product_id,
        imageUrl: `/media/${encodeURIComponent(i.object_key)}`,
        colour: i.colour || "",
        alt: i.alt || i.product_name || "",
        productName: i.product_name || "",
        productImage: i.product_image || ""
      }))
    }, 200, {
      "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
    });
  }

  if (path === "/api/products" && request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT * FROM products WHERE active = 1 ORDER BY name ASC
    `).all();
    return json(rows.results.map(cleanProduct), 200, {
      "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
    });
  }

  if (path === "/api/setup" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!env.SETUP_KEY || body.setupKey !== env.SETUP_KEY) {
      return json({ error: "Invalid setup key" }, 403);
    }

    const existing = await env.DB.prepare("SELECT id FROM admins LIMIT 1").first();
    if (existing) return json({ error: "Admin already exists. Setup is locked." }, 409);

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || password.length < 8) {
      return json({ error: "Email and password (8+ characters) are required." }, 400);
    }

    const hp = await hashPassword(password);
    const adminId = id();
    await env.DB.prepare(`
      INSERT INTO admins (id,email,password_hash,salt,created_at)
      VALUES (?,?,?,?,?)
    `).bind(adminId, email, hp.hash, hp.salt, now()).run();

    return json({ ok: true, message: "Admin created. Remove/change SETUP_KEY now." }, 201);
  }

  if (path === "/api/login" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const admin = await env.DB.prepare(`
      SELECT * FROM admins WHERE email = ?
    `).bind(email).first();

    if (!admin) return json({ error: "Invalid login" }, 401);

    const check = await derivePassword(password, admin.salt);
    if (check !== admin.password_hash) return json({ error: "Invalid login" }, 401);

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = b64(tokenBytes);
    const tokenHash = await sha256(token);
    const expires = now() + 7 * 24 * 60 * 60 * 1000;

    await env.DB.prepare(`
      INSERT INTO sessions (token_hash,admin_id,expires_at,created_at)
      VALUES (?,?,?,?)
    `).bind(tokenHash, admin.id, expires, now()).run();

    return json({ ok: true, email: admin.email }, 200, {
      "set-cookie": `cf_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
    });
  }

  if (path === "/api/logout" && request.method === "POST") {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(/(?:^|;\s*)cf_admin=([^;]+)/);
    if (match) {
      const tokenHash = await sha256(decodeURIComponent(match[1]));
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
    return json({ ok: true }, 200, {
      "set-cookie": "cf_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    });
  }

  if (path === "/api/me" && request.method === "GET") {
    const admin = await adminFromRequest(request, env);
    return admin ? json({ loggedIn: true, email: admin.email }) : json({ loggedIn: false }, 401);
  }

  const admin = await adminFromRequest(request, env);
  if (!admin) return json({ error: "Admin authentication required" }, 401);

  if (path === "/api/admin/products" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM products ORDER BY name ASC").all();
    return json(rows.results.map(cleanProduct));
  }

  if (path === "/api/admin/products" && request.method === "POST") {
    const body = await request.json();
    const pid = id();
    const t = now();
    await env.DB.prepare(`
      INSERT INTO products (id,name,slug,description,price,image_url,active,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(
      pid,
      String(body.name || "").trim(),
      String(body.slug || "").trim(),
      String(body.description || ""),
      Number(body.price || 0),
      String(body.imageUrl || ""),
      body.active === false ? 0 : 1,
      JSON.stringify(body.data || {}),
      t, t
    ).run();
    return json({ ok: true, id: pid }, 201);
  }

  const prod = path.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (prod && request.method === "PUT") {
    const body = await request.json();
    await env.DB.prepare(`
      UPDATE products SET name=?,slug=?,description=?,price=?,image_url=?,active=?,data_json=?,updated_at=?
      WHERE id=?
    `).bind(
      String(body.name || "").trim(),
      String(body.slug || "").trim(),
      String(body.description || ""),
      Number(body.price || 0),
      String(body.imageUrl || ""),
      body.active === false ? 0 : 1,
      JSON.stringify(body.data || {}),
      now(),
      prod[1]
    ).run();
    return json({ ok: true });
  }

  if (prod && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM products WHERE id=?").bind(prod[1]).run();
    return json({ ok: true });
  }

  if (path === "/api/admin/catalogues" && request.method === "GET") {
    const cats = await env.DB.prepare(`
      SELECT * FROM catalogues ORDER BY display_order ASC, created_at ASC
    `).all();
    const out = [];
    for (const c of cats.results) {
      const imgs = await env.DB.prepare(`
        SELECT i.*, p.name AS product_name
        FROM catalogue_images i
        LEFT JOIN products p ON p.id=i.product_id
        WHERE i.catalogue_id=?
        ORDER BY i.display_order ASC, i.created_at ASC
      `).bind(c.id).all();
      out.push({
        id:c.id, name:c.name, description:c.description,
        order:c.display_order, active:Boolean(c.active),
        colours:parseJSON(c.colours_json,[]),
        sizes:parseJSON(c.sizes_json,[]),
        images:imgs.results.map(i=>({
          id:i.id, productId:i.product_id, objectKey:i.object_key,
          imageUrl:`/media/${encodeURIComponent(i.object_key)}`,
          colour:i.colour||"", alt:i.alt||i.product_name||""
        }))
      });
    }
    return json(out);
  }

  if (path === "/api/admin/catalogues" && request.method === "POST") {
    const body = await request.json();
    const cid = id();
    const t = now();
    await env.DB.prepare(`
      INSERT INTO catalogues
      (id,name,description,display_order,active,colours_json,sizes_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).bind(
      cid,
      String(body.name || "").trim(),
      String(body.description || ""),
      Number(body.order || 0),
      body.active === false ? 0 : 1,
      JSON.stringify(body.colours || []),
      JSON.stringify(body.sizes || []),
      t,t
    ).run();
    return json({ok:true,id:cid},201);
  }

  const cat = path.match(/^\/api\/admin\/catalogues\/([^/]+)$/);
  if (cat && request.method === "PUT") {
    const body = await request.json();
    await env.DB.prepare(`
      UPDATE catalogues SET name=?,description=?,display_order=?,active=?,colours_json=?,sizes_json=?,updated_at=?
      WHERE id=?
    `).bind(
      String(body.name || "").trim(),
      String(body.description || ""),
      Number(body.order || 0),
      body.active === false ? 0 : 1,
      JSON.stringify(body.colours || []),
      JSON.stringify(body.sizes || []),
      now(),
      cat[1]
    ).run();
    return json({ok:true});
  }

  if (cat && request.method === "DELETE") {
    const images = await env.DB.prepare("SELECT object_key FROM catalogue_images WHERE catalogue_id=?").bind(cat[1]).all();
    for (const img of images.results) await env.MEDIA.delete(img.object_key);
    await env.DB.prepare("DELETE FROM catalogues WHERE id=?").bind(cat[1]).run();
    return json({ok:true});
  }

  if (path === "/api/admin/catalogue-images" && request.method === "POST") {
    const form = await request.formData();
    const catalogueId = String(form.get("catalogueId") || "");
    const productId = String(form.get("productId") || "") || null;
    const colour = String(form.get("colour") || "");
    const alt = String(form.get("alt") || "");
    const order = Number(form.get("order") || 0);
    const file = form.get("file");

    if (!(file instanceof File) || !catalogueId) {
      return json({error:"catalogueId and image file are required"},400);
    }

    const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g,"").toLowerCase() || "bin";
    const objectKey = `catalogues/${catalogueId}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream", cacheControl: "public, max-age=31536000, immutable" }
    });

    const imageId = id();
    await env.DB.prepare(`
      INSERT INTO catalogue_images
      (id,catalogue_id,product_id,object_key,colour,alt,display_order,created_at)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(imageId,catalogueId,productId,objectKey,colour,alt,order,now()).run();

    return json({
      ok:true,
      id:imageId,
      imageUrl:`/media/${encodeURIComponent(objectKey)}`
    },201);
  }

  const img = path.match(/^\/api\/admin\/catalogue-images\/([^/]+)$/);
  if (img && request.method === "DELETE") {
    const row = await env.DB.prepare("SELECT object_key FROM catalogue_images WHERE id=?").bind(img[1]).first();
    if (row) await env.MEDIA.delete(row.object_key);
    await env.DB.prepare("DELETE FROM catalogue_images WHERE id=?").bind(img[1]).run();
    return json({ok:true});
  }

  return json({error:"Not found"},404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try { return await api(request, env); }
      catch (e) {
        console.error(e);
        return json({ error: e?.message || "Server error" }, 500);
      }
    }

    if (url.pathname.startsWith("/media/")) {
      const key = decodeURIComponent(url.pathname.slice("/media/".length));
      const obj = await env.MEDIA.get(key);
      if (!obj) return text("Not found",404);
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(obj.body, {headers});
    }

    return env.ASSETS.fetch(request);
  }
};
