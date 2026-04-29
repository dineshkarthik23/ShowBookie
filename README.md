# ShowBookie

ShowBookie is a lightweight, vanilla HTML/CSS/JS movie ticket booking app with a productionized mock-first flow. The app now runs end to end without a database dependency and keeps the existing multi-page structure while centralizing logic into reusable modules.

## What’s Included

- Auth flow with demo login, registration, route guards, and profile management
- Movie discovery with search, sort, genre/language/rating/date filters, pagination, recommendations, recently viewed, and wishlist persistence
- Movie details with grouped showtimes, occupancy hints, and seat-map-driven pricing
- Seat booking with keyboard-friendly selection, reserved seat locking, max seat cap, clear selection, and live totals
- Checkout with promo codes, tax and convenience-fee breakdown, deterministic mock payment failure/retry flows, and booking confirmation
- Booking history with search/filter, printable tickets, downloadable ticket HTML, and mock cancellation rules
- Admin panel with mock auth, dashboard metrics, and CRUD for movies and shows
- PWA basics, offline fallback, robots/sitemap, dark mode, i18n scaffolding, notifications center, and lightweight unit tests

## Demo Accounts

- User: `demo@showbookie.com` / `Demo@123`
- Admin: `admin@showbookie.com` / `Admin@123`

## Run Locally

```bash
npm install
npm start
```

Then open `http://localhost:8080`.

For local development with reload:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Architecture

Client modules live in `js/`:

- `config.js`: constants, route map, promo rules, seed data, storage keys
- `api.js`: normalized mock backend over `localStorage`
- `state.js`: session, theme, locale, and booking draft persistence
- `ui.js`: reusable UI components and formatting helpers
- `validation.js`: form validation and input sanitization
- `booking.js`: seat-category lookup, pricing, booking code generation, cancellation checks
- `payments-mock.js`: deterministic payment simulation and retry behavior
- `admin.js`: admin-specific data wrappers
- `app.js`: app bootstrap and page rendering

### Normalized Models

- `Movie`
- `Theater`
- `Show`
- `SeatMap`
- `Booking`
- `User`

These are seeded in `js/config.js` and persisted as a single mock DB payload in `localStorage`.

## App Flows

### Booking Journey

1. Sign in or create an account.
2. Browse recommended or filtered movies.
3. Open a movie, choose a showtime, and select seats.
4. Review pricing, apply a promo, and complete checkout.
5. View the confirmation ticket, print it, or download it as HTML.

### Admin Journey

1. Sign in with the admin account.
2. Open `/html/admin.html`.
3. Review dashboard cards for bookings, revenue, occupancy, movies, and shows.
4. Add or remove movies and showtimes.

## Screenshots

Placeholders for project screenshots:

- `docs/screenshots/login.png`
- `docs/screenshots/home.png`
- `docs/screenshots/seats.png`
- `docs/screenshots/checkout.png`
- `docs/screenshots/admin.png`

## Smoke Test Checklist

See [docs/SMOKE_TEST_CHECKLIST.md](docs/SMOKE_TEST_CHECKLIST.md).

## Deployment Notes

- The app is static-friendly and runs behind a small Express server for local serving.
- All persistence is local to the browser via `localStorage`.
- PWA files include `manifest.webmanifest`, `service-worker.js`, and `offline.html`.
- SEO basics include page metadata, `robots.txt`, and `sitemap.xml`.

## Known Limitations

- Auth is mock-only and stored client-side.
- Payments are simulated; no real gateway integration exists.
- The manifest currently reuses movie imagery instead of dedicated app icons.
- Admin CRUD updates the mock store only and does not sync to a real API.

## Next Roadmap

- Replace mock auth and booking persistence with a real backend
- Add dedicated app icons and richer offline caching strategies
- Expand locale coverage and translate more page content
- Add E2E browser automation for the full booking journey
