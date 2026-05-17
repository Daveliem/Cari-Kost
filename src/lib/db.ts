import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'kost.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'landlord' -- landlord or user
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    room_type TEXT, -- single, shared, etc.
    amenities TEXT, -- comma separated
    images TEXT, -- JSON array of image URLs
    contact TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    listing_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    UNIQUE(user_id, listing_id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id INTEGER,
    user_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;

// Ensure reviews table has reviewer fields for existing databases
try {
  const info = db.prepare("PRAGMA table_info(reviews)").all();
  const cols = info.map((c: any) => c.name);
  if (!cols.includes('reviewer_name')) {
    db.prepare('ALTER TABLE reviews ADD COLUMN reviewer_name TEXT').run();
  }
  if (!cols.includes('reviewer_email')) {
    db.prepare('ALTER TABLE reviews ADD COLUMN reviewer_email TEXT').run();
  }
  if (!cols.includes('user_id')) {
    // some older schemas may not have user_id on reviews
    db.prepare('ALTER TABLE reviews ADD COLUMN user_id INTEGER').run();
  }
  try {
    const listingInfo = db.prepare("PRAGMA table_info(listings)").all();
    const listingCols = listingInfo.map((c: any) => c.name);
    if (!listingCols.includes('images')) {
      db.prepare('ALTER TABLE listings ADD COLUMN images TEXT').run();
    }
  } catch (e) {
    console.error('DB migration check failed', e);
  }
} catch (e) {
  // ignore migration errors
  console.error('DB migration check failed', e);
}