# Smoke Test Checklist

## Happy Path

1. Open `http://localhost:8080`.
2. Sign in with `demo@showbookie.com / Demo@123`.
3. Open a recommended movie.
4. Pick a showtime.
5. Select 2-3 seats and confirm the live total updates.
6. Continue to checkout.
7. Apply `POPCORN10`.
8. Pay with card `4242424242424242`, expiry `12/30`, CVV `123`.
9. Confirm the booking page shows a booking code and print/download controls.
10. Open booking history and verify the booking appears.

## Failure and Retry

1. Start a new booking.
2. At checkout, use card `4111111111111111`.
3. Verify the first payment fails and a second retry can succeed.
4. Repeat with `4000000000000000` and verify failure remains visible.

## Seat Rules

1. Open seat selection for a show with pre-reserved seats.
2. Verify reserved seats are disabled.
3. Try selecting more than 6 seats and confirm the cap is enforced.
4. Use “Clear selected seats” and verify selection resets.

## History and Cancellation

1. Open booking history.
2. Search by movie title or booking code.
3. Filter by confirmed/cancelled.
4. Cancel an eligible booking and verify the seat becomes available again.

## Admin

1. Sign out.
2. Sign in with `admin@showbookie.com / Admin@123`.
3. Open `/html/admin.html`.
4. Add a movie and verify it appears in the movie browser.
5. Add a show for an existing movie and verify it appears in details.
6. Delete the test movie/show and verify cleanup.

## UX, Accessibility, and Offline

1. Toggle dark mode and reload to verify persistence.
2. Change locale and reload to verify persistence.
3. Tab through the seat grid and ensure focus is visible.
4. Install the PWA if supported by the browser.
5. Disable network and confirm `offline.html` is used as fallback for uncached navigation.
