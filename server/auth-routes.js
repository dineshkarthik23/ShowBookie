import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import { clearAuthCookie, getAuthUser, setAuthCookie } from './auth.js';

export const authRouter = express.Router();

function validateCredentials({ name, email, password, confirmPassword } = {}, isRegistration = false) {
  const errors = {};
  if (isRegistration && (!String(name || '').trim() || String(name).trim().length < 2)) {
    errors.name = 'Name must be at least 2 characters.';
  }
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  else if (String(password).length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must include uppercase, lowercase, and a number.';
  }
  if (isRegistration && String(password) !== String(confirmPassword || '')) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return { errors, email: normalizedEmail };
}

function safeUser(row) {
  return {
    id: String(row.UserID),
    name: row.Name,
    email: row.Email,
    phone: row.PhoneNumber || '',
    role: 'user',
  };
}

authRouter.post('/register', async (req, res) => {
  const { errors, email } = validateCredentials(req.body, true);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });
  try {
    const [existing] = await pool.execute('SELECT UserID FROM `user` WHERE Email = ? LIMIT 1', [email]);
    if (existing.length) return res.status(409).json({ ok: false, errors: { email: 'An account with this email already exists.' } });
    const passwordHash = await bcrypt.hash(String(req.body.password), 12);
    const [nextId] = await pool.execute('SELECT COALESCE(MAX(UserID), 0) + 1 AS nextId FROM `user`');
    const userId = Number(nextId[0].nextId);
    await pool.execute(
      'INSERT INTO `user` (UserID, Name, Email, PhoneNumber, Password) VALUES (?, ?, ?, ?, ?)',
      [userId, String(req.body.name).trim(), email, String(req.body.phone || '').trim(), passwordHash]
    );
    const user = { id: String(userId), name: String(req.body.name).trim(), email, phone: String(req.body.phone || '').trim(), role: 'user' };
    setAuthCookie(res, user);
    return res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ ok: false, errors: { email: 'An account with this email already exists.' } });
    console.error('Registration failed:', error);
    return res.status(500).json({ ok: false, errors: { form: 'Unable to create account.' } });
  }
});

authRouter.post('/login', async (req, res) => {
  const { errors, email } = validateCredentials(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });
  try {
    const [rows] = await pool.execute('SELECT UserID, Name, Email, PhoneNumber, Password FROM `user` WHERE Email = ? LIMIT 1', [email]);
    const valid = rows.length && await bcrypt.compare(String(req.body.password), rows[0].Password);
    if (!valid) return res.status(401).json({ ok: false, errors: { form: 'Invalid email or password.' } });
    const user = safeUser(rows[0]);
    setAuthCookie(res, user);
    return res.json({ ok: true, user });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ ok: false, errors: { form: 'Unable to sign in.' } });
  }
});

authRouter.get('/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, user: null });
  return res.json({ ok: true, user });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

