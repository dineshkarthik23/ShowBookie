(function () {
  const listRoot = document.getElementById('booking-list');
  if (!listRoot) {
    return;
  }

  function toCurrency(value) {
    const amount = Number(value || 0);
    return `Rs.${amount.toFixed(2)}`;
  }

  function toDisplayDate(value) {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function statusClass(statusText) {
    const status = String(statusText || '').toLowerCase();
    if (status.includes('cancel') || status.includes('refund') || status.includes('fail')) {
      return 'status-cancelled';
    }
    return 'status-confirmed';
  }

  function renderEmptyState() {
    listRoot.innerHTML = '<div class="empty-state">No bookings yet for this account.</div>';
  }

  function renderBookings(bookings) {
    if (!Array.isArray(bookings) || bookings.length === 0) {
      renderEmptyState();
      return;
    }

    listRoot.innerHTML = bookings.map((booking) => {
      const safeStatus = booking.PaymentStatus || 'Completed';
      return `
        <article class="booking-card">
          <div class="booking-header">
            <div class="booking-title">Booking #${booking.BookingID}</div>
            <div class="booking-status ${statusClass(safeStatus)}">${safeStatus}</div>
          </div>
          <div class="booking-details">
            <p><strong>Movie:</strong> ${booking.MovieTitle || 'N/A'}</p>
            <p><strong>Theater:</strong> ${booking.TheaterName || 'N/A'}</p>
            <p><strong>Showtime:</strong> ${toDisplayDate(booking.ShowTime)}</p>
            <p><strong>Booked On:</strong> ${toDisplayDate(booking.BookingDate)}</p>
            <p><strong>Seats:</strong> ${booking.Seats || 'N/A'}</p>
            <p><strong>Total Seats:</strong> ${booking.TotalSeats || 0}</p>
            <p><strong>Total Paid:</strong> ${toCurrency(booking.TotalPrice)}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadBookings() {
    try {
      const response = await fetch('/api/bookings');
      if (response.status === 401) {
        window.location.href = '/';
        return;
      }
      if (!response.ok) {
        renderEmptyState();
        return;
      }

      const data = await response.json();
      renderBookings(data.bookings || []);
    } catch (error) {
      console.error('Error loading booking history:', error);
      renderEmptyState();
    }
  }

  loadBookings();
})();
