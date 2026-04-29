import { APP_CONFIG } from './config.js';
import {
  cancelBooking,
  createBooking,
  getBookingHistory,
  getCurrentUser,
  getMovieDetails,
  getMovies,
  getNotificationCenter,
  getRecommendedMovies,
  getRecentlyViewedMovies,
  getShowById,
  getWishlistMovies,
  initializeMockDb,
  loginUser,
  logoutUser,
  markMovieViewed,
  registerUser,
  submitSupportRequest,
  toggleFavorite,
  updateProfile,
} from './api.js';
import {
  loadAdminDashboard,
  removeAdminMovie,
  removeAdminShow,
  saveAdminMovie,
  saveAdminShow,
} from './admin.js';
import { calculateBookingPricing, canCancelBooking } from './booking.js';
import { getActiveLocale, loadLocale, t } from './i18n.js';
import { simulatePayment } from './payments-mock.js';
import {
  clearBookingDraft,
  clearSessionState,
  getBookingDraft,
  getLocalePreference,
  getTheme,
  isNotificationsOpen,
  setBookingDraft,
  setLocalePreference,
  setNotificationsOpen,
  setTheme,
} from './state.js';
import {
  closeModal,
  createBookingSummary,
  createDetailList,
  createEmptyGridMessage,
  createFilterField,
  createFooter,
  createHero,
  createMovieCard,
  createNavbar,
  createNotificationDrawer,
  createPageLayout,
  createSeatLegend,
  createSection,
  createStatusState,
  el,
  formatCurrency,
  formatDate,
  formatDateTime,
  setDocumentMeta,
  showToast,
  openModal,
} from './ui.js';
import {
  sanitizeText,
  validateContactForm,
  validatePaymentForm,
  validatePhone,
  validatePromoCode,
} from './validation.js';

const root = document.getElementById('app');
const protectedPages = new Set([
  'home',
  'movies',
  'details',
  'seats',
  'checkout',
  'confirmation',
  'history',
  'profile',
  'admin',
]);

function getPage() {
  return document.body.dataset.page || 'home';
}

function getBodyMovieSlug() {
  return document.body.dataset.movieSlug || '';
}

function applyThemeToDocument() {
  document.documentElement.dataset.theme = getTheme();
}

function nextUrlAfterLogin() {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  return `${APP_CONFIG.routeMap.login}?next=${encodeURIComponent(currentPath)}`;
}

function redirectTo(path) {
  window.location.href = path;
}

function pageForNav(page) {
  if (page === 'contact') {
    return 'help';
  }
  if (page === 'faq' || page === 'terms' || page === 'privacy' || page === 'cancellation') {
    return 'help';
  }
  return page;
}

function createShell(page, hero, sections) {
  const user = getCurrentUser();
  const notifications = user ? getNotificationCenter() : [];
  const header = createNavbar({
    activePage: pageForNav(page),
    user,
    notifications,
    locale: getActiveLocale(),
    onThemeToggle: () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
      applyThemeToDocument();
      renderApp();
    },
    onLocaleChange: async (locale) => {
      setLocalePreference(locale);
      await loadLocale(locale);
      renderApp();
    },
  });
  const drawer = createNotificationDrawer(notifications);
  if (isNotificationsOpen()) {
    drawer.classList.remove('hidden');
  }
  header.querySelector('[data-action="toggle-notifications"]')?.addEventListener('click', () => {
    const isHidden = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden');
    setNotificationsOpen(isHidden);
  });

  return createPageLayout({
    header,
    hero,
    main: el('main', { className: 'page-main' }, sections),
    footer: createFooter(),
    notifications: drawer,
  });
}

function movieHref(movie) {
  return movie.legacyPath || `${APP_CONFIG.routeMap.details}?movie=${movie.slug}`;
}

function favoriteIdsForUser(user) {
  return new Set(user?.favorites || []);
}

function resolveMovieSlug() {
  const params = new URLSearchParams(window.location.search);
  const byQuery = params.get('movie');
  if (byQuery) {
    return byQuery;
  }
  return getBodyMovieSlug();
}

function resolveShowId() {
  return new URLSearchParams(window.location.search).get('showId') || '';
}

function renderAuthPage() {
  setDocumentMeta({
    title: 'Sign In | ShowBookie',
    description: 'Sign in or create a ShowBookie account to browse movies and manage bookings.',
  });

  const next = new URLSearchParams(window.location.search).get('next') || APP_CONFIG.routeMap.home;
  const wrapper = el('div', { className: 'auth-shell' }, []);

  const tabs = el('div', { className: 'tab-row auth-tab-row' }, []);
  const forms = el('div', { className: 'auth-forms' }, []);

  const createField = (label, input, errorId) =>
    el('label', { className: 'field-group', attrs: { for: input.id } }, [
      el('span', { text: label }),
      input,
      el('small', { className: 'field-error', id: errorId }),
    ]);

  const loginEmail = el('input', {
    id: 'login-email',
    type: 'email',
    attrs: { autocomplete: 'email', placeholder: 'Email address' },
  });
  const loginPassword = el('input', {
    id: 'login-password',
    type: 'password',
    attrs: { autocomplete: 'current-password', placeholder: 'Password' },
  });
  const forgotPassword = el('a', {
    href: '#',
    className: 'forgot-password-link',
    text: 'Forgot password?',
  });
  const loginError = el('p', { className: 'form-error' });
  const loginForm = el('form', { className: 'auth-form' }, [
    createField('Email', loginEmail, 'login-email-error'),
    createField('Password', loginPassword, 'login-password-error'),
    el('div', { className: 'auth-form-meta' }, [forgotPassword]),
    loginError,
    el('button', { className: 'button button-primary', type: 'submit', text: 'Sign in' }),
  ]);

  const registerName = el('input', { id: 'register-name', type: 'text', attrs: { placeholder: 'Full name' } });
  const registerEmail = el('input', { id: 'register-register-email', type: 'email', attrs: { placeholder: 'Email address' } });
  const registerPassword = el('input', { id: 'register-password', type: 'password', attrs: { placeholder: 'Create password' } });
  const registerConfirmPassword = el('input', {
    id: 'register-confirm-password',
    type: 'password',
    attrs: { placeholder: 'Confirm password' },
  });
  const registerError = el('p', { className: 'form-error' });
  const registerForm = el('form', { className: 'auth-form hidden' }, [
    createField('Name', registerName, 'register-name-error'),
    createField('Email', registerEmail, 'register-email-error'),
    createField('Password', registerPassword, 'register-password-error'),
    createField('Confirm password', registerConfirmPassword, 'register-confirm-password-error'),
    registerError,
    el('button', { className: 'button button-primary', type: 'submit', text: 'Create account' }),
  ]);

  const loginTab = el('button', { className: 'tab-button active', type: 'button', text: 'Sign in' });
  const registerTab = el('button', { className: 'tab-button', type: 'button', text: 'Register' });
  const activate = (mode) => {
    loginTab.classList.toggle('active', mode === 'login');
    registerTab.classList.toggle('active', mode === 'register');
    loginForm.classList.toggle('hidden', mode !== 'login');
    registerForm.classList.toggle('hidden', mode !== 'register');
  };
  loginTab.addEventListener('click', () => activate('login'));
  registerTab.addEventListener('click', () => activate('register'));
  tabs.append(loginTab, registerTab);
  forms.append(loginForm, registerForm);

  forgotPassword.addEventListener('click', (event) => {
    event.preventDefault();
    showToast({
      title: 'Password recovery',
      message: 'Password recovery UI is not wired yet, but your account data remains stored locally.',
      type: 'info',
    });
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = loginUser({ email: loginEmail.value, password: loginPassword.value });
    loginError.textContent = result.errors?.form || '';
    document.getElementById('login-email-error').textContent = result.errors?.email || '';
    document.getElementById('login-password-error').textContent = result.errors?.password || '';
    if (result.ok) {
      showToast({ title: 'Welcome back', message: `Signed in as ${result.user.name}.`, type: 'success' });
      redirectTo(next);
    }
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = registerUser({
      name: registerName.value,
      email: registerEmail.value,
      password: registerPassword.value,
      confirmPassword: registerConfirmPassword.value,
    });

    ['name', 'email', 'password', 'confirm-password'].forEach((key) => {
      const resultKey = key === 'confirm-password' ? 'confirmPassword' : key;
      const target = document.getElementById(`register-${key}-error`);
      if (target) {
        target.textContent = result.errors?.[resultKey] || '';
      }
    });
    registerError.textContent = result.errors?.form || '';
    if (result.ok) {
      showToast({ title: 'Account created', message: 'Your ShowBookie account is ready.', type: 'success' });
      redirectTo(next);
    }
  });

  wrapper.append(
    createSection(
      'Access your account',
      'Sign in to continue booking or create a new account in a few seconds.',
      el('div', { className: 'auth-entry-layout' }, [
        el('div', { className: 'auth-intro-panel card-surface nested-surface' }, [
          el('span', { className: 'eyebrow', text: 'Welcome back' }),
          el('h1', { className: 'auth-title', text: 'Sign in to plan your next movie night' }),
          el('p', {
            text: 'Browse current releases, save favorites, and keep your booking history in one place.',
          }),
          el('div', { className: 'auth-benefits' }, [
            infoCard('Fast booking', 'Pick a showtime, select seats, and check out without losing your progress.'),
            infoCard('Saved activity', 'Your wishlist, recent views, and booking history stay available on this browser.'),
            infoCard('Helpful support', 'Need assistance? The Help and About sections stay one click away.'),
          ]),
        ]),
        el('div', { className: 'card-surface auth-card' }, [tabs, forms]),
      ])
    ),
  );

  root.replaceChildren(
    createPageLayout({
      header: createNavbar({
        activePage: 'login',
        user: null,
        notifications: [],
        locale: getActiveLocale(),
        onThemeToggle: () => {
          setTheme(getTheme() === 'dark' ? 'light' : 'dark');
          applyThemeToDocument();
          renderApp();
        },
        onLocaleChange: async (locale) => {
          setLocalePreference(locale);
          await loadLocale(locale);
          renderApp();
        },
      }),
      hero: null,
      main: el('main', { className: 'page-main auth-main' }, Array.from(wrapper.children)),
      footer: createFooter(),
      notifications: createNotificationDrawer([]),
    })
  );
}

function infoCard(title, description) {
  return el('article', { className: 'feature-card' }, [el('h3', { text: title }), el('p', { text: description })]);
}

function decorateFavoriteButtons(container) {
  container.querySelectorAll('[data-action="favorite"]').forEach((button) => {
    button.addEventListener('click', () => {
      try {
        toggleFavorite(button.dataset.movieId);
        showToast({ title: 'Wishlist updated', message: 'Your selection has been saved.', type: 'success' });
        renderApp();
      } catch (error) {
        showToast({ title: 'Sign in required', message: error.message, type: 'error' });
        redirectTo(nextUrlAfterLogin());
      }
    });
  });
}

function renderHomePage() {
  const user = getCurrentUser();
  const recommended = getRecommendedMovies();
  const favorites = getWishlistMovies();
  const recentlyViewed = getRecentlyViewedMovies();
  const spotlight = recommended[0];

  setDocumentMeta({
    title: 'Home | ShowBookie',
    description: 'Discover recommended movies, revisit recently viewed titles, and resume your next booking.',
  });

  const favoriteIds = favoriteIdsForUser(user);
  const recommendedGrid = el('div', { className: 'movie-grid' }, recommended.map((movie) => createMovieCard({
    movie,
    isFavorite: favoriteIds.has(movie.id),
  })));
  decorateFavoriteButtons(recommendedGrid);

  const sections = [
    createSection('Recommended movies', 'Sorted using popularity and your recent genre affinity.', recommendedGrid),
    createSection(
      'Recently viewed',
      recentlyViewed.length
        ? 'Pick up where you left off.'
        : 'Your recent views will appear here after you open movie details.',
      recentlyViewed.length
        ? el(
            'div',
            { className: 'movie-grid compact' },
            recentlyViewed.map((movie) =>
              createMovieCard({ movie, isFavorite: favoriteIds.has(movie.id), ctaLabel: 'Open again' })
            )
          )
        : createEmptyGridMessage('No recently viewed movies yet.')
    ),
    createSection(
      'Wishlist',
      favorites.length ? 'Saved movies stay here across sessions.' : 'Save movies you want to revisit later.',
      favorites.length
        ? el(
            'div',
            { className: 'movie-grid compact' },
            favorites.map((movie) => createMovieCard({ movie, isFavorite: true, ctaLabel: 'Book now' }))
          )
        : createEmptyGridMessage('Your wishlist is empty.')
    ),
  ];

  sections.forEach((section) => decorateFavoriteButtons(section));

  root.replaceChildren(
    createShell(
      'home',
      createHero({
        eyebrow: 'Now showing',
        title: spotlight.title,
        description: spotlight.synopsis,
        image: spotlight.heroImage,
        chips: [spotlight.language, ...spotlight.genres, `${spotlight.durationMinutes} min`],
        actions: [
          { href: movieHref(spotlight), label: 'Book this movie' },
          { href: APP_CONFIG.routeMap.movies, label: 'Browse all movies', kind: 'secondary' },
        ],
      }),
      sections
    )
  );
}

function renderMoviesPage() {
  const user = getCurrentUser();
  const favoriteIds = favoriteIdsForUser(user);
  const params = new URLSearchParams(window.location.search);
  const filters = {
    search: params.get('search') || '',
    genre: params.get('genre') || '',
    language: params.get('language') || '',
    minRating: params.get('minRating') || '',
    date: params.get('date') || '',
    sort: params.get('sort') || 'popularity',
    page: params.get('page') || 1,
  };
  const result = getMovies(filters);

  setDocumentMeta({
    title: 'Movies | ShowBookie',
    description: 'Filter movies by genre, language, rating, or date and continue straight into seat selection.',
  });

  const searchInput = el('input', { type: 'search', value: filters.search, attrs: { placeholder: 'Search movies or genres' } });
  const genreSelect = el(
    'select',
    {},
    [el('option', { text: 'All genres', attrs: { value: '' } }), ...result.genres.map((genre) => el('option', { text: genre, attrs: { value: genre } }))]
  );
  genreSelect.value = filters.genre;
  const languageSelect = el(
    'select',
    {},
    [el('option', { text: 'All languages', attrs: { value: '' } }), ...result.languages.map((language) => el('option', { text: language, attrs: { value: language } }))]
  );
  languageSelect.value = filters.language;
  const ratingSelect = el(
    'select',
    {},
    [
      el('option', { text: 'Any rating', attrs: { value: '' } }),
      el('option', { text: '7+', attrs: { value: '7' } }),
      el('option', { text: '8+', attrs: { value: '8' } }),
      el('option', { text: '9+', attrs: { value: '9' } }),
    ]
  );
  ratingSelect.value = filters.minRating;
  const dateInput = el('input', { type: 'date', value: filters.date });
  const sortSelect = el(
    'select',
    {},
    [
      el('option', { text: 'Popularity', attrs: { value: 'popularity' } }),
      el('option', { text: 'Rating', attrs: { value: 'rating' } }),
      el('option', { text: 'Newest', attrs: { value: 'releaseDate' } }),
      el('option', { text: 'Title', attrs: { value: 'title' } }),
    ]
  );
  sortSelect.value = filters.sort;
  const applyFilters = () => {
    const next = new URLSearchParams();
    if (searchInput.value.trim()) next.set('search', searchInput.value.trim());
    if (genreSelect.value) next.set('genre', genreSelect.value);
    if (languageSelect.value) next.set('language', languageSelect.value);
    if (ratingSelect.value) next.set('minRating', ratingSelect.value);
    if (dateInput.value) next.set('date', dateInput.value);
    if (sortSelect.value) next.set('sort', sortSelect.value);
    redirectTo(`${APP_CONFIG.routeMap.movies}${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const filterBar = el('div', { className: 'filters-grid card-surface' }, [
    createFilterField('Search', searchInput),
    createFilterField('Genre', genreSelect),
    createFilterField('Language', languageSelect),
    createFilterField('Min rating', ratingSelect),
    createFilterField('Show date', dateInput),
    createFilterField('Sort by', sortSelect),
    el('div', { className: 'field-group' }, [
      el('span', { text: 'Apply filters' }),
      el('button', { className: 'button button-primary', type: 'button', text: 'Update results' }),
    ]),
  ]);
  filterBar.querySelector('.button-primary').addEventListener('click', applyFilters);

  const grid = result.items.length
    ? el(
        'div',
        { className: 'movie-grid' },
        result.items.map((movie) => createMovieCard({ movie, isFavorite: favoriteIds.has(movie.id) }))
      )
    : createStatusState('empty', 'No matching movies', 'Try clearing one or two filters to widen the results.');
  decorateFavoriteButtons(grid);

  const pagination = el('div', { className: 'pagination-row' }, []);
  for (let page = 1; page <= result.totalPages; page += 1) {
    const button = el('button', {
      className: page === result.page ? 'button button-primary' : 'button button-secondary',
      type: 'button',
      text: String(page),
    });
    button.addEventListener('click', () => {
      params.set('page', String(page));
      redirectTo(`${APP_CONFIG.routeMap.movies}?${params.toString()}`);
    });
    pagination.appendChild(button);
  }

  root.replaceChildren(
    createShell(
      'movies',
      createHero({
        eyebrow: 'Movie browser',
        title: 'Filter, sort, and plan your next show',
        description: 'Use the filters to narrow by language, genre, date, or rating and continue into booking.',
        image: '/images/pexels-donaldtong94-109669.jpg',
        chips: ['Pagination', 'Search', 'Wishlist persistence'],
      }),
      [filterBar, createSection('Showing now', `${result.total} movie results`, el('div', {}, [grid, pagination]))]
    )
  );
}

function renderDetailsPage() {
  const slug = resolveMovieSlug();
  const { movie, shows } = getMovieDetails(slug);
  const user = getCurrentUser();
  const favoriteIds = favoriteIdsForUser(user);
  markMovieViewed(movie.id);

  setDocumentMeta({
    title: `${movie.title} | ShowBookie`,
    description: movie.synopsis,
  });

  const showsByDate = shows.reduce((map, show) => {
    const key = new Date(show.startTime).toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(show);
    return map;
  }, new Map());
  const activeDate = new URLSearchParams(window.location.search).get('date') || [...showsByDate.keys()][0];

  const dateTabs = el(
    'div',
    { className: 'date-tabs' },
    [...showsByDate.keys()].map((dateKey) => {
      const button = el('button', {
        className: dateKey === activeDate ? 'button button-primary' : 'button button-secondary',
        type: 'button',
        text: formatDate(dateKey),
      });
      button.addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);
        params.set('movie', movie.slug);
        params.set('date', dateKey);
        redirectTo(`${APP_CONFIG.routeMap.details}?${params.toString()}`);
      });
      return button;
    })
  );

  const showCards = (showsByDate.get(activeDate) || []).map((show) =>
    el('article', { className: 'show-card' }, [
      el('div', { className: 'show-card-copy' }, [
        el('h3', { text: show.theater.name }),
        el('p', { text: `${show.screenName} · ${show.format} · ${formatDateTime(show.startTime)}` }),
        el('small', { text: `${show.occupancy.occupancyRate}% occupied` }),
      ]),
      el('a', { href: `${APP_CONFIG.routeMap.seats}?showId=${show.id}`, className: 'button button-primary', text: 'Select seats' }),
    ])
  );

  const detailsSection = createSection(
    'Movie details',
    movie.synopsis,
    el('div', { className: 'details-grid' }, [
      createDetailList([
        ['Language', movie.language],
        ['Genres', movie.genres.join(', ')],
        ['Duration', `${movie.durationMinutes} min`],
        ['Certificate', movie.certificate],
        ['Rating', `${movie.rating}/10`],
      ]),
      el('div', { className: 'card-surface nested-surface' }, [
        el('h3', { text: 'Cast' }),
        el('p', { text: movie.cast.join(', ') || 'Cast not available' }),
        el('div', { className: 'chip-row' }, movie.tags.map((tag) => el('span', { className: 'chip', text: tag }))),
      ]),
    ])
  );

  const favoriteButton = el('button', {
    className: favoriteIds.has(movie.id) ? 'button button-ghost active' : 'button button-ghost',
    type: 'button',
    text: favoriteIds.has(movie.id) ? 'Wishlisted' : 'Add to wishlist',
  });
  favoriteButton.addEventListener('click', () => {
    try {
      toggleFavorite(movie.id);
      renderApp();
    } catch (error) {
      showToast({ title: 'Sign in required', message: error.message, type: 'error' });
      redirectTo(nextUrlAfterLogin());
    }
  });

  root.replaceChildren(
    createShell(
      'details',
      createHero({
        eyebrow: movie.votesLabel,
        title: movie.title,
        description: movie.synopsis,
        image: movie.heroImage,
        chips: [movie.language, ...movie.genres, `${movie.rating}/10`],
        actions: [
          { href: `${APP_CONFIG.routeMap.seats}?showId=${shows[0]?.id || ''}`, label: 'Book this movie' },
          { href: APP_CONFIG.routeMap.movies, label: 'Back to browse', kind: 'secondary' },
        ],
      }),
      [
        createSection(
          'Pick a date and showtime',
          'Seat availability and pricing update for each show.',
          el('div', {}, [dateTabs, favoriteButton, ...(showCards.length ? showCards : [createStatusState('empty', 'No shows found', 'No shows are scheduled for the selected date.')])])
        ),
        detailsSection,
      ]
    )
  );
}

function buildSeatGrid(show, selectedSeats, onSeatToggle) {
  return el(
    'div',
    { className: 'seat-sections' },
    show.seatMap.sections.map((section) =>
      el('section', { className: 'seat-section' }, [
        el('div', { className: 'section-heading' }, [
          el('h3', { text: `${section.label} · ${formatCurrency(section.price)}` }),
          el('p', { text: `${section.rows.length * section.seatsPerRow} seats` }),
        ]),
        el(
          'div',
          { className: 'seat-grid', attrs: { role: 'grid', 'aria-label': `${section.label} seat grid` } },
          section.rows.map((row) =>
            el('div', { className: 'seat-row' }, [
              el('span', { className: 'seat-row-label', text: row }),
              el(
                'div',
                { className: 'seat-row-buttons' },
                Array.from({ length: section.seatsPerRow }, (_, index) => {
                  const seatId = `${row}${index + 1}`;
                  const reserved = show.reservedSeats.includes(seatId);
                  const selected = selectedSeats.includes(seatId);
                  const button = el('button', {
                    className: `seat-button ${reserved ? 'reserved' : selected ? 'selected' : 'available'}`,
                    type: 'button',
                    text: String(index + 1),
                    attrs: {
                      role: 'gridcell',
                      'aria-pressed': String(selected),
                      'aria-label': `${seatId} ${reserved ? 'reserved' : selected ? 'selected' : 'available'}`,
                    },
                    disabled: reserved,
                  });
                  button.addEventListener('click', () => onSeatToggle(seatId));
                  return button;
                })
              ),
            ])
          )
        ),
      ])
    )
  );
}

function renderSeatsPage() {
  const show = getShowById(resolveShowId());
  if (!show) {
    root.replaceChildren(createShell('seats', null, [createStatusState('error', 'Show not found', 'Return to the movie details page and choose another show.')]));
    return;
  }

  setDocumentMeta({
    title: `Select Seats | ${show.movie.title} | ShowBookie`,
    description: 'Choose seats with real-time totals, locked seats, and per-section pricing.',
  });

  let selectedSeats = getBookingDraft()?.showId === show.id ? [...getBookingDraft().selectedSeats] : [];

  const renderSeatView = () => {
    const summary = calculateBookingPricing({
      selectedSeats,
      seatMap: show.seatMap,
      promo: null,
      promoCode: '',
    });
    const seatCountNote = selectedSeats.length
      ? `${selectedSeats.length}/${APP_CONFIG.seatCapPerBooking} seats selected`
      : `Choose up to ${APP_CONFIG.seatCapPerBooking} seats`;
    const selectedList = selectedSeats.length
      ? el('div', { className: 'chip-row' }, selectedSeats.map((seat) => el('span', { className: 'chip', text: seat })))
      : createEmptyGridMessage('No seats selected yet.');

    const section = createSection(
      'Seat selection',
      `${show.theater.name} · ${formatDateTime(show.startTime)} · ${show.screenName}`,
      el('div', { className: 'seat-layout-grid' }, [
        el('div', {}, [createSeatLegend(), buildSeatGrid(show, selectedSeats, onSeatToggle)]),
        el('aside', { className: 'sticky-column' }, [
          el('div', { className: 'card-surface nested-surface' }, [
            el('h3', { text: 'Selected seats' }),
            el('p', { text: seatCountNote }),
            selectedList,
            createBookingSummary(summary),
            el('div', { className: 'stack-actions' }, [
              el('button', { className: 'button button-secondary', type: 'button', text: 'Clear selected seats' }),
              el('button', {
                className: 'button button-primary',
                type: 'button',
                text: 'Continue to checkout',
                disabled: selectedSeats.length === 0,
              }),
            ]),
          ]),
        ]),
      ])
    );

    const clearButton = section.querySelector('.button-secondary');
    clearButton.addEventListener('click', () => {
      selectedSeats = [];
      renderSeatView();
    });

    const proceedButton = section.querySelector('.button-primary');
    proceedButton.addEventListener('click', () => {
      setBookingDraft({
        showId: show.id,
        selectedSeats,
        promoCode: '',
        paymentAttempt: 0,
      });
      redirectTo(APP_CONFIG.routeMap.checkout);
    });

    root.replaceChildren(
      createShell(
        'seats',
        createHero({
          eyebrow: show.movie.title,
          title: 'Choose your seats',
          description: 'Reserved seats are locked. Totals update live as you select seats.',
          image: show.movie.heroImage,
          chips: [show.theater.location, show.format, `${show.occupancy.occupancyRate}% occupied`],
        }),
        [section]
      )
    );
  };

  const onSeatToggle = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      selectedSeats = selectedSeats.filter((seat) => seat !== seatId);
      renderSeatView();
      return;
    }
    if (selectedSeats.length >= APP_CONFIG.seatCapPerBooking) {
      showToast({
        title: 'Seat limit reached',
        message: `You can book up to ${APP_CONFIG.seatCapPerBooking} seats in one order.`,
        type: 'error',
      });
      return;
    }
    selectedSeats = [...selectedSeats, seatId];
    renderSeatView();
  };

  renderSeatView();
}

function renderCheckoutPage() {
  const draft = getBookingDraft();
  const show = draft?.showId ? getShowById(draft.showId) : null;
  if (!show || !draft?.selectedSeats?.length) {
    root.replaceChildren(
      createShell('checkout', null, [
        createStatusState('error', 'Missing booking draft', 'Choose a showtime and seats before opening checkout.'),
      ])
    );
    return;
  }

  setDocumentMeta({
    title: `Checkout | ${show.movie.title} | ShowBookie`,
    description: 'Review selected seats, apply promo codes, and complete the mock payment flow.',
  });

  let promoCode = draft.promoCode || '';
  let paymentMethod = 'card';
  let paymentAttempt = Number(draft.paymentAttempt || 0);
  let paymentErrors = {};
  let statusState = null;

  const renderCheckout = () => {
    const promo = promoCode ? APP_CONFIG.promoCodes[promoCode.toUpperCase()] : null;
    const pricing = calculateBookingPricing({
      selectedSeats: draft.selectedSeats,
      seatMap: show.seatMap,
      promo,
      promoCode,
      isFirstBooking: getBookingHistory().length === 0,
    });

    const promoHelp = el('small', { className: paymentErrors.promoCode ? 'field-error' : 'field-help', text: paymentErrors.promoCode || pricing.promoMessage || 'Try POPCORN10, DATE75, or FIRSTSHOW.' });

    const cardNumber = el('input', { type: 'text', attrs: { placeholder: '4242 4242 4242 4242' } });
    const expiry = el('input', { type: 'text', attrs: { placeholder: 'MM/YY' } });
    const cvv = el('input', { type: 'text', attrs: { placeholder: '123' } });
    const upi = el('input', { type: 'text', attrs: { placeholder: 'name@bank' } });
    const wallet = el(
      'select',
      {},
      [el('option', { text: 'Select wallet', attrs: { value: '' } }), el('option', { text: 'Paytm', attrs: { value: 'paytm' } }), el('option', { text: 'PhonePe', attrs: { value: 'phonepe' } })]
    );

    const form = el('form', { className: 'payment-form card-surface' }, [
      el('h3', { text: 'Payment method' }),
      el('div', { className: 'payment-method-tabs' }, APP_CONFIG.paymentMethods.map((method) => {
        const button = el('button', {
          className: paymentMethod === method.id ? 'button button-primary' : 'button button-secondary',
          type: 'button',
          text: method.label,
        });
        button.addEventListener('click', () => {
          paymentMethod = method.id;
          paymentErrors = {};
          renderCheckout();
        });
        return button;
      })),
      createFilterField('Promo code', el('input', { type: 'text', value: promoCode, attrs: { placeholder: 'Enter promo code' } })),
      promoHelp,
      paymentMethod === 'card'
        ? el('div', { className: 'form-grid' }, [
            paymentField('Card number', cardNumber, paymentErrors.cardNumber),
            paymentField('Expiry', expiry, paymentErrors.expiry),
            paymentField('CVV', cvv, paymentErrors.cvv),
          ])
        : null,
      paymentMethod === 'upi'
        ? paymentField('UPI ID', upi, paymentErrors.upi)
        : null,
      paymentMethod === 'wallet'
        ? paymentField('Wallet', wallet, paymentErrors.wallet)
        : null,
      el('div', { className: 'field-help' }, [
        el('span', {
          text: 'Use a card ending in 0000 to simulate failure or 1111 to fail once and then recover on retry.',
        }),
      ]),
      statusState ? createStatusState(statusState.type, statusState.title, statusState.message) : null,
      el('button', { className: 'button button-primary', type: 'submit', text: 'Pay securely' }),
    ]);

    const promoInput = form.querySelector('input[type="text"]');
    promoInput.value = promoCode;
    promoInput.addEventListener('input', (event) => {
      promoCode = String(event.target.value).trim().toUpperCase();
      const validationMessage = validatePromoCode(promoCode);
      paymentErrors.promoCode = validationMessage;
      renderCheckout();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const details = {
        method: paymentMethod,
        cardNumber: cardNumber.value,
        expiry: expiry.value,
        cvv: cvv.value,
        upi: upi.value,
        wallet: wallet.value,
      };
      paymentErrors = {
        ...validatePaymentForm(details),
      };
      const promoMessage = validatePromoCode(promoCode);
      if (promoMessage) {
        paymentErrors.promoCode = promoMessage;
      }
      if (Object.keys(paymentErrors).length > 0) {
        renderCheckout();
        return;
      }

      paymentAttempt += 1;
      setBookingDraft({ ...draft, promoCode, paymentAttempt });
      statusState = { type: 'loading', title: 'Processing payment', message: 'Please wait while we confirm your transaction.' };
      renderCheckout();

      const payment = await simulatePayment(details, paymentAttempt);
      if (!payment.success) {
        statusState = {
          type: 'error',
          title: 'Payment failed',
          message: payment.failureReason,
        };
        renderCheckout();
        return;
      }

      const booking = createBooking({
        showId: show.id,
        selectedSeats: draft.selectedSeats,
        promoCode,
        paymentMethod,
        transactionId: payment.transactionId,
      });
      clearBookingDraft();
      showToast({ title: 'Payment successful', message: 'Your booking is confirmed.', type: 'success' });
      redirectTo(`${APP_CONFIG.routeMap.confirmation}?bookingId=${booking.id}`);
    });

    const content = createSection(
      'Checkout',
      `${show.movie.title} · ${show.theater.name} · ${formatDateTime(show.startTime)}`,
      el('div', { className: 'checkout-grid' }, [
        el('div', { className: 'card-surface nested-surface' }, [
          el('h3', { text: 'Order details' }),
          el('p', { text: `Seats: ${draft.selectedSeats.join(', ')}` }),
          el('p', { text: `Screen: ${show.screenName} · ${show.format}` }),
        ]),
        form,
        createBookingSummary(pricing),
      ])
    );

    root.replaceChildren(
      createShell(
        'checkout',
        createHero({
          eyebrow: 'Secure mock checkout',
          title: 'Review and pay',
          description: 'Promo, tax, and convenience fee are calculated live before confirmation.',
          image: show.movie.heroImage,
          chips: [show.movie.language, `${draft.selectedSeats.length} seats`, paymentMethod.toUpperCase()],
        }),
        [content]
      )
    );
  };

  renderCheckout();
}

function paymentField(label, input, error) {
  return el('label', { className: 'field-group' }, [
    el('span', { text: label }),
    input,
    error ? el('small', { className: 'field-error', text: error }) : el('small', { className: 'field-help', text: ' ' }),
  ]);
}

function findBookingById(bookingId) {
  return getBookingHistory().find((booking) => booking.id === bookingId) || getBookingHistory()[0] || null;
}

function buildTicketDownloadHtml(booking) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${booking.movie.title} Ticket</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .ticket{border:2px solid #111;padding:24px;max-width:680px;margin:auto} .row{display:flex;justify-content:space-between;margin:8px 0} pre{background:#f4f4f4;padding:12px;display:inline-block}</style></head><body><div class="ticket"><h1>${booking.movie.title}</h1><p>${booking.theater.name} · ${formatDateTime(booking.showStartTime)}</p><div class="row"><strong>Seats</strong><span>${booking.selectedSeats.join(', ')}</span></div><div class="row"><strong>Booking code</strong><span>${booking.bookingCode}</span></div><div class="row"><strong>Total</strong><span>${formatCurrency(booking.total)}</span></div><pre>${booking.bookingCode.match(/.{1,6}/g).join('\n')}</pre></div></body></html>`;
}

function renderConfirmationPage() {
  const bookingId = new URLSearchParams(window.location.search).get('bookingId') || '';
  const booking = findBookingById(bookingId);
  if (!booking) {
    root.replaceChildren(createShell('confirmation', null, [createStatusState('error', 'Booking not found', 'Open booking history to view your confirmed tickets.')]));
    return;
  }

  setDocumentMeta({
    title: `Booking Confirmed | ${booking.movie.title} | ShowBookie`,
    description: 'Your booking is confirmed. View the ticket, booking code, and print-friendly details.',
  });

  const ticket = createSection(
    'Your ticket',
    `Confirmation generated on ${formatDateTime(booking.createdAt)}`,
    el('div', { className: 'ticket-layout' }, [
      el('div', { className: 'card-surface nested-surface ticket-surface', attrs: { id: 'ticket-print-area' } }, [
        el('h3', { text: booking.movie.title }),
        el('p', { text: `${booking.theater.name} · ${booking.screenName || booking.seatMap.name}` }),
        el('p', { text: formatDateTime(booking.showStartTime) }),
        el('p', { text: `Seats: ${booking.selectedSeats.join(', ')}` }),
        el('p', { text: `Transaction: ${booking.transactionId}` }),
      ]),
      createBookingSummary(booking, booking.bookingCode),
    ]),
    [
      el('button', { className: 'button button-primary', type: 'button', text: 'Print ticket' }),
      el('button', { className: 'button button-secondary', type: 'button', text: 'Download ticket HTML' }),
    ]
  );

  const [printButton, downloadButton] = ticket.querySelectorAll('.inline-actions .button');
  printButton?.addEventListener('click', () => window.print());
  downloadButton?.addEventListener('click', () => {
    const blob = new Blob([buildTicketDownloadHtml(booking)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${booking.bookingCode}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  root.replaceChildren(
    createShell(
      'confirmation',
      createHero({
        eyebrow: 'Booking confirmed',
        title: booking.movie.title,
        description: 'Your ticket is ready to print or download.',
        image: booking.movie.heroImage,
        chips: [booking.bookingCode, booking.paymentStatus, formatCurrency(booking.total)],
        actions: [
          { href: APP_CONFIG.routeMap.history, label: 'View booking history' },
          { href: APP_CONFIG.routeMap.home, label: 'Back to home', kind: 'secondary' },
        ],
      }),
      [ticket]
    )
  );
}

function renderHistoryPage() {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    search: params.get('search') || '',
    status: params.get('status') || '',
  };
  const bookings = getBookingHistory(filters);

  setDocumentMeta({
    title: 'Booking History | ShowBookie',
    description: 'Search, filter, print, or cancel eligible ShowBookie bookings from one history screen.',
  });

  const searchInput = el('input', { type: 'search', value: filters.search, attrs: { placeholder: 'Search by movie, theater, or booking code' } });
  const statusSelect = el(
    'select',
    {},
    [
      el('option', { text: 'All statuses', attrs: { value: '' } }),
      el('option', { text: 'Confirmed', attrs: { value: 'confirmed' } }),
      el('option', { text: 'Cancelled', attrs: { value: 'cancelled' } }),
    ]
  );
  statusSelect.value = filters.status;
  const runSearch = () => {
    const next = new URLSearchParams();
    if (searchInput.value.trim()) next.set('search', searchInput.value.trim());
    if (statusSelect.value) next.set('status', statusSelect.value);
    redirectTo(`${APP_CONFIG.routeMap.history}${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const cards = bookings.length
    ? el(
        'div',
        { className: 'history-stack' },
        bookings.map((booking) => {
          const card = el('article', { className: 'booking-card card-surface' }, [
            el('div', { className: 'booking-card-header' }, [
              el('div', {}, [
                el('h3', { text: booking.movie.title }),
                el('p', { text: `${booking.theater.name} · ${formatDateTime(booking.showStartTime)}` }),
              ]),
              el('span', { className: `status-pill ${booking.status}`, text: booking.status }),
            ]),
            createDetailList([
              ['Seats', booking.selectedSeats.join(', ')],
              ['Booking code', booking.bookingCode],
              ['Paid', formatCurrency(booking.total)],
              ['Created', formatDateTime(booking.createdAt)],
            ]),
            el('div', { className: 'inline-actions' }, [
              el('a', { href: `${movieHref(booking.movie)}`, className: 'button button-secondary', text: 'Book again' }),
              el('a', { href: `${APP_CONFIG.routeMap.confirmation}?bookingId=${booking.id}`, className: 'button button-secondary', text: 'Open ticket' }),
              el('button', {
                className: 'button button-primary',
                type: 'button',
                text: canCancelBooking(booking) ? 'Cancel booking' : 'Cancellation closed',
                disabled: !canCancelBooking(booking),
                dataset: { action: 'cancel', bookingId: booking.id },
              }),
            ]),
          ]);
          return card;
        })
      )
    : createStatusState('empty', 'No bookings found', 'Your confirmed and cancelled tickets will appear here.');

  cards.querySelectorAll?.('[data-action="cancel"]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal({
        title: 'Cancel booking',
        body: el('p', { text: 'This will release the seats and mark the refund as pending in the mock flow.' }),
        actions: [
          {
            label: 'Keep booking',
            className: 'button button-secondary',
            onClick: () => closeModal(),
          },
          {
            label: 'Confirm cancellation',
            className: 'button button-primary',
            onClick: () => {
              closeModal();
              try {
                cancelBooking(button.dataset.bookingId);
                showToast({ title: 'Booking cancelled', message: 'The booking has been updated successfully.', type: 'success' });
                renderApp();
              } catch (error) {
                showToast({ title: 'Cancellation unavailable', message: error.message, type: 'error' });
              }
            },
          },
        ],
      });
    });
  });

  root.replaceChildren(
    createShell(
      'history',
      createHero({
        eyebrow: 'Your tickets',
        title: 'Booking history',
        description: 'Search, filter, open tickets, and cancel bookings within the mock cancellation window.',
        image: '/images/pexels-felipe-cardoso-861539-1764338.jpg',
        chips: ['Search', 'Filters', 'Cancellation policy'],
      }),
      [
        el('div', { className: 'filters-grid card-surface' }, [
          createFilterField('Search', searchInput),
          createFilterField('Status', statusSelect),
          el('div', { className: 'field-group' }, [
            el('span', { text: 'Apply filters' }),
            el('button', { className: 'button button-primary', type: 'button', text: 'Update list' }),
          ]),
        ]),
        createSection('All bookings', `${bookings.length} result(s)`, cards),
      ]
    )
  );
  root.querySelector('.filters-grid .button-primary').addEventListener('click', runSearch);
}

function renderProfilePage() {
  const user = getCurrentUser();
  const bookings = getBookingHistory();
  const totalSpent = bookings.reduce((sum, booking) => sum + booking.total, 0);
  const upcoming = bookings.filter((booking) => booking.status === 'confirmed' && new Date(booking.showStartTime) > new Date()).length;
  const favoriteMovie = getWishlistMovies()[0];

  setDocumentMeta({
    title: 'Profile | ShowBookie',
    description: 'Manage profile details, theme, language preference, and review your booking stats.',
  });

  const nameInput = el('input', { type: 'text', value: user.name });
  const phoneInput = el('input', { type: 'text', value: user.phone || '' });
  const localeSelect = el(
    'select',
    {},
    APP_CONFIG.supportedLocales.map((code) => el('option', { text: code.toUpperCase(), attrs: { value: code } }))
  );
  localeSelect.value = user.locale || getLocalePreference();

  const formState = el('p', { className: 'field-help', text: 'Save profile preferences to update future sessions.' });
  const form = el('form', { className: 'card-surface nested-surface' }, [
    paymentField('Full name', nameInput, ''),
    paymentField('Phone', phoneInput, ''),
    paymentField('Preferred locale', localeSelect, ''),
    formState,
    el('button', { className: 'button button-primary', type: 'submit', text: 'Save profile' }),
  ]);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phoneError = validatePhone(phoneInput.value);
    if (phoneError) {
      formState.textContent = phoneError;
      formState.className = 'field-error';
      return;
    }
    updateProfile({ name: nameInput.value, phone: phoneInput.value, locale: localeSelect.value });
    await loadLocale(localeSelect.value);
    formState.textContent = 'Profile updated successfully.';
    formState.className = 'field-help';
    showToast({ title: 'Profile saved', message: 'Your preferences were updated.', type: 'success' });
    renderApp();
  });

  root.replaceChildren(
    createShell(
      'profile',
      createHero({
        eyebrow: user.email,
        title: user.name,
        description: 'Manage your profile, language, and booking preferences.',
        image: '/images/movie4.jpeg',
        chips: [user.role, `${bookings.length} bookings`, `${upcoming} upcoming`],
      }),
      [
        createSection(
          'Account snapshot',
          'A quick overview of your recent activity.',
          el('div', { className: 'stats-grid' }, [
            statCard('Total bookings', String(bookings.length)),
            statCard('Upcoming shows', String(upcoming)),
            statCard('Total spent', formatCurrency(totalSpent)),
            statCard('Top wishlist pick', favoriteMovie ? favoriteMovie.title : 'None yet'),
          ])
        ),
        createSection('Profile settings', 'Edit lightweight profile fields stored in localStorage.', form),
      ]
    )
  );
}

function statCard(label, value) {
  return el('div', { className: 'stat-card' }, [el('span', { text: label }), el('strong', { text: value })]);
}

function renderHelpPage(page) {
  const titleMap = {
    about: 'About ShowBookie',
    contact: 'Contact and help',
    help: 'Support center',
    faq: 'Frequently asked questions',
    terms: 'Terms of service',
    privacy: 'Privacy policy',
    cancellation: 'Cancellation policy',
  };

  const descriptions = {
    about: 'Learn the story behind ShowBookie, what we care about, and how to reach our team.',
    contact: 'Reach the support team or send a help request using the form below.',
    help: 'Find support options, emergency contacts, and quick answers for booking or payment issues.',
    faq: 'Answers to the most common questions across booking, payments, and cancellations.',
    terms: 'Static placeholder terms for this demo deployment.',
    privacy: 'Privacy summary for this client-side demo app.',
    cancellation: 'Mock cancellation rules used by the booking history flow.',
  };

  setDocumentMeta({
    title: `${titleMap[page]} | ShowBookie`,
    description: descriptions[page],
  });

  const sections = [];

  if (page === 'about') {
    sections.push(
      createSection(
        'Our story',
        'Why ShowBookie exists and what we want every moviegoer to feel.',
        el('div', { className: 'about-story-layout' }, [
          el('div', { className: 'about-story-copy' }, [
            el('p', {
              text: 'ShowBookie started with a simple idea: booking a movie should feel as easy and enjoyable as deciding what to watch. We wanted a place where people could browse quickly, compare showtimes without friction, and move from discovery to checkout without losing momentum.',
            }),
            el('p', {
              text: 'Our mission is to make every outing smoother, whether you are planning a weekend with friends, a family matinee, or a last-minute solo show after work. We focus on clarity, speed, and a welcoming experience that works just as well on a phone as it does on a larger screen.',
            }),
            el('p', {
              text: 'Behind the scenes, ShowBookie is designed around practical details people care about: easy seat selection, straightforward pricing, quick access to tickets, and support that feels human when plans change.',
            }),
          ]),
          el('div', { className: 'about-contact-card card-surface nested-surface' }, [
            el('h3', { text: 'Visit or contact us' }),
            createDetailList([
              ['Address', '214 Crescent Arcade, Lakeview Road, Nungambakkam, Chennai 600034'],
              ['Email', 'hello@showbookie.in'],
              ['Phone', '+91 44 4012 8899'],
              ['Business hours', 'Mon-Sat, 9:00 AM to 7:00 PM'],
            ]),
          ]),
        ])
      ),
      createSection(
        'Our values',
        'A few principles that shape the product experience.',
        el('div', { className: 'feature-grid' }, [
          infoCard('Clarity first', 'From pricing to seat selection, every interaction should feel obvious and trustworthy.'),
          infoCard('Time matters', 'We remove unnecessary steps so users can complete bookings with confidence and speed.'),
          infoCard('People over process', 'Support, cancellation handling, and account tools should reduce stress instead of adding to it.'),
        ])
      ),
      createSection(
        'Contact block',
        'If you need help with a ticket, account, or refund question, our support desk is ready to help.',
        el('div', { className: 'feature-grid' }, [
          infoCard('Support desk', 'hello@showbookie.in'),
          infoCard('Call us', '+91 44 4012 8899'),
          infoCard('Office hours', 'Monday to Saturday, 9:00 AM to 7:00 PM'),
        ])
      )
    );
  }

  if (page === 'contact' || page === 'help') {
    const nameInput = el('input', { type: 'text', attrs: { placeholder: 'Your name' } });
    const emailInput = el('input', { type: 'email', attrs: { placeholder: 'you@example.com' } });
    const messageInput = el('textarea', { attrs: { rows: '5', placeholder: 'Tell us about the issue' } });
    const formState = el('p', { className: 'field-help', text: `Support: ${APP_CONFIG.supportEmail} · ${APP_CONFIG.supportPhone}` });
    const form = el('form', { className: 'card-surface nested-surface' }, [
      paymentField('Name', nameInput, ''),
      paymentField('Email', emailInput, ''),
      paymentField('Message', messageInput, ''),
      formState,
      el('button', { className: 'button button-primary', type: 'submit', text: 'Send request' }),
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const errors = validateContactForm({ name: nameInput.value, email: emailInput.value, message: messageInput.value });
      if (Object.keys(errors).length > 0) {
        formState.textContent = Object.values(errors)[0];
        formState.className = 'field-error';
        return;
      }
      submitSupportRequest({ name: nameInput.value, email: emailInput.value, message: messageInput.value });
      form.reset();
      formState.textContent = 'Thanks. Your request was saved locally in the mock backend.';
      formState.className = 'field-help';
      showToast({ title: 'Request sent', message: 'Support request saved successfully.', type: 'success' });
    });

    sections.push(
      createSection(
        page === 'contact' ? 'Contact us' : 'Support channels',
        'Use the form for help with bookings, refunds, failed payments, or accessibility concerns.',
        form
      ),
      createSection(
        'Emergency contacts',
        'For this demo, contact information is static.',
        el('div', { className: 'feature-grid' }, [
          infoCard('Customer support', '+91 12345 67890'),
          infoCard('Technical support', '+91 98765 43210'),
          infoCard('Corporate office', 'Plot No. 1, Sector 18, Gurugram, Haryana 122015'),
        ])
      )
    );
  }

  if (page === 'faq') {
    sections.push(
      createSection(
        'FAQ',
        'Quick answers to common product questions.',
        el('div', { className: 'faq-list' }, [
          faqItem('How do I simulate a failed payment?', 'Use a card ending in 0000. A card ending in 1111 fails once and succeeds on retry.'),
          faqItem('Where are my bookings stored?', 'Bookings persist in localStorage through the normalized mock backend.'),
          faqItem('Can I cancel any booking?', `Only before ${APP_CONFIG.policies.cancellationHours} hours of showtime in this mock policy.`),
          faqItem('How do I access the admin panel?', 'Admin access is reserved for locally configured development roles and is not surfaced in the public sign-in UI.'),
        ])
      )
    );
  }

  if (page === 'terms' || page === 'privacy' || page === 'cancellation') {
    const text = {
      terms: [
        'This repository is a demonstration project and does not process real ticket inventory or payments.',
        'All payment outcomes, offers, and booking confirmations are mock flows stored locally in the browser.',
      ],
      privacy: [
        'All user data persists only in localStorage on the current browser unless you integrate a real backend.',
        'No analytics, cookies, or third-party trackers are bundled by default in this upgraded repo.',
      ],
      cancellation: [
        `Confirmed bookings may be cancelled up to ${APP_CONFIG.policies.cancellationHours} hours before showtime.`,
        'Cancelled bookings release the seats immediately and mark the refund status as pending in the mock history screen.',
      ],
    };
    sections.push(
      createSection(
        titleMap[page],
        descriptions[page],
        el('div', { className: 'policy-copy' }, text[page].map((item) => el('p', { text: item })))
      )
    );
  }

  root.replaceChildren(
    createShell(
      page,
      createHero({
        eyebrow: page === 'about' ? 'Who we are' : 'Support and policies',
        title: titleMap[page],
        description: descriptions[page],
        image: '/images/pexels-felipe-cardoso-861539-1764338.jpg',
        chips: page === 'about' ? ['Story', 'Support', 'Values'] : ['Accessible', 'Static', 'Deployment-friendly'],
      }),
      sections
    )
  );
}

function faqItem(question, answer) {
  return el('details', { className: 'faq-item' }, [el('summary', { text: question }), el('p', { text: answer })]);
}

function renderAdminPage() {
  const snapshot = loadAdminDashboard();

  setDocumentMeta({
    title: 'Admin | ShowBookie',
    description: 'Manage movies, shows, seat layouts, and review mock revenue and occupancy metrics.',
  });

  const movieFormState = el('p', { className: 'field-help', text: 'Create or update a movie entry.' });
  const movieTitle = el('input', { type: 'text', attrs: { placeholder: 'Movie title' } });
  const movieSlug = el('input', { type: 'text', attrs: { placeholder: 'movie-slug' } });
  const movieLanguage = el('input', { type: 'text', attrs: { placeholder: 'Language' } });
  const movieGenres = el('input', { type: 'text', attrs: { placeholder: 'Genres comma separated' } });
  const movieImage = el('input', { type: 'text', attrs: { placeholder: '/images/movie1.jpeg' } });
  const movieSynopsis = el('textarea', { attrs: { rows: '4', placeholder: 'Movie synopsis' } });
  const movieForm = el('form', { className: 'card-surface nested-surface' }, [
    el('div', { className: 'form-grid' }, [
      paymentField('Title', movieTitle, ''),
      paymentField('Slug', movieSlug, ''),
      paymentField('Language', movieLanguage, ''),
      paymentField('Genres', movieGenres, ''),
      paymentField('Poster path', movieImage, ''),
    ]),
    paymentField('Synopsis', movieSynopsis, ''),
    movieFormState,
    el('button', { className: 'button button-primary', type: 'submit', text: 'Save movie' }),
  ]);
  movieForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = saveAdminMovie({
      title: movieTitle.value,
      slug: movieSlug.value,
      language: movieLanguage.value,
      genres: movieGenres.value,
      image: movieImage.value,
      heroImage: movieImage.value,
      synopsis: movieSynopsis.value,
    });
    if (!result.ok) {
      movieFormState.textContent = Object.values(result.errors)[0];
      movieFormState.className = 'field-error';
      return;
    }
    showToast({ title: 'Movie saved', message: `${result.movie.title} was updated.`, type: 'success' });
    renderApp();
  });

  const showFormState = el('p', { className: 'field-help', text: 'Add a new showtime for an existing movie.' });
  const showMovieSelect = el('select', {}, snapshot.movies.map((movie) => el('option', { text: movie.title, attrs: { value: movie.id } })));
  const showTheaterSelect = el('select', {}, snapshot.theaters.map((theater) => el('option', { text: theater.name, attrs: { value: theater.id } })));
  const showSeatMapSelect = el('select', {}, snapshot.seatMaps.map((seatMap) => el('option', { text: seatMap.name, attrs: { value: seatMap.id } })));
  const showStartTime = el('input', { type: 'datetime-local' });
  const showScreen = el('input', { type: 'text', attrs: { placeholder: 'Screen 1' } });
  const showFormat = el('input', { type: 'text', attrs: { placeholder: '2D / IMAX' } });
  const showForm = el('form', { className: 'card-surface nested-surface' }, [
    el('div', { className: 'form-grid' }, [
      paymentField('Movie', showMovieSelect, ''),
      paymentField('Theater', showTheaterSelect, ''),
      paymentField('Seat layout', showSeatMapSelect, ''),
      paymentField('Start time', showStartTime, ''),
      paymentField('Screen', showScreen, ''),
      paymentField('Format', showFormat, ''),
    ]),
    showFormState,
    el('button', { className: 'button button-primary', type: 'submit', text: 'Save show' }),
  ]);
  showForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveAdminShow({
      movieId: showMovieSelect.value,
      theaterId: showTheaterSelect.value,
      seatMapId: showSeatMapSelect.value,
      startTime: showStartTime.value || new Date().toISOString(),
      screenName: showScreen.value,
      format: showFormat.value,
    });
    showToast({ title: 'Show saved', message: 'The new showtime is now available in the movie flow.', type: 'success' });
    renderApp();
  });

  const movieList = el(
    'div',
    { className: 'history-stack' },
    snapshot.movies.map((movie) =>
      el('article', { className: 'booking-card card-surface' }, [
        el('div', { className: 'booking-card-header' }, [
          el('div', {}, [el('h3', { text: movie.title }), el('p', { text: `${movie.language} · ${movie.genres.join(', ')}` })]),
          el('button', { className: 'button button-secondary', type: 'button', text: 'Delete', dataset: { action: 'delete-movie', movieId: movie.id } }),
        ]),
      ])
    )
  );

  movieList.querySelectorAll('[data-action="delete-movie"]').forEach((button) => {
    button.addEventListener('click', () => {
      removeAdminMovie(button.dataset.movieId);
      renderApp();
    });
  });

  const showList = el(
    'div',
    { className: 'history-stack' },
    snapshot.shows.map((show) =>
      el('article', { className: 'booking-card card-surface' }, [
        el('div', { className: 'booking-card-header' }, [
          el('div', {}, [el('h3', { text: show.movie.title }), el('p', { text: `${show.theater.name} · ${formatDateTime(show.startTime)}` })]),
          el('button', { className: 'button button-secondary', type: 'button', text: 'Delete', dataset: { action: 'delete-show', showId: show.id } }),
        ]),
      ])
    )
  );
  showList.querySelectorAll('[data-action="delete-show"]').forEach((button) => {
    button.addEventListener('click', () => {
      removeAdminShow(button.dataset.showId);
      renderApp();
    });
  });

  root.replaceChildren(
    createShell(
      'admin',
      createHero({
        eyebrow: 'Admin controls',
        title: 'Manage content and monitor performance',
        description: 'CRUD tools for movies and shows, with simple revenue and occupancy dashboard cards.',
        image: '/images/pexels-donaldtong94-109669.jpg',
        chips: ['Mock auth', 'CRUD', 'Occupancy dashboard'],
      }),
      [
        createSection(
          'Dashboard metrics',
          'All figures are calculated from the persisted mock store.',
          el('div', { className: 'stats-grid' }, [
            statCard('Bookings', String(snapshot.metrics.totalBookings)),
            statCard('Revenue', formatCurrency(snapshot.metrics.revenue)),
            statCard('Occupancy', `${snapshot.metrics.occupancy}%`),
            statCard('Live shows', String(snapshot.metrics.shows)),
          ])
        ),
        createSection('Movie management', 'Create, update, or delete movies.', el('div', { className: 'admin-grid' }, [movieForm, movieList])),
        createSection('Show management', 'Create or remove showtimes, screen formats, and seat layouts.', el('div', { className: 'admin-grid' }, [showForm, showList])),
      ]
    )
  );
}

async function renderApp() {
  applyThemeToDocument();
  const page = getPage();
  const user = getCurrentUser();

  if (page === 'login' && user) {
    redirectTo(APP_CONFIG.routeMap.home);
    return;
  }
  if (protectedPages.has(page) && !user) {
    redirectTo(nextUrlAfterLogin());
    return;
  }
  if (page === 'admin' && user?.role !== 'admin') {
    root.replaceChildren(createShell('admin', null, [createStatusState('error', 'Admin access required', 'This page is reserved for locally configured admin accounts.')]));
    return;
  }

  try {
    if (page === 'login') return renderAuthPage();
    if (page === 'home') return renderHomePage();
    if (page === 'movies') return renderMoviesPage();
    if (page === 'details') return renderDetailsPage();
    if (page === 'seats') return renderSeatsPage();
    if (page === 'checkout') return renderCheckoutPage();
    if (page === 'confirmation') return renderConfirmationPage();
    if (page === 'history') return renderHistoryPage();
    if (page === 'profile') return renderProfilePage();
    if (page === 'admin') return renderAdminPage();
    if (['about', 'contact', 'help', 'faq', 'terms', 'privacy', 'cancellation'].includes(page)) {
      return renderHelpPage(page);
    }
    root.replaceChildren(createShell(page, null, [createStatusState('error', 'Page not found', 'This page is not wired into the app shell.')]));
  } catch (error) {
    console.error(error);
    root.replaceChildren(createShell(page, null, [createStatusState('error', 'Unexpected error', error.message || 'An unexpected error occurred.')]));
  }
}

async function bootstrap() {
  initializeMockDb();
  await loadLocale(getLocalePreference());
  applyThemeToDocument();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
  renderApp();
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-action="logout"]');
  if (link) {
    event.preventDefault();
    logoutUser();
    showToast({ title: 'Signed out', message: 'You have been logged out successfully.', type: 'info' });
    redirectTo(APP_CONFIG.routeMap.login);
  }
});

bootstrap();
