const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { sendOTP, generateOTP } = require('../utils/mailer');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────

/** Police badge must be: POL-XXXX (e.g., POL-1234) */
const BADGE_REGEX = /^POL-\d{4}$/;

/** Driver license: DL followed by 10-14 alphanumeric chars (e.g., DL1234567890) */
const LICENSE_REGEX = /^[A-Z]{2}\d{2}\s?\d{4}\d{7}$|^[A-Z]{2}-\d{13}$|^[A-Za-z0-9]{8,16}$/;

/** Vehicle plate (Indian format e.g., KA-01-AB-1234) */
const PLATE_REGEX = /^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/;

function generateOTPExpiry() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10); // 10-minute expiry
  return d;
}

// ─────────────────────────────────────────────
// POST /api/auth/register/police
// ─────────────────────────────────────────────
router.post('/register/police', async (req, res) => {
  try {
    const { name, email, password, badge_number, zone, phone } = req.body;

    // 1. Required fields check
    if (!name || !email || !password || !badge_number) {
      return res.status(400).json({ error: 'Name, email, password, and badge number are required.' });
    }

    // 2. Badge format validation – FIRST security layer
    if (!BADGE_REGEX.test(badge_number)) {
      return res.status(400).json({
        error: 'Invalid Police Badge format. Badge must follow pattern: POL-XXXX (e.g., POL-1234).',
        field: 'badge_number',
      });
    }

    // 3. Check if email or badge already exists
    const existing = await db.query(
      'SELECT id FROM police_officers WHERE email = $1 OR badge_number = $2',
      [email, badge_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email or badge number already exists.' });
    }

    // 4. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 5. Generate OTP
    const otp = generateOTP();
    const otp_expires = generateOTPExpiry();

    // 6. Save officer (unverified)
    const result = await db.query(
      `INSERT INTO police_officers (name, email, badge_number, zone, password_hash, is_verified, otp, otp_expires, status)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, 'on_duty') RETURNING id, name, email, badge_number, zone`,
      [name, email, badge_number, zone || null, password_hash, otp, otp_expires]
    );

    // 7. Send OTP email
    await sendOTP(email, otp, 'police');

    res.status(201).json({
      message: 'Registration successful! A 6-digit OTP has been sent to your email. Please verify to activate your account.',
      userId: result.rows[0].id,
      role: 'police',
    });
  } catch (err) {
    console.error('[auth/register/police]', err.message);
    res.status(500).json({ error: 'Registration failed. ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register/driver
// ─────────────────────────────────────────────
router.post('/register/driver', async (req, res) => {
  try {
    const { name, email, password, license_number, vehicle_plate, phone } = req.body;

    // 1. Required fields check
    if (!name || !email || !password || !license_number || !vehicle_plate) {
      return res.status(400).json({
        error: 'Name, email, password, license number, and vehicle plate are required.',
      });
    }

    // 2. License format validation – FIRST security layer
    if (!LICENSE_REGEX.test(license_number)) {
      return res.status(400).json({
        error: 'Invalid License Number format. Must be 8-16 alphanumeric characters (e.g., DL1234567890).',
        field: 'license_number',
      });
    }

    // 3. Vehicle plate format validation
    if (!PLATE_REGEX.test(vehicle_plate)) {
      return res.status(400).json({
        error: 'Invalid Vehicle Plate format. Use format: KA-01-AB-1234.',
        field: 'vehicle_plate',
      });
    }

    // 4. Check if email already exists
    const existing = await db.query('SELECT id FROM drivers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 5. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 6. Generate OTP
    const otp = generateOTP();
    const otp_expires = generateOTPExpiry();

    // 7. Save driver (unverified)
    const result = await db.query(
      `INSERT INTO drivers (name, email, phone, license_number, vehicle_plate, password_hash, is_verified, otp, otp_expires, status)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, 'IDLE') RETURNING id, name, email`,
      [name, email, phone || null, license_number, vehicle_plate, password_hash, otp, otp_expires]
    );

    // 8. Send OTP email
    await sendOTP(email, otp, 'driver');

    res.status(201).json({
      message: 'Registration successful! A 6-digit OTP has been sent to your email. Please verify to activate your account.',
      userId: result.rows[0].id,
      role: 'driver',
    });
  } catch (err) {
    console.error('[auth/register/driver]', err.message);
    res.status(500).json({ error: 'Registration failed. ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { userId, role ('driver'|'police'), otp }
// ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, role, otp } = req.body;

    if (!userId || !role || !otp) {
      return res.status(400).json({ error: 'userId, role, and otp are required.' });
    }

    const table = role === 'police' ? 'police_officers' : 'drivers';

    // Fetch user
    const result = await db.query(
      `SELECT id, name, email, otp, otp_expires, is_verified FROM ${table} WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified. Please login.' });
    }

    // Check OTP expiry
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: 'OTP has expired. Please register again or request a new OTP.' });
    }

    // Check OTP match
    if (user.otp !== otp.toString()) {
      return res.status(400).json({ error: 'Incorrect OTP. Please check your email and try again.' });
    }

    // Mark verified and clear OTP
    await db.query(
      `UPDATE ${table} SET is_verified = true, otp = NULL, otp_expires = NULL WHERE id = $1`,
      [userId]
    );

    // Issue JWT
    const token = signToken({ id: user.id, email: user.email, role });

    res.json({
      message: 'Email verified successfully! Welcome to SmartAmbulance.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  } catch (err) {
    console.error('[auth/verify-otp]', err.message);
    res.status(500).json({ error: 'OTP verification failed. ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password, role }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }

    if (!['driver', 'police'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "driver" or "police".' });
    }

    const table = role === 'police' ? 'police_officers' : 'drivers';
    const result = await db.query(
      `SELECT id, name, email, password_hash, is_verified, status FROM ${table} WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Account not verified. Please complete OTP verification first.',
        needsVerification: true,
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT
    const token = signToken({ id: user.id, email: user.email, role });

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: { id: user.id, name: user.name, email: user.email, role, status: user.status },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Login failed. ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/resend-otp
// Body: { userId, role }
// ─────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId, role } = req.body;
    const table = role === 'police' ? 'police_officers' : 'drivers';

    const result = await db.query(`SELECT id, email, is_verified FROM ${table} WHERE id = $1`, [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = result.rows[0];
    if (user.is_verified) return res.status(400).json({ error: 'Account is already verified.' });

    const otp = generateOTP();
    const otp_expires = generateOTPExpiry();

    await db.query(`UPDATE ${table} SET otp = $1, otp_expires = $2 WHERE id = $3`, [otp, otp_expires, userId]);
    await sendOTP(user.email, otp, role);

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (err) {
    console.error('[auth/resend-otp]', err.message);
    res.status(500).json({ error: 'Failed to resend OTP. ' + err.message });
  }
});

module.exports = router;
