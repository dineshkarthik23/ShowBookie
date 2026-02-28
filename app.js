import express from 'express';
import session from 'express-session';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url'; 
import {
  create_booking_for_user,
  get_all,
  get_bookings_by_user_id,
  get_t_by_id,
  get_user_by_email,
  insert_user
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

const protectedHtmlPaths = new Set([
  '/movie.html',
  '/html/movie.html',
  '/html/list.html',
  '/html/bookinghist.html',
  '/html/about.html',
  '/html/contact.html',
  '/html/movdetails.html',
  '/html/movdetails2.html',
  '/html/movdetails3.html',
  '/html/movdetails4.html',
  '/html/seats.html',
  '/html/payment.html',
  '/html/booking.html'
]);

app.use((req, res, next) => {
  if (protectedHtmlPaths.has(req.path) && !req.session.userId) {
    return res.redirect('/');
  }
  next();
});

app.use(express.static(path.join(__dirname)));

function getRowValue(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return null;
}

function setSessionUser(req, row) {
  req.session.userId = getRowValue(row, 'UserID', 'userId');
  req.session.username = getRowValue(row, 'Name', 'name');
  req.session.email = getRowValue(row, 'Email', 'email');
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function normalizeMovieTitleForLookup(title) {
  const value = (title || '').trim();
  const upper = value.toUpperCase();
  if (upper.includes('DJANGO')) {
    return 'Django';
  }
  if (upper.includes('DUNE')) {
    return 'Dune 2';
  }
  if (upper.includes('SHAWSHANK')) {
    return 'Shawshank Redemption';
  }
  if (upper.includes('INTERSTELLAR')) {
    return 'Interstellar';
  }
  return value;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/index.html'));
});

app.get('/movie.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '/html/movie.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/get-user', (req, res) => {
  if (req.session.userId) {
      const user = {
          userId: req.session.userId,
          username: req.session.username,
          email: req.session.email
      };
      res.json(user);
  } else {
      res.json({});
  }
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      const existingUsers = await get_user_by_email(email);
      if (existingUsers.length > 0) {
          return res.status(400).send('User with this email already exists.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await insert_user(username, email, hashedPassword);

      const newUser = await get_user_by_email(email);
      if (!newUser[0]) {
          throw new Error('Failed to retrieve newly created user.');
      }
      await regenerateSession(req);
      setSessionUser(req, newUser[0]);

      res.redirect('/movie.html');
  } catch (error) {
      console.error('Error during registration:', error.message, error.stack);
      res.status(500).send('An error occurred during registration.');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    const rows = await get_user_by_email(email);
    if (rows.length > 0) {
      const user = rows[0];
      const hashedPassword = getRowValue(user, 'Password', 'password');
      const isMatch = await bcrypt.compare(password, hashedPassword);

      if (isMatch) {
        await regenerateSession(req);
        setSessionUser(req, user);
        res.redirect('/movie.html');
      } else {
        res.send('Invalid email or password.');
      }
    } else {
      res.send('Invalid email or password.');
    }
  } catch (error) {
    console.error('Error during login:', error.message, error.stack);
    res.status(500).send('An error occurred during login.');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('An error occurred during logout.');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.get('/movies', async (req, res) => {
  try {
    const movies = await get_all();
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies', details: error.message });
  }
});

app.get('/theaters', async (req, res) => {
  try {
    const theaters = await get_t_by_id();
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ error: 'Failed to fetch theaters', details: error.message });
  }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const bookings = await get_bookings_by_user_id(req.session.userId);
    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

app.post('/api/bookings', requireAuth, async (req, res) => {
  const { movieTitle, theater, selectedSeats, paymentMode } = req.body;

  if (!movieTitle || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return res.status(400).json({ error: 'Movie title and at least one seat are required.' });
  }

  try {
    const booking = await create_booking_for_user({
      userId: req.session.userId,
      movieTitle: normalizeMovieTitleForLookup(movieTitle),
      theaterName: theater,
      selectedSeats,
      paymentMode: paymentMode || 'Card'
    });
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Error creating booking:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

/*app.get('/seats.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'seats.html'));
  } else {
    res.redirect('/');
  }
});

/*app.get('/payment.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'payment.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/booking-success.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'booking-success.html'));
  } else {
    res.redirect('/');
  }
});*/

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
