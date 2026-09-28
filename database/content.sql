CREATE TABLE IF NOT EXISTS hero (id INTEGER PRIMARY KEY CHECK(id = 1), media TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS banner (
  id INTEGER PRIMARY KEY CHECK(id = 1), enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  title TEXT NOT NULL, subtitle TEXT NOT NULL, mediaType TEXT NOT NULL CHECK(mediaType IN ('image','video')), media TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY, caption TEXT NOT NULL,
  mediaType TEXT NOT NULL CHECK(mediaType IN ('image','video')), media TEXT NOT NULL
);
