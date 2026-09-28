-- One atomic storefront snapshot prevents partially published catalog/content.
CREATE TABLE IF NOT EXISTS site_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, document TEXT NOT NULL CHECK(json_valid(document)),
  published_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
