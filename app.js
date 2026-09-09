import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const DEFAULT_PORT = 8080;
const REQUESTED_PORT = Number(process.env.PORT || DEFAULT_PORT);
const MAX_PORT_ATTEMPTS = process.env.PORT ? 1 : 10;

app.disable('x-powered-by');
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
}));

function safeUser(row) {
  return {
    id: String(row.UserID),
    name: row.Name,
    email: row.Email,
    phone: row.PhoneNumber || '',
    role: 'user',
  };
}

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

function saveAuthenticatedSession(req, user) {
  req.session.user = user;
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

app.post('/api/register', async (req, res) => {
  const { errors, email } = validateCredentials(req.body, true);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });
  const name = String(req.body.name).trim();
  const phone = String(req.body.phone || '').trim();
  try {
    const [existing] = await pool.execute('SELECT UserID FROM `user` WHERE Email = ? LIMIT 1', [email]);
    if (existing.length) return res.status(409).json({ ok: false, errors: { email: 'An account with this email already exists.' } });
    const passwordHash = await bcrypt.hash(String(req.body.password), 12);
    const [nextId] = await pool.execute('SELECT COALESCE(MAX(UserID), 0) + 1 AS nextId FROM `user`');
    const userId = Number(nextId[0].nextId);
    await pool.execute('INSERT INTO `user` (UserID, Name, Email, PhoneNumber, Password) VALUES (?, ?, ?, ?, ?)', [userId, name, email, phone, passwordHash]);
    const user = { id: String(userId), name, email, phone, role: 'user' };
    await saveAuthenticatedSession(req, user);
    return res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ ok: false, errors: { email: 'An account with this email already exists.' } });
    console.error('Registration failed:', error);
    return res.status(500).json({ ok: false, errors: { form: 'Unable to create account.' } });
  }
});

app.post('/api/login', async (req, res) => {
  const { errors, email } = validateCredentials(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });
  try {
    const [rows] = await pool.execute('SELECT UserID, Name, Email, PhoneNumber, Password FROM `user` WHERE Email = ? LIMIT 1', [email]);
    const valid = rows.length && await bcrypt.compare(String(req.body.password), rows[0].Password);
    if (!valid) return res.status(401).json({ ok: false, errors: { form: 'Invalid email or password.' } });
    const user = safeUser(rows[0]);
    await saveAuthenticatedSession(req, user);
    return res.json({ ok: true, user });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ ok: false, errors: { form: 'Unable to sign in.' } });
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, user: null });
  return res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.use((req, res, next) => {
  if (req.path.endsWith('.webmanifest')) {
    res.type('application/manifest+json');
  }
  next();
});

app.use(express.static(__dirname, {
  extensions: ['html'],
}));

const pageAliases = {
  '/': '/html/index.html',
  '/movie.html': '/html/movie.html',
  '/list.html': '/html/list.html',
  '/movdetails.html': '/html/movdetails.html',
  '/movdetails2.html': '/html/movdetails2.html',
  '/movdetails3.html': '/html/movdetails3.html',
  '/movdetails4.html': '/html/movdetails4.html',
  '/about.html': '/html/about.html',
  '/contact.html': '/html/contact.html',
  '/bookinghist.html': '/html/bookinghist.html',
  '/profile.html': '/html/profile.html',
  '/seats.html': '/html/seats.html',
  '/payment.html': '/html/payment.html',
  '/booking.html': '/html/booking.html',
  '/help.html': '/html/help.html',
  '/faq.html': '/html/faq.html',
  '/admin.html': '/html/admin.html',
  '/terms.html': '/html/terms.html',
  '/privacy.html': '/html/privacy.html',
  '/cancellation.html': '/html/cancellation.html',
  '/summa.html': '/html/summa.html',
};

Object.entries(pageAliases).forEach(([routePath, filePath]) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(__dirname, filePath));
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'ShowBookie', mode: 'mysql-session' });
});

// Fix: the old route just did a server-side redirect which cannot touch
// localStorage, so the session remained active. Now serves a minimal HTML page
// that clears the session keys client-side then redirects to the login page —
// identical behaviour to the in-app Logout button.
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Signing out…</title></head>
<body>
<script>
  try {
    localStorage.removeItem('showbookie.bookingDraft');
  } catch (_) {}
  location.replace('/html/index.html');
</script>
<noscript><meta http-equiv="refresh" content="0;url=/html/index.html"></noscript>
</body>
</html>`);
  });
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, '/offline.html'));
});

function startServer(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`ShowBookie is running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 1) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`Unable to start ShowBookie: port ${port} is already in use.`);
      console.error('Set a free port with PORT=<port> and try again.');
      process.exit(1);
      return;
    }

    console.error('Unable to start ShowBookie:', error);
    process.exit(1);
  });
}

startServer(REQUESTED_PORT, MAX_PORT_ATTEMPTS);
