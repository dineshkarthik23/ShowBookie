import assert from 'node:assert/strict';

import { calculateBookingPricing, validateSeatSelection } from '../js/booking.js';
import { SEED_DATA } from '../js/config.js';

const standardSeatMap = SEED_DATA.seatMaps.find((seatMap) => seatMap.id === 'seatmap_standard');

export function runBookingTests() {
  const pricing = calculateBookingPricing({
    selectedSeats: ['A1', 'D2', 'H3'],
    seatMap: standardSeatMap,
    promo: { code: 'POPCORN10', type: 'percentage', value: 0.1, maxDiscount: 120 },
    promoCode: 'POPCORN10',
    isFirstBooking: false,
  });

  assert.equal(pricing.subtotal, 570);
  assert.equal(pricing.convenienceFee, 105);
  assert.equal(pricing.discount, 57);
  assert.equal(pricing.tax, 111.24);
  assert.equal(pricing.total, 729.24);

  assert.equal(
    validateSeatSelection({
      selectedSeats: ['A1'],
      reservedSeats: ['A1'],
      seatMap: standardSeatMap,
      seatCap: 6,
    }),
    'Seat A1 is no longer available.'
  );

  assert.equal(
    validateSeatSelection({
      selectedSeats: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
      reservedSeats: [],
      seatMap: standardSeatMap,
      seatCap: 6,
    }),
    'You can book up to 6 seats in one order.'
  );
}
