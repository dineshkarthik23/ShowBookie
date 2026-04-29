import { APP_CONFIG } from './config.js';

export function getSeatCategory(seatLabel, seatMap) {
  for (const section of seatMap.sections) {
    if (section.rows.includes(seatLabel.slice(0, 1))) {
      return section;
    }
  }
  return null;
}

export function getSeatPrice(seatLabel, seatMap) {
  const category = getSeatCategory(seatLabel, seatMap);
  return category ? category.price : 0;
}

export function buildSeatMapIndex(seatMap) {
  return seatMap.sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      Array.from({ length: section.seatsPerRow }, (_, index) => ({
        id: `${row}${index + 1}`,
        row,
        number: index + 1,
        sectionKey: section.key,
        sectionLabel: section.label,
        price: section.price,
      }))
    )
  );
}

export function validateSeatSelection({
  selectedSeats,
  reservedSeats = [],
  seatMap,
  seatCap = APP_CONFIG.seatCapPerBooking,
}) {
  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return 'Select at least one seat.';
  }
  if (selectedSeats.length > seatCap) {
    return `You can book up to ${seatCap} seats in one order.`;
  }

  const validSeatIds = new Set(buildSeatMapIndex(seatMap).map((seat) => seat.id));
  const reserved = new Set(reservedSeats);

  for (const seat of selectedSeats) {
    if (!validSeatIds.has(seat)) {
      return `Seat ${seat} is not part of this layout.`;
    }
    if (reserved.has(seat)) {
      return `Seat ${seat} is no longer available.`;
    }
  }
  return '';
}

export function applyPromoCode({ code, subtotal, promo, isFirstBooking }) {
  if (!code) {
    return { discount: 0, message: '' };
  }
  if (!promo) {
    return { discount: 0, message: 'Promo code not recognized.' };
  }
  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return { discount: 0, message: `Promo is valid on orders above Rs. ${promo.minSubtotal}.` };
  }
  if (promo.firstBookingOnly && !isFirstBooking) {
    return { discount: 0, message: 'Promo applies only to your first booking.' };
  }

  let discount = promo.type === 'flat' ? promo.value : subtotal * promo.value;
  if (promo.maxDiscount) {
    discount = Math.min(discount, promo.maxDiscount);
  }

  return {
    discount: Number(discount.toFixed(2)),
    message: `${promo.code} applied successfully.`,
  };
}

export function calculateBookingPricing({
  selectedSeats,
  seatMap,
  promo,
  promoCode,
  isFirstBooking = false,
  feePerSeat = APP_CONFIG.booking.convenienceFeePerSeat,
  taxRate = APP_CONFIG.booking.taxRate,
}) {
  const subtotal = selectedSeats.reduce((total, seat) => total + getSeatPrice(seat, seatMap), 0);
  const convenienceFee = selectedSeats.length * feePerSeat;
  const promoResult = applyPromoCode({
    code: promoCode,
    subtotal,
    promo,
    isFirstBooking,
  });
  const taxableAmount = Math.max(subtotal + convenienceFee - promoResult.discount, 0);
  const tax = Number((taxableAmount * taxRate).toFixed(2));
  const total = Number((taxableAmount + tax).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    convenienceFee: Number(convenienceFee.toFixed(2)),
    discount: promoResult.discount,
    tax,
    total,
    promoMessage: promoResult.message,
  };
}

export function generateBookingCode({ bookingId, userId, showId }) {
  const compact = `${bookingId}${userId}${showId}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return compact.slice(0, 18).padEnd(18, 'X');
}

export function generateQrLikeBlock(code) {
  const normalized = code.replace(/[^A-Z0-9]/g, '');
  const chunk = 6;
  const rows = [];
  for (let index = 0; index < normalized.length; index += chunk) {
    rows.push(normalized.slice(index, index + chunk).padEnd(chunk, '#'));
  }
  return rows;
}

export function canCancelBooking(booking, now = new Date()) {
  if (!booking || booking.status === 'cancelled') {
    return false;
  }
  const cutoff = new Date(booking.showStartTime);
  cutoff.setMinutes(cutoff.getMinutes() - APP_CONFIG.booking.cancelWindowMinutes);
  return now < cutoff;
}

export function getOccupancy(seatMap, reservedSeats = []) {
  const totalSeats = buildSeatMapIndex(seatMap).length;
  const bookedSeats = reservedSeats.length;
  return {
    totalSeats,
    bookedSeats,
    occupancyRate: totalSeats ? Number(((bookedSeats / totalSeats) * 100).toFixed(1)) : 0,
  };
}
