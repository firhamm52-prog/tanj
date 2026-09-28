PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, collectionId TEXT NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, colorName TEXT NOT NULL, color TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL CHECK(stock >= 0),
  status TEXT NOT NULL CHECK(status IN ('draft','published')),
  model TEXT NOT NULL, product TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS products_collection ON products(collectionId);
CREATE TABLE IF NOT EXISTS hijabs (
  id TEXT PRIMARY KEY, collection TEXT NOT NULL, color TEXT NOT NULL,
  name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0),
  stock INTEGER NOT NULL CHECK(stock >= 0), image TEXT NOT NULL
);
