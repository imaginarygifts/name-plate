PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT DEFAULT '',
  price REAL DEFAULT 0,
  image_url TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  colours_json TEXT NOT NULL DEFAULT '[]',
  sizes_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogue_images (
  id TEXT PRIMARY KEY,
  catalogue_id TEXT NOT NULL,
  product_id TEXT,
  object_key TEXT NOT NULL,
  colour TEXT DEFAULT '',
  alt TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (catalogue_id) REFERENCES catalogues(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalogues_active_order
  ON catalogues(active, display_order);

CREATE INDEX IF NOT EXISTS idx_catalogue_images_catalogue_order
  ON catalogue_images(catalogue_id, display_order);

CREATE INDEX IF NOT EXISTS idx_products_active
  ON products(active);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry
  ON sessions(expires_at);
