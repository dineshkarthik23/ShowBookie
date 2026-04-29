import { APP_CONFIG } from './config.js';

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldFail(details, attemptNumber) {
  if (details.method === 'card') {
    const digits = String(details.cardNumber || '').replace(/\s+/g, '');
    if (digits.endsWith('0000')) {
      return 'This card was declined by the mock gateway.';
    }
    if (digits.endsWith('1111') && attemptNumber === 1) {
      return 'The bank timed out. Retry once to simulate recovery.';
    }
  }
  if (details.method === 'upi' && String(details.upi || '').includes('fail')) {
    return 'UPI verification failed.';
  }
  return '';
}

export async function simulatePayment(details, attemptNumber = 1) {
  await delay(APP_CONFIG.payment.simulatedDelayMs);
  const failureReason = shouldFail(details, attemptNumber);
  if (failureReason) {
    return {
      success: false,
      retryable: attemptNumber < APP_CONFIG.payment.retryLimit,
      failureReason,
      transactionId: '',
    };
  }

  return {
    success: true,
    retryable: false,
    failureReason: '',
    transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
  };
}
