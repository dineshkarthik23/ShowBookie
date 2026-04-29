import { APP_CONFIG, SEED_DATA } from './config.js';
import {
  calculateBookingPricing,
  canCancelBooking,
  generateBookingCode,
  getOccupancy,
  validateSeatSelection,
} from './booking.js';
import {
  clearSessionState,
  getCurrentUserId,
  setCurrentUserId,
} from './state.js';
import {
  normalizeEmail,
  sanitizeText,
  validateLogin,
  validateMovieInput,
  validateRegistration,
} from './validation.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDb() {
  const raw = localStorage.getItem(APP_CONFIG.storageKeys.db);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function writeDb(data) {
  localStorage.setItem(APP_CONFIG.storageKeys.db, JSON.stringify(data));
}

function ensureDbShape(data) {
  const db = data || clone(SEED_DATA);
  db.bookings = Array.isArray(db.bookings) ? db.bookings : [];
  db.supportRequests = Array.isArray(db.supportRequests) ? db.supportRequests : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  return db;
}

function getDb() {
  return ensureDbShape(readDb());
}

function saveDb(db) {
  writeDb(ensureDbShape(db));
}

function nextId(prefix, collection) {
  return `${prefix}_${Date.now().toString(36)}_${collection.length + 1}`;
}

function getMovieById(db, movieId) {
  return db.movies.find((movie) => movie.id === movieId) || null;
}

function getTheaterById(db, theaterId) {
  return db.theaters.find((theater) => theater.id === theaterId) || null;
}

function getSeatMapById(db, seatMapId) {
  return db.seatMaps.find((seatMap) => seatMap.id === seatMapId) || null;
}

function enrichShow(db, show) {
  const movie = getMovieById(db, show.movieId);
  const theater = getTheaterById(db, show.theaterId);
  const seatMap = getSeatMapById(db, show.seatMapId);
  const occupancy = getOccupancy(seatMap, show.reservedSeats);
  return {
    ...clone(show),
    movie,
    theater,
    seatMap,
    occupancy,
  };
}

function enrichBooking(db, booking) {
  const show = enrichShow(db, db.shows.find((item) => item.id === booking.showId));
  return {
    ...clone(booking),
    movie: show.movie,
    theater: show.theater,
    showStartTime: show.startTime,
    seatMap: show.seatMap,
  };
}

function pushNotification(db, userId, payload) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.notifications.unshift({
    id: nextId('notif', user.notifications),
    read: false,
    createdAt: new Date().toISOString(),
    ...payload,
  });
}

function ensureAuthenticatedUser(db) {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }
  return db.users.find((user) => user.id === userId) || null;
}

function sortMovies(movies, sortBy) {
  const list = [...movies];
  if (sortBy === 'rating') {
    return list.sort((a, b) => b.rating - a.rating);
  }
  if (sortBy === 'releaseDate') {
    return list.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  }
  if (sortBy === 'title') {
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return list.sort((a, b) => b.popularityScore - a.popularityScore);
}

export function initializeMockDb() {
  const current = readDb();
  if (!current) {
    saveDb(clone(SEED_DATA));
    return;
  }
  saveDb(ensureDbShape(current));
}

export function getCurrentUser() {
  const db = getDb();
  return ensureAuthenticatedUser(db);
}

export function requireCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Please sign in to continue.');
  }
  return user;
}

export function registerUser(values) {
  const errors = validateRegistration(values);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const db = getDb();
  const email = normalizeEmail(values.email);
  const existing = db.users.find((user) => normalizeEmail(user.email) === email);
  if (existing) {
    return { ok: false, errors: { email: 'An account with this email already exists.' } };
  }

  const user = {
    id: nextId('user', db.users),
    name: sanitizeText(values.name),
    email,
    password: String(values.password),
    role: 'user',
    phone: '',
    locale: APP_CONFIG.defaultLocale,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    favorites: [],
    recentlyViewed: [],
    notifications: [],
    preferences: {
      theme: APP_CONFIG.defaultTheme,
    },
  };

  db.users.push(user);
  pushNotification(db, user.id, {
    type: 'success',
    title: 'Welcome to ShowBookie',
    message: 'Your account is ready. Browse movies and start booking.',
  });
  saveDb(db);
  setCurrentUserId(user.id);

  return { ok: true, user };
}

export function loginUser(values) {
  const errors = validateLogin(values);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const db = getDb();
  const email = normalizeEmail(values.email);
  const user = db.users.find((item) => normalizeEmail(item.email) === email);
  if (!user || user.password !== String(values.password)) {
    return { ok: false, errors: { form: 'Invalid email or password.' } };
  }

  user.lastLoginAt = new Date().toISOString();
  saveDb(db);
  setCurrentUserId(user.id);
  return { ok: true, user };
}

export function logoutUser() {
  clearSessionState();
}

export function getMovies(filters = {}) {
  const db = getDb();
  const { search = '', genre = '', language = '', minRating = 0, date = '', sort = 'popularity', page = 1 } = filters;
  const searchTerm = String(search).trim().toLowerCase();

  const filtered = db.movies.filter((movie) => {
    const matchesSearch =
      !searchTerm ||
      movie.title.toLowerCase().includes(searchTerm) ||
      movie.genres.join(' ').toLowerCase().includes(searchTerm);
    const matchesGenre = !genre || movie.genres.includes(genre);
    const matchesLanguage = !language || movie.language === language;
    const matchesRating = Number(movie.rating) >= Number(minRating || 0);
    const matchesDate =
      !date ||
      db.shows.some(
        (show) =>
          show.movieId === movie.id && new Date(show.startTime).toISOString().slice(0, 10) === date
      );

    return matchesSearch && matchesGenre && matchesLanguage && matchesRating && matchesDate;
  });

  const sorted = sortMovies(filtered, sort);
  const total = sorted.length;
  const pageSize = APP_CONFIG.pagination.moviesPerPage;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const normalizedPage = Math.min(Math.max(Number(page), 1), totalPages);
  const startIndex = (normalizedPage - 1) * pageSize;

  return {
    items: sorted.slice(startIndex, startIndex + pageSize),
    total,
    page: normalizedPage,
    totalPages,
    genres: [...new Set(db.movies.flatMap((movie) => movie.genres))].sort(),
    languages: [...new Set(db.movies.map((movie) => movie.language))].sort(),
  };
}

export function getMovieDetails(slugOrId) {
  const db = getDb();
  const movie =
    db.movies.find((item) => item.slug === slugOrId || item.id === slugOrId) || db.movies[0];

  const shows = db.shows
    .filter((show) => show.movieId === movie.id)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .map((show) => enrichShow(db, show));

  return { movie, shows };
}

export function markMovieViewed(movieId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    return;
  }
  user.recentlyViewed = [movieId, ...(user.recentlyViewed || []).filter((id) => id !== movieId)].slice(0, 8);
  saveDb(db);
}

export function toggleFavorite(movieId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    throw new Error('Please sign in to save favorites.');
  }
  const favorites = new Set(user.favorites || []);
  if (favorites.has(movieId)) {
    favorites.delete(movieId);
  } else {
    favorites.add(movieId);
    pushNotification(db, user.id, {
      type: 'info',
      title: 'Added to wishlist',
      message: 'The movie has been saved to your favorites.',
    });
  }
  user.favorites = [...favorites];
  saveDb(db);
  return user.favorites;
}

export function getWishlistMovies() {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    return [];
  }
  return db.movies.filter((movie) => (user.favorites || []).includes(movie.id));
}

export function getRecentlyViewedMovies() {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    return [];
  }
  return (user.recentlyViewed || [])
    .map((movieId) => db.movies.find((movie) => movie.id === movieId))
    .filter(Boolean);
}

export function getRecommendedMovies() {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  const favoriteGenres = new Set();

  if (user) {
    for (const movieId of [...(user.favorites || []), ...(user.recentlyViewed || [])]) {
      const movie = getMovieById(db, movieId);
      movie?.genres.forEach((genre) => favoriteGenres.add(genre));
    }
  }

  return [...db.movies]
    .map((movie) => {
      const affinity = movie.genres.reduce((score, genre) => score + (favoriteGenres.has(genre) ? 12 : 0), 0);
      return {
        ...movie,
        recommendationScore: movie.popularityScore + affinity + movie.rating * 2,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 4);
}

export function getShowById(showId) {
  const db = getDb();
  const show = db.shows.find((item) => item.id === showId);
  return show ? enrichShow(db, show) : null;
}

export function saveBookingDraft(draft) {
  return {
    ...draft,
  };
}

export function createBooking({ showId, selectedSeats, promoCode, paymentMethod, transactionId }) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    throw new Error('Please sign in to continue.');
  }

  const show = db.shows.find((item) => item.id === showId);
  if (!show) {
    throw new Error('The selected show is not available.');
  }

  const seatMap = getSeatMapById(db, show.seatMapId);
  const selectionError = validateSeatSelection({
    selectedSeats,
    reservedSeats: show.reservedSeats,
    seatMap,
  });
  if (selectionError) {
    throw new Error(selectionError);
  }

  const promo = promoCode ? APP_CONFIG.promoCodes[String(promoCode).toUpperCase()] : null;
  const pricing = calculateBookingPricing({
    selectedSeats,
    seatMap,
    promo,
    promoCode,
    isFirstBooking: db.bookings.filter((booking) => booking.userId === user.id).length === 0,
  });

  const booking = {
    id: nextId('book', db.bookings),
    userId: user.id,
    showId,
    selectedSeats: [...selectedSeats],
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod,
    transactionId,
    promoCode: promo?.code || '',
    subtotal: pricing.subtotal,
    convenienceFee: pricing.convenienceFee,
    discount: pricing.discount,
    tax: pricing.tax,
    total: pricing.total,
    createdAt: new Date().toISOString(),
    bookingCode: '',
    cancelledAt: '',
  };
  booking.bookingCode = generateBookingCode({
    bookingId: booking.id,
    userId: booking.userId,
    showId: booking.showId,
  });

  show.reservedSeats = [...new Set([...(show.reservedSeats || []), ...selectedSeats])];
  db.bookings.unshift(booking);
  pushNotification(db, user.id, {
    type: 'success',
    title: 'Booking confirmed',
    message: `${getMovieById(db, show.movieId).title} seats ${selectedSeats.join(', ')} are confirmed.`,
  });
  saveDb(db);

  return enrichBooking(db, booking);
}

export function getBookingHistory(filters = {}) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    return [];
  }

  const searchTerm = String(filters.search || '').trim().toLowerCase();
  const status = String(filters.status || '');
  return db.bookings
    .filter((booking) => booking.userId === user.id)
    .map((booking) => enrichBooking(db, booking))
    .filter((booking) => {
      const matchesSearch =
        !searchTerm ||
        booking.movie.title.toLowerCase().includes(searchTerm) ||
        booking.theater.name.toLowerCase().includes(searchTerm) ||
        booking.bookingCode.toLowerCase().includes(searchTerm);
      const matchesStatus = !status || booking.status === status;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function cancelBooking(bookingId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    throw new Error('Please sign in to continue.');
  }

  const booking = db.bookings.find((item) => item.id === bookingId && item.userId === user.id);
  if (!booking) {
    throw new Error('Booking not found.');
  }
  const enriched = enrichBooking(db, booking);
  if (!canCancelBooking(enriched)) {
    throw new Error('This booking is no longer eligible for cancellation.');
  }

  booking.status = 'cancelled';
  booking.paymentStatus = 'refund_pending';
  booking.cancelledAt = new Date().toISOString();

  const show = db.shows.find((item) => item.id === booking.showId);
  if (show) {
    show.reservedSeats = (show.reservedSeats || []).filter((seat) => !booking.selectedSeats.includes(seat));
  }
  pushNotification(db, user.id, {
    type: 'info',
    title: 'Cancellation requested',
    message: `Booking ${booking.bookingCode} has been cancelled. Refund is marked as pending in this mock flow.`,
  });
  saveDb(db);

  return enrichBooking(db, booking);
}

export function updateProfile(values) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    throw new Error('Please sign in to continue.');
  }

  user.name = sanitizeText(values.name || user.name);
  user.phone = sanitizeText(values.phone || user.phone);
  user.locale = values.locale || user.locale;
  saveDb(db);
  return clone(user);
}

export function getNotificationCenter() {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  return user ? [...(user.notifications || [])] : [];
}

export function markNotificationRead(notificationId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user) {
    return;
  }
  user.notifications = (user.notifications || []).map((notification) =>
    notification.id === notificationId ? { ...notification, read: true } : notification
  );
  saveDb(db);
}

export function submitSupportRequest(values) {
  const db = getDb();
  db.supportRequests.unshift({
    id: nextId('support', db.supportRequests),
    name: sanitizeText(values.name),
    email: normalizeEmail(values.email),
    message: sanitizeText(values.message),
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
}

export function getAdminSnapshot() {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  const revenue = db.bookings
    .filter((booking) => booking.status === 'confirmed')
    .reduce((total, booking) => total + booking.total, 0);
  const occupancyRates = db.shows.map((show) => getOccupancy(getSeatMapById(db, show.seatMapId), show.reservedSeats));
  const occupancy =
    occupancyRates.reduce((total, item) => total + item.occupancyRate, 0) / Math.max(occupancyRates.length, 1);

  return {
    metrics: {
      totalBookings: db.bookings.length,
      revenue: Number(revenue.toFixed(2)),
      occupancy: Number(occupancy.toFixed(1)),
      movies: db.movies.length,
      shows: db.shows.length,
    },
    movies: clone(db.movies),
    shows: db.shows.map((show) => enrichShow(db, show)),
    theaters: clone(db.theaters),
    seatMaps: clone(db.seatMaps),
  };
}

export function saveMovie(values) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  const errors = validateMovieInput(values);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const movie = {
    id: values.id || nextId('mov', db.movies),
    slug: sanitizeText(values.slug || values.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: sanitizeText(values.title),
    language: sanitizeText(values.language),
    certificate: sanitizeText(values.certificate || 'U'),
    genres: String(values.genres || '')
      .split(',')
      .map((genre) => sanitizeText(genre))
      .filter(Boolean),
    durationMinutes: Number(values.durationMinutes || 120),
    rating: Number(values.rating || 7),
    votesLabel: sanitizeText(values.votesLabel || '1K votes'),
    releaseDate: values.releaseDate || new Date().toISOString().slice(0, 10),
    popularityScore: Number(values.popularityScore || 70),
    image: sanitizeText(values.image || '/images/movie1.jpeg'),
    heroImage: sanitizeText(values.heroImage || values.image || '/images/movie1.jpeg'),
    synopsis: sanitizeText(values.synopsis),
    cast: String(values.cast || '')
      .split(',')
      .map((item) => sanitizeText(item))
      .filter(Boolean),
    tags: String(values.tags || '')
      .split(',')
      .map((item) => sanitizeText(item))
      .filter(Boolean),
    legacyPath: values.legacyPath || `/html/movdetails.html?movie=${sanitizeText(values.slug || values.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`,
  };

  const index = db.movies.findIndex((item) => item.id === movie.id);
  if (index >= 0) {
    db.movies[index] = movie;
  } else {
    db.movies.push(movie);
  }
  saveDb(db);
  return { ok: true, movie };
}

export function deleteMovie(movieId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required.');
  }
  db.movies = db.movies.filter((movie) => movie.id !== movieId);
  db.shows = db.shows.filter((show) => show.movieId !== movieId);
  saveDb(db);
}

export function saveShow(values) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  const show = {
    id: values.id || nextId('show', db.shows),
    movieId: values.movieId,
    theaterId: values.theaterId,
    seatMapId: values.seatMapId,
    screenName: sanitizeText(values.screenName || 'Screen 1'),
    format: sanitizeText(values.format || '2D'),
    startTime: new Date(values.startTime).toISOString(),
    reservedSeats: Array.isArray(values.reservedSeats) ? [...values.reservedSeats] : [],
  };

  const index = db.shows.findIndex((item) => item.id === show.id);
  if (index >= 0) {
    db.shows[index] = show;
  } else {
    db.shows.push(show);
  }
  saveDb(db);
  return enrichShow(db, show);
}

export function deleteShow(showId) {
  const db = getDb();
  const user = ensureAuthenticatedUser(db);
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required.');
  }
  db.shows = db.shows.filter((show) => show.id !== showId);
  saveDb(db);
}

export function resetMockDb() {
  saveDb(clone(SEED_DATA));
  clearSessionState();
}
