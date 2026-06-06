import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'park-smart-secret-key';
const PORT = 3000;

// Database Setup
const db = new Database('parking.db');
db.pragma('foreign_keys = ON');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'owner'))
  );

  CREATE TABLE IF NOT EXISTS parking_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    price_per_hour REAL NOT NULL DEFAULT 50.0,
    cancellation_fee_percent INTEGER DEFAULT 30,
    pricing_type TEXT DEFAULT 'per_hour' CHECK (pricing_type IN ('per_hour', 'fixed')),
    fixed_price REAL DEFAULT 0,
    is_ev INTEGER DEFAULT 0,
    vehicle_type TEXT DEFAULT 'both' CHECK (vehicle_type IN ('car', 'bike', 'both')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS parking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    slot_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    UNIQUE(lot_id, slot_number),
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    duration_hours INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled', 'Completed')),
    is_hidden INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Success',
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
  );
`);

// Migration: Lowercase all existing emails to prevent case-sensitivity login issues
try {
  db.prepare('UPDATE users SET email = LOWER(TRIM(email))').run();
  console.log('Normalized existing user emails to lowercase');
} catch (e) {
  console.error('Failed to normalize emails:', e);
}

// Migration: Add phone column to users table if it doesn't exist
try {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasPhone = columns.some(col => col.name === 'phone');
  if (!hasPhone) {
    db.prepare('ALTER TABLE users ADD COLUMN phone TEXT').run();
    console.log('Added phone column to users table');
  }
} catch (e) {
  console.error('Failed to add phone column:', e);
}

// Migration: Add is_hidden column to bookings table if it doesn't exist
try {
  const columns = db.prepare("PRAGMA table_info(bookings)").all();
  const hasIsHidden = columns.some(col => col.name === 'is_hidden');
  if (!hasIsHidden) {
    db.prepare('ALTER TABLE bookings ADD COLUMN is_hidden INTEGER DEFAULT 0').run();
    console.log('Added is_hidden column to bookings table');
  }
} catch (e) {
  console.error('Failed to add is_hidden column:', e);
}

// Migration: Check if bookings table needs slot_id or CASCADE fix
try {
  const columns = db.prepare("PRAGMA table_info(bookings)").all();
  const hasSlotId = columns.some(col => col.name === 'slot_id');

  // Check for CASCADE rule on slot_id
  const fkList = db.prepare("PRAGMA foreign_key_list(bookings)").all();
  const slotIdFk = fkList.find(fk => fk.from === 'slot_id');
  const hasCascade = slotIdFk && slotIdFk.on_delete === 'CASCADE';

  if (!hasSlotId || !hasCascade) {
    console.log('Migrating bookings table to ensure CASCADE delete rules are active...');
    db.exec(`
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS bookings;
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL,
        booking_time TEXT NOT NULL,
        duration_hours INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled', 'Completed')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL UNIQUE,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        transaction_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Success',
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
    `);
  }
} catch (e) {
  console.error('Migration for refund columns failed', e);
}

// Migration: Add cancellation_fee_percent to parking_lots table
try {
  const lotColumns = db.prepare("PRAGMA table_info(parking_lots)").all();
  const hasCancelFee = lotColumns.some(col => col.name === 'cancellation_fee_percent');
  if (!hasCancelFee) {
    db.exec('ALTER TABLE parking_lots ADD COLUMN cancellation_fee_percent INTEGER DEFAULT 30');
    console.log('Added cancellation_fee_percent column to parking_lots table');
  }
} catch (e) {
  console.error('Migration for cancellation_fee_percent failed', e);
}

// Migration: Add pricing_type and fixed_price to parking_lots table
try {
  const lotCols2 = db.prepare("PRAGMA table_info(parking_lots)").all();
  if (!lotCols2.some(col => col.name === 'pricing_type')) {
    db.exec("ALTER TABLE parking_lots ADD COLUMN pricing_type TEXT DEFAULT 'per_hour'");
    console.log('Added pricing_type column to parking_lots table');
  }
  if (!lotCols2.some(col => col.name === 'fixed_price')) {
    db.exec('ALTER TABLE parking_lots ADD COLUMN fixed_price REAL DEFAULT 0');
    console.log('Added fixed_price column to parking_lots table');
  }
} catch (e) {
  console.error('Migration for pricing_type/fixed_price failed', e);
}

// Migration: Add refund_amount column to payments table
try {
  const payColumns = db.prepare("PRAGMA table_info(payments)").all();
  const hasRefundAmount = payColumns.some(col => col.name === 'refund_amount');
  if (!hasRefundAmount) {
    db.exec('ALTER TABLE payments ADD COLUMN refund_amount REAL DEFAULT 0');
    console.log('Added refund_amount column to payments table');
  }
  const hasRefundId = payColumns.some(col => col.name === 'refund_id');
  if (!hasRefundId) {
    db.exec('ALTER TABLE payments ADD COLUMN refund_id TEXT');
    console.log('Added refund_id column to payments table');
  }
  const hasRefundMethod = payColumns.some(col => col.name === 'refund_method');
  if (!hasRefundMethod) {
    db.exec('ALTER TABLE payments ADD COLUMN refund_method TEXT');
    console.log('Added refund_method column to payments table');
  }
  const hasPaymentRef = payColumns.some(col => col.name === 'payment_reference');
  if (!hasPaymentRef) {
    db.exec('ALTER TABLE payments ADD COLUMN payment_reference TEXT');
    console.log('Added payment_reference column to payments table');
  }
} catch (e) {
  console.error('Payments migration failed:', e);
}

// Migration: Add cancellation_reason to bookings
try {
  const bookColumns = db.prepare("PRAGMA table_info(bookings)").all();
  if (!bookColumns.some(col => col.name === 'cancellation_reason')) {
    db.exec('ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT');
    console.log('Added cancellation_reason column to bookings table');
  }
} catch (e) {
  console.error('Bookings migration failed:', e);
}

// Migration: Add is_ev and vehicle_type columns to parking_lots table if they don't exist
try {
  const lotCols3 = db.prepare("PRAGMA table_info(parking_lots)").all();
  if (!lotCols3.some(col => col.name === 'is_ev')) {
    db.exec('ALTER TABLE parking_lots ADD COLUMN is_ev INTEGER DEFAULT 0');
    console.log('Added is_ev column to parking_lots table');
  }
  if (!lotCols3.some(col => col.name === 'vehicle_type')) {
    db.exec("ALTER TABLE parking_lots ADD COLUMN vehicle_type TEXT DEFAULT 'both'");
    console.log('Added vehicle_type column to parking_lots table');
  }
} catch (e) {
  console.error('Migration for is_ev/vehicle_type failed', e);
}

// Migration and Seed Logic
const initialSpots = [
  // 1. Bangalore
  ['MG Road Parking', 12.9756, 77.6067, 'MG Road, Bangalore', 15, 60],
  ['Indiranagar Hub', 12.9719, 77.6412, 'Indiranagar, Bangalore', 25, 40],
  ['Koramangala Park', 12.9352, 77.6245, 'Koramangala, Bangalore', 10, 50],
  ['Whitefield Lot', 12.9698, 77.7499, 'Whitefield, Bangalore', 40, 30],
  ['Jayanagar Point', 12.9285, 77.5832, 'Jayanagar, Bangalore', 8, 45],
  ['HSR Layout Parking', 12.9121, 77.6446, 'HSR Layout, Bangalore', 12, 35],
  ['Electronic City', 12.8452, 77.6632, 'Electronic City, Bangalore', 50, 20],
  ['Malleshwaram Parking', 12.9984, 77.5719, 'Malleshwaram, Bangalore', 15, 30],
  ['Brigade Road Lot', 12.9711, 77.6074, 'Brigade Road, Bangalore', 10, 80],
  ['Hebbal Flyover Parking', 13.0354, 77.5921, 'Hebbal, Bangalore', 20, 25],
];

// Helper to seed data into the new structure
function seedDatabase() {
  console.log('Syncing parking data...');
  const insertLot = db.prepare('INSERT INTO parking_lots (name, latitude, longitude, address, price_per_hour, is_ev, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertSlot = db.prepare('INSERT INTO parking_slots (lot_id, slot_number) VALUES (?, ?)');
  const checkLot = db.prepare('SELECT id FROM parking_lots WHERE name = ? AND address = ?');
  const deleteLot = db.prepare('DELETE FROM parking_lots WHERE id = ?');
  const updateLotFeatures = db.prepare('UPDATE parking_lots SET is_ev = ?, vehicle_type = ? WHERE id = ?');

  // 1. Add new spots
  let index = 0;
  for (const spot of initialSpots) {
    const existing = checkLot.get(spot[0], spot[3]);
    const isEv = (index % 3 === 0) ? 1 : 0;
    let vType = 'both';
    if (index % 3 === 1) vType = 'car';
    if (index % 3 === 2) vType = 'bike';

    if (!existing) {
      const info = insertLot.run(spot[0], spot[1], spot[2], spot[3], spot[5], isEv, vType);
      const lotId = info.lastInsertRowid;
      const slotsToCreate = spot[4];

      for (let i = 1; i <= slotsToCreate; i++) {
        insertSlot.run(lotId, `SLOT-${i.toString().padStart(3, '0')}`);
      }
    } else {
      // If it exists, update it to have the features for demo purposes
      updateLotFeatures.run(isEv, vType, existing.id);
    }
    index++;
  }

  // 2. Remove spots that are no longer in the initialSpots list (only for seed data where owner_id is null)
  const currentSeedLots = db.prepare('SELECT id, name, address FROM parking_lots WHERE owner_id IS NULL').all();
  for (const lot of currentSeedLots) {
    const isInList = initialSpots.some(spot => spot[0] === lot.name && spot[3] === lot.address);
    if (!isInList) {
      console.log(`Removing retired seed spot: ${lot.name}`);
      deleteLot.run(lot.id);
    }
  }

  console.log('Parking data sync complete.');
}

seedDatabase();

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Auth Middleware
  const authenticateToken = (req, res, next) => {
    let token = req.cookies.token;

    // Fallback to Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      console.log('Auth failed: No token found in cookies or headers');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log('Auth failed: JWT verification error', err.message);
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Verify user still exists in DB
      const dbUser = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
      if (!dbUser) {
        console.log(`Auth failed: User ${user.id} not found in database`);
        res.clearCookie('token');
        return res.status(401).json({ error: 'User account no longer exists' });
      }

      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register
  app.post('/api/register', async (req, res) => {
    let { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (name.length < 3) return res.status(400).json({ error: 'Name must be at least 3 characters' });

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ error: 'Name should only contain alphabets and spaces' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({ error: 'Password must contain at least one number and one special character' });
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number is required' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const normalizedEmail = email.toLowerCase().trim();
      const result = db.prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)')
        .run(name, normalizedEmail, hashedPassword, phone, role || 'user');

      const userId = result.lastInsertRowid;
      const token = jwt.sign({ id: userId, email: normalizedEmail, name }, JWT_SECRET);

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ id: userId, name, email: normalizedEmail, token });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    email = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email, name: user.name }, JWT_SECRET);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ id: user.id, name: user.name, email, token });
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  // Get Me
  app.get('/api/me', (req, res) => {
    let token = req.cookies.token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return res.status(401).json({ error: 'Not logged in' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });

      // Verify user still exists in DB
      const dbUser = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
      if (!dbUser) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'User account no longer exists' });
      }

      res.json(user);
    });
  });

  // Haversine Formula
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  // Search Parking
  app.get('/api/search', (req, res) => {
    const { lat, lon, q } = req.query;

    // CASE 1: Coordinate-based search
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const textQuery = q ? q.toLowerCase().trim() : '';

      // Get all lots and their slot counts and ratings
      const lots = db.prepare(`
      SELECT 
        l.*, 
        (SELECT COUNT(*) FROM parking_slots s WHERE s.lot_id = l.id) as total_slots,
        (
          SELECT COUNT(*) FROM parking_slots s 
          WHERE s.lot_id = l.id 
          AND s.id NOT IN (
            SELECT b.slot_id FROM bookings b 
            WHERE b.status = 'Confirmed' 
            AND datetime(b.booking_date || ' ' || b.booking_time) <= datetime('now', 'localtime')
            AND datetime(b.booking_date || ' ' || b.booking_time, '+' || b.duration_hours || ' hours') > datetime('now', 'localtime')
          )
        ) as availability,
        (SELECT AVG(rating) FROM reviews r WHERE r.lot_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.lot_id = l.id) as review_count
      FROM parking_lots l
    `).all();

      let results = lots.map(lot => {
        return {
          ...lot,
          distance: getDistance(userLat, userLon, lot.latitude, lot.longitude)
        };
      });

      // Logic: If user searched for a specific address/name, try to filter for it first
      if (textQuery) {
        results = results.filter(lot =>
          lot.name.toLowerCase().includes(textQuery) ||
          lot.address.toLowerCase().includes(textQuery)
        );
      } else {
        // If no text search query, only show results within 50km
        results = results.filter(lot => lot.distance <= 50);
      }

      return res.json(results.sort((a, b) => a.distance - b.distance).slice(0, 50));
    }

    if (q) {
      const query = `%${q}%`;
      const rows = db.prepare(`
        SELECT l.*, 
        (
          SELECT COUNT(*) FROM parking_slots s 
          WHERE s.lot_id = l.id 
          AND s.id NOT IN (
            SELECT b.slot_id FROM bookings b 
            WHERE b.status = 'Confirmed' 
            AND datetime(b.booking_date || ' ' || b.booking_time) <= datetime('now', 'localtime')
            AND datetime(b.booking_date || ' ' || b.booking_time, '+' || b.duration_hours || ' hours') > datetime('now', 'localtime')
          )
        ) as availability,
        (SELECT COUNT(*) FROM parking_slots s WHERE s.lot_id = l.id) as total_slots,
        (SELECT AVG(rating) FROM reviews r WHERE r.lot_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.lot_id = l.id) as review_count
        FROM parking_lots l
        WHERE l.name LIKE ? OR l.address LIKE ?
      `).all(query, query);

      return res.json(rows);
    }

    return res.status(400).json({ error: 'Search query or location required' });
  });

  // Get Single Parking
  app.get('/api/parking/:id', (req, res) => {
    const lot = db.prepare(`
      SELECT 
        l.*, 
        l.owner_id,
        (SELECT COUNT(*) FROM parking_slots s WHERE s.lot_id = l.id) as total_slots,
        (
          SELECT COUNT(*) FROM parking_slots s 
          WHERE s.lot_id = l.id 
          AND s.id NOT IN (
            SELECT b.slot_id FROM bookings b 
            WHERE b.status = 'Confirmed' 
            AND datetime(b.booking_date || ' ' || b.booking_time) <= datetime('now', 'localtime')
            AND datetime(b.booking_date || ' ' || b.booking_time, '+' || b.duration_hours || ' hours') > datetime('now', 'localtime')
          )
        ) as availability,
        (SELECT AVG(rating) FROM reviews r WHERE r.lot_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.lot_id = l.id) as review_count
      FROM parking_lots l 
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lot) return res.status(404).json({ error: 'Parking lot not found' });

    const slots = db.prepare('SELECT * FROM parking_slots WHERE lot_id = ?').all(req.params.id);
    res.json({ ...lot, slots });
  });

  // List a Parking Spot (Owner)
  app.post('/api/parking', authenticateToken, (req, res) => {
    const { name, address, latitude, longitude, price_per_hour, total_slots, cancellation_fee_percent, pricing_type, fixed_price, is_ev, vehicle_type } = req.body;
    const owner_id = req.user.id;

    if (!name || !address || latitude === undefined || longitude === undefined || !total_slots) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const pType = pricing_type || 'per_hour';
    if (pType === 'per_hour' && !price_per_hour) {
      return res.status(400).json({ error: 'Price per hour is required for hourly pricing' });
    }
    if (pType === 'fixed' && (!fixed_price || parseFloat(fixed_price) <= 0)) {
      return res.status(400).json({ error: 'Fixed price is required and must be greater than 0' });
    }

    if (cancellation_fee_percent && (parseInt(cancellation_fee_percent) < 0 || parseInt(cancellation_fee_percent) > 50)) {
      return res.status(400).json({ error: 'Cancellation fee must be between 0% and 50%' });
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    try {
      const transaction = db.transaction(() => {
        const insertLot = db.prepare('INSERT INTO parking_lots (name, address, latitude, longitude, price_per_hour, cancellation_fee_percent, pricing_type, fixed_price, owner_id, is_ev, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const lotResult = insertLot.run(
          name,
          address,
          latitude,
          longitude,
          price_per_hour || 0,
          cancellation_fee_percent || 30,
          pType,
          pType === 'fixed' ? parseFloat(fixed_price) : 0,
          owner_id,
          is_ev ? 1 : 0,
          vehicle_type || 'both'
        );
        const lotId = lotResult.lastInsertRowid;

        // Convert user to owner automatically
        db.prepare(`
        UPDATE users
        SET role = 'owner'
        WHERE id = ? AND role = 'user'
        `).run(owner_id);

        const insertSlot = db.prepare('INSERT INTO parking_slots (lot_id, slot_number) VALUES (?, ?)');
        for (let i = 1; i <= total_slots; i++) {
          insertSlot.run(lotId, `SLOT-${i.toString().padStart(3, '0')}`);
        }
        return lotId;
      });

      const lotId = transaction();
      res.json({ id: lotId, message: 'Parking lot and slots created successfully' });
    } catch (error) {
      console.error('Error listing parking lot:', error);
      res.status(500).json({ error: `Failed to list: ${error.message}` });
    }
  });

  // Get My Listed Spots
  app.get('/api/my-spots', authenticateToken, (req, res) => {
    const owner_id = req.user.id;
    const lots = db.prepare(`
      SELECT 
        l.*, 
        (SELECT COUNT(*) FROM parking_slots s WHERE s.lot_id = l.id) as total_slots,
        (
          SELECT COUNT(*) FROM parking_slots s 
          WHERE s.lot_id = l.id 
          AND s.id NOT IN (
            SELECT b.slot_id FROM bookings b 
            WHERE b.status = 'Confirmed' 
            AND datetime(b.booking_date || ' ' || b.booking_time) <= datetime('now', 'localtime')
            AND datetime(b.booking_date || ' ' || b.booking_time, '+' || b.duration_hours || ' hours') > datetime('now', 'localtime')
          )
        ) as availability
      FROM parking_lots l 
      WHERE l.owner_id = ?
    `).all(owner_id);

    res.json(lots);
  });

  // Update Parking Spot (Owner)
  app.put('/api/parking/:id', authenticateToken, (req, res) => {
    const { name, address, latitude, longitude, price_per_hour, total_slots, cancellation_fee_percent, pricing_type, fixed_price, is_ev, vehicle_type } = req.body;
    const lot_id = req.params.id;
    const owner_id = req.user.id;

    try {
      const lot = db.prepare('SELECT id FROM parking_lots WHERE id = ? AND owner_id = ?').get(lot_id, owner_id);
      if (!lot) return res.status(404).json({ error: 'Not found or unauthorized' });

      if (cancellation_fee_percent && (parseInt(cancellation_fee_percent) < 0 || parseInt(cancellation_fee_percent) > 50)) {
        return res.status(400).json({ error: 'Cancellation fee must be between 0% and 50%' });
      }

      const pType = pricing_type || 'per_hour';

      const transaction = db.transaction(() => {
        // Update lot info
        db.prepare(`
          UPDATE parking_lots 
          SET name = ?, address = ?, latitude = ?, longitude = ?, price_per_hour = ?, cancellation_fee_percent = ?, pricing_type = ?, fixed_price = ?, is_ev = ?, vehicle_type = ?
          WHERE id = ?
        `).run(
          name,
          address,
          latitude,
          longitude,
          price_per_hour || 0,
          cancellation_fee_percent || 30,
          pType,
          pType === 'fixed' ? parseFloat(fixed_price || 0) : 0,
          is_ev ? 1 : 0,
          vehicle_type || 'both',
          lot_id
        );

        if (total_slots !== undefined) {
          const currentSlotsCount = db.prepare('SELECT COUNT(*) as count FROM parking_slots WHERE lot_id = ?').get(lot_id);
          const currentCount = currentSlotsCount.count;
          const newCount = parseInt(total_slots);

          if (newCount > currentCount) {
            // Add more slots
            const insertSlot = db.prepare('INSERT INTO parking_slots (lot_id, slot_number) VALUES (?, ?)');
            for (let i = currentCount + 1; i <= newCount; i++) {
              insertSlot.run(lot_id, `SLOT-${i.toString().padStart(3, '0')}`);
            }
          } else if (newCount < currentCount) {
            // Remove extra slots
            const slots = db.prepare('SELECT id, slot_number FROM parking_slots WHERE lot_id = ? ORDER BY slot_number DESC').all(lot_id);
            const toRemove = currentCount - newCount;

            for (let i = 0; i < toRemove; i++) {
              const slotId = slots[i].id;
              // Check if slot has bookings
              const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE slot_id = ?').get(slotId);
              if (bookingCount.count > 0) {
                throw new Error(`Cannot reduce slots below ${currentCount - i} because SLOT-${slots[i].slot_number} has bookings.`);
              }
              db.prepare('DELETE FROM parking_slots WHERE id = ?').run(slotId);
            }
          }
        }
      });

      transaction();
      res.json({ message: 'Parking spot updated successfully' });
    } catch (error) {
      console.error('Update error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete My Listed Lot
  app.delete('/api/parking/:id', authenticateToken, (req, res) => {
    const lot_id = req.params.id;
    const owner_id = req.user.id;
    const confirmRefund = req.query.confirmRefund === 'true';

    try {
      const lot = db.prepare('SELECT id FROM parking_lots WHERE id = ? AND owner_id = ?').get(lot_id, owner_id);
      if (!lot) return res.status(404).json({ error: 'Not found or unauthorized' });

      // Find active bookings
      const activeBookings = db.prepare(`
        SELECT b.id, p.amount, p.id as payment_id
        FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE s.lot_id = ? AND b.status = 'Confirmed'
        AND datetime(b.booking_date || ' ' || b.booking_time, '+' || b.duration_hours || ' hours') > datetime('now', 'localtime')
      `).all(lot_id);

      if (activeBookings.length > 0 && !confirmRefund) {
        const totalRefund = activeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        return res.status(400).json({ 
          requireRefund: true, 
          totalRefund, 
          activeBookingsCount: activeBookings.length,
          error: `Cannot delete lot. You must refund ₹${totalRefund} to ${activeBookings.length} active user(s).`
        });
      }

      const transaction = db.transaction(() => {
        if (activeBookings.length > 0 && confirmRefund) {
          for (const b of activeBookings) {
            const refundId = 'REF-OWNER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            db.prepare("UPDATE bookings SET status = 'Cancelled', cancellation_reason = 'Parking lot deleted by owner' WHERE id = ?").run(b.id);
            if (b.payment_id) {
              db.prepare("UPDATE payments SET status = 'Refunded', refund_amount = ?, refund_id = ? WHERE id = ?").run(b.amount, refundId, b.payment_id);
            }
          }
        }

        db.prepare('DELETE FROM parking_lots WHERE id = ?').run(lot_id);

        // Check remaining parking spots
        const remainingSpots = db.prepare(`
        SELECT COUNT(*) as count
        FROM parking_lots
        WHERE owner_id = ?
        `).get(owner_id);

        // If no spots left, convert owner back to user
        if (remainingSpots.count === 0) {
          db.prepare(`
         UPDATE users
         SET role = 'user'
          WHERE id = ?
         `).run(owner_id);
        }
      })
      transaction();

      res.json({ message: 'Parking lot and associated data deleted' });
    } catch (error) {
      res.status(500).json({ error: `Failed: ${error.message}` });
    }
  });

  // Book Parking
  app.post('/api/book', authenticateToken, (req, res) => {
    const { parking_id, date, time, duration_hours, payment_method, amount, payment_reference } = req.body;
    const user_id = req.user.id;

    try {
      // 0. Check if user is the owner of this lot
      const lot = db.prepare('SELECT owner_id FROM parking_lots WHERE id = ?').get(parking_id);
      if (lot && lot.owner_id === user_id) {
        return res.status(403).json({ error: 'You cannot book your own parking lot.' });
      }

      // 1. Transaction to handle booking atomically
      const transaction = db.transaction(() => {
        // 2. Find an available slot in this lot for the specific date and time
        const requestedDatetime = `${date} ${time}:00`;
        const requestedDuration = duration_hours || 1;

        const slot = db.prepare(`
          SELECT id FROM parking_slots 
          WHERE lot_id = ? 
          AND id NOT IN (
            SELECT slot_id FROM bookings 
            WHERE status = 'Confirmed'
            AND datetime(booking_date || ' ' || booking_time) < datetime(?, '+' || ? || ' hours')
            AND datetime(booking_date || ' ' || booking_time, '+' || duration_hours || ' hours') > datetime(?)
          ) 
          LIMIT 1
        `).get(parking_id, requestedDatetime, requestedDuration, requestedDatetime);

        if (!slot) {
          throw new Error('No available slots in this parking lot for the selected time');
        }

        // 3. Create booking
        const insertBooking = db.prepare('INSERT INTO bookings (user_id, slot_id, booking_date, booking_time, duration_hours) VALUES (?, ?, ?, ?, ?)');
        const bookingResult = insertBooking.run(user_id, slot.id, date, time, requestedDuration);
        const bookingId = bookingResult.lastInsertRowid;

        // 4. Create payment record
        const insertPayment = db.prepare('INSERT INTO payments (booking_id, amount, payment_method, transaction_id, payment_reference) VALUES (?, ?, ?, ?, ?)');
        const tid = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        insertPayment.run(bookingId, amount, payment_method || 'Simulated', tid, payment_reference || null);

        return bookingId;
      });

      const bookingId = transaction();
      res.json({ id: bookingId, message: 'Booking and payment successful' });
    } catch (error) {
      console.error('Booking error:', error);
      if (error.message.includes('No available slots')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: `Booking failed: ${error.message}` });
    }
  });

  // My Bookings
  app.get('/api/my-bookings', authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const bookings = db.prepare(`
      SELECT 
        b.*, 
        s.slot_number,
        l.name as parking_name, 
        l.address as parking_address, 
        l.price_per_hour, 
        l.latitude, 
        l.longitude,
        pay.amount as amount_paid,
        pay.payment_method,
        pay.status as payment_status,
        pay.refund_amount,
        pay.refund_id,
        (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) as is_reviewed
      FROM bookings b 
      JOIN parking_slots s ON b.slot_id = s.id
      JOIN parking_lots l ON s.lot_id = l.id
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE b.user_id = ? AND (b.is_hidden = 0 OR b.is_hidden IS NULL)
      ORDER BY b.id DESC
    `).all(user_id);
    res.json(bookings);
  });

  // Cancel Booking (with 30% deduction cashback)
  app.post('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    const { reason } = req.body;

    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(booking_id, user_id);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.status === 'Cancelled') {
        return res.status(400).json({ error: 'Booking is already cancelled' });
      }

      // Get the payment record to calculate refund
      const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(booking_id);
      const amountPaid = payment ? payment.amount : 0;

      // Get the cancellation fee from the parking lot
      const lot = db.prepare(`
        SELECT l.cancellation_fee_percent 
        FROM parking_lots l
        JOIN parking_slots s ON s.lot_id = l.id
        WHERE s.id = ?
      `).get(booking.slot_id);

      const deductionPercent = lot ? lot.cancellation_fee_percent : 30;
      const deductionAmount = parseFloat((amountPaid * deductionPercent / 100).toFixed(2));
      const refundAmount = parseFloat((amountPaid - deductionAmount).toFixed(2));
      const refundId = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const cancelTransaction = db.transaction(() => {
        db.prepare("UPDATE bookings SET status = 'Cancelled', cancellation_reason = ? WHERE id = ?").run(reason || 'No reason provided', booking_id);

        // Update payment status to Refunded and store refund amount
        if (payment) {
          db.prepare("UPDATE payments SET status = 'Refunded', refund_amount = ?, refund_id = ? WHERE id = ?").run(refundAmount, refundId, payment.id);
        }
      });

      cancelTransaction();
      res.json({
        message: 'Booking cancelled successfully',
        cashback: {
          original_amount: amountPaid,
          deduction_percent: deductionPercent,
          deduction_amount: deductionAmount,
          refund_amount: refundAmount,
          refund_id: refundId
        }
      });
    } catch (error) {
      console.error('Cancel error:', error);
      res.status(500).json({ error: 'Cancellation failed' });
    }
  });

  // Reschedule Booking
  app.post('/api/bookings/:id/reschedule', authenticateToken, (req, res) => {
    const booking_id = Number(req.params.id);
    const { booking_date, booking_time, duration_hours, additional_amount } = req.body;
    const user_id = req.user.id;

    console.log('[Reschedule] Request:', { booking_id, booking_date, booking_time, duration_hours, additional_amount });

    try {
      if (isNaN(booking_id)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      if (!booking_date || !booking_time || !duration_hours) {
        console.error('[Reschedule] Error: Missing required fields');
        return res.status(400).json({ error: 'Missing required rescheduling data' });
      }

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(booking_id, user_id);

      if (!booking) {
        console.error('[Reschedule] Error: Booking not found', { booking_id, user_id });
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.status !== 'Confirmed') {
        console.error('[Reschedule] Error: Booking not confirmed', { status: booking.status });
        return res.status(400).json({ error: 'Only confirmed bookings can be rescheduled' });
      }

      // Ensure additional_amount is a valid number
      const extraPay = parseFloat(additional_amount);
      if (isNaN(extraPay)) {
        console.error('[Reschedule] Error: Invalid additional_amount', { additional_amount });
        return res.status(400).json({ error: 'Invalid price adjustment amount' });
      }

      console.log('[Reschedule] Validated data. Executing transaction...', { extraPay });

      const rescheduleTransaction = db.transaction(() => {
        // Update booking details
        const bUpdate = db.prepare(`
          UPDATE bookings 
          SET booking_date = ?, booking_time = ?, duration_hours = ? 
          WHERE id = ?
        `).run(booking_date, booking_time, duration_hours, booking_id);

        console.log('[Reschedule] Booking update result:', bUpdate);

        // Update payment amount if it changed
        if (extraPay !== 0) {
          const payment = db.prepare('SELECT id FROM payments WHERE booking_id = ?').get(booking_id);
          if (payment) {
            const pUpdate = db.prepare(`
              UPDATE payments 
              SET amount = amount + ? 
              WHERE booking_id = ?
            `).run(extraPay, booking_id);
            console.log('[Reschedule] Payment update result:', pUpdate);
          } else {
            console.warn('[Reschedule] Warning: No payment record found to update');
          }
        }
      });

      rescheduleTransaction();
      console.log('[Reschedule] Success');
      res.json({ message: 'Booking rescheduled successfully' });
    } catch (error) {
      console.error('[Reschedule] Fatal error:', error);
      res.status(500).json({ error: `Rescheduling failed: ${error.message}` });
    }
  });

  // Delete/Clear Booking
  app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
    const booking_id = req.params.id;
    const user_id = req.user.id;

    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(booking_id, user_id);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Only allow clearing cancelled or completed bookings
      if (booking.status !== 'Cancelled' && booking.status !== 'Completed') {
        return res.status(400).json({ error: 'Only cancelled or completed bookings can be cleared' });
      }

      db.prepare('UPDATE bookings SET is_hidden = 1 WHERE id = ?').run(booking_id);
      res.json({ message: 'Booking cleared successfully' });
    } catch (error) {
      console.error('Error clearing booking:', error);
      res.status(500).json({ error: 'Failed to clear booking' });
    }
  });

  // Change Password
  app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user_id = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);

      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, user_id);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // --- Owner Dashboard Endpoints ---

  // Get Owner Stats
  app.get('/api/owner/stats', authenticateToken, (req, res) => {
    const owner_id = req.user.id;
    try {
      const lotIds = db.prepare('SELECT id FROM parking_lots WHERE owner_id = ?').all(owner_id).map(l => l.id);
      if (lotIds.length === 0) {
        return res.json({ totalSpots: 0, totalBookings: 0, totalRevenue: 0, averageDuration: 0, cancellationRate: 0, revenueHistory: [] });
      }

      const placeholders = lotIds.map(() => '?').join(',');
      const confirmedBookings = db.prepare(`
        SELECT b.*, pay.amount
        FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        LEFT JOIN payments pay ON pay.booking_id = b.id
        WHERE s.lot_id IN (${placeholders}) AND b.status = 'Confirmed'
      `).all(...lotIds);

      const totalBookings = db.prepare(`
        SELECT COUNT(*) as count FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        WHERE s.lot_id IN (${placeholders})
      `).get(...lotIds);

      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

      // Calculate real cancellation rate
      const cancelledCount = db.prepare(`
        SELECT COUNT(*) as count FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        WHERE s.lot_id IN (${placeholders}) AND b.status = 'Cancelled'
      `).get(...lotIds);
      const cancellationRate = totalBookings.count > 0 ? (cancelledCount.count / totalBookings.count) * 100 : 0;

      // Generate revenue history for last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const historyMap = {};

      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        historyMap[dateStr] = {
          name: days[d.getDay()],
          date: dateStr,
          value: 0
        };
      }

      confirmedBookings.forEach(b => {
        if (historyMap[b.booking_date]) {
          historyMap[b.booking_date].value += (b.amount || 0);
        }
      });

      const revenueHistory = Object.values(historyMap).sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        totalSpots: lotIds.length,
        totalBookings: totalBookings.count,
        totalRevenue,
        averageDuration: confirmedBookings.length ? confirmedBookings.reduce((sum, b) => sum + b.duration_hours, 0) / confirmedBookings.length : 0,
        cancellationRate,
        revenueHistory
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Owner Bookings
  app.get('/api/owner/bookings', authenticateToken, (req, res) => {
    const owner_id = req.user.id;
    try {
      const bookings = db.prepare(`
        SELECT 
          b.*, 
          l.name as parking_name, 
          u.name as user_name, u.email as user_email, u.phone as user_phone,
          s.slot_number,
          p.amount,
          p.refund_amount,
          p.refund_id,
          p.status as payment_status,
          p.transaction_id,
          p.payment_reference
        FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        JOIN parking_lots l ON s.lot_id = l.id
        JOIN users u ON b.user_id = u.id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE l.owner_id = ?
        ORDER BY b.id DESC
      `).all(owner_id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Owner Confirm Refund
  app.post('/api/owner/confirm-refund/:id', authenticateToken, (req, res) => {
    const booking_id = req.params.id;
    const owner_id = req.user.id;
    const { amount, transaction_ref, method } = req.body;

    try {
      const booking = db.prepare(`
        SELECT b.id FROM bookings b
        JOIN parking_slots s ON b.slot_id = s.id
        JOIN parking_lots l ON s.lot_id = l.id
        WHERE b.id = ? AND l.owner_id = ?
      `).get(booking_id, owner_id);

      if (!booking) {
        return res.status(404).json({ error: 'Refund request not found' });
      }

      db.prepare(`
        UPDATE payments 
        SET status = 'Settled', 
            refund_amount = ?, 
            refund_id = ?,
            refund_method = ?
        WHERE booking_id = ?
      `).run(amount, transaction_ref || 'TRF-' + Math.random().toString(36).substr(2, 9).toUpperCase(), method || 'Bank Transfer', booking_id);

      res.json({ message: 'Refund processed and settled successfully' });
    } catch (error) {
      console.error('Confirm refund error:', error);
      res.status(500).json({ error: 'Failed to process refund' });
    }
  });


  // --- Feedback / Reviews API ---

  // Submit a Review
  app.post('/api/reviews', authenticateToken, (req, res) => {
    const { booking_id, rating, comment } = req.body;
    const user_id = req.user.id;

    if (!booking_id || !rating) {
      return res.status(400).json({ error: 'Booking ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
      // Check if booking exists and belongs to user
      const booking = db.prepare(`
        SELECT b.id, s.lot_id 
        FROM bookings b 
        JOIN parking_slots s ON b.slot_id = s.id
        WHERE b.id = ? AND b.user_id = ?
      `).get(booking_id, user_id);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found or unauthorized' });
      }

      // Check if already reviewed
      const existingReview = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this booking' });
      }

      const result = db.prepare('INSERT INTO reviews (booking_id, user_id, lot_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
        .run(booking_id, user_id, booking.lot_id, rating, comment || null);

      res.json({ id: result.lastInsertRowid, message: 'Review submitted successfully' });
    } catch (error) {
      console.error('Review submission error:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });

  // Get Reviews for a Parking Lot
  app.get('/api/parking/:id/reviews', (req, res) => {
    const lot_id = req.params.id;
    try {
      const reviews = db.prepare(`
        SELECT r.*, u.name as user_name 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.lot_id = ? 
        ORDER BY r.created_at DESC
      `).all(lot_id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  // Reset Password
  app.post('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, user.id);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // --- Vite / Static Files ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
