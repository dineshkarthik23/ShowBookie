import assert from 'node:assert/strict';

import {
  sanitizeText,
  validateEmail,
  validatePassword,
  validatePaymentForm,
} from '../js/validation.js';

export function runValidationTests() {
  assert.equal(validateEmail('demo@showbookie.com'), '');
  assert.equal(validateEmail('invalid-email'), 'Enter a valid email address.');

  assert.equal(validatePassword('Demo@123'), '');
  assert.equal(
    validatePassword('password'),
    'Password must include uppercase, lowercase, and a number.'
  );

  const errors = validatePaymentForm({
    method: 'card',
    cardNumber: '4242',
    expiry: '1/27',
    cvv: '12',
  });
  assert.deepEqual(errors, {
    cardNumber: 'Card number must be 16 digits.',
    expiry: 'Use MM/YY format.',
    cvv: 'CVV must be 3 digits.',
  });

  assert.equal(
    sanitizeText('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
  );
}
