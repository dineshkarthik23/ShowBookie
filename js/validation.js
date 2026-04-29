const ESCAPE_LOOKUP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/[&<>"']/g, (char) => ESCAPE_LOOKUP[char])
    .trim();
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) {
    return 'Email is required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return '';
}

export function validatePassword(value) {
  const password = String(value ?? '');
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number.';
  }
  return '';
}

export function validateName(value) {
  const name = sanitizeText(value);
  if (!name) {
    return 'Name is required.';
  }
  if (name.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  return '';
}

export function validatePhone(value) {
  const phone = String(value ?? '').trim();
  if (!phone) {
    return '';
  }
  if (!/^[+]?[\d\s-]{10,15}$/.test(phone)) {
    return 'Enter a valid phone number.';
  }
  return '';
}

export function validatePromoCode(value) {
  if (!value) {
    return '';
  }
  if (!/^[A-Z0-9]{4,12}$/.test(String(value).trim().toUpperCase())) {
    return 'Promo codes use letters and numbers only.';
  }
  return '';
}

export function validateCardNumber(value) {
  const sanitized = String(value ?? '').replace(/\s+/g, '');
  if (!sanitized) {
    return 'Card number is required.';
  }
  if (!/^\d{16}$/.test(sanitized)) {
    return 'Card number must be 16 digits.';
  }
  return '';
}

export function validateExpiry(value) {
  const expiry = String(value ?? '').trim();
  if (!expiry) {
    return 'Expiry date is required.';
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return 'Use MM/YY format.';
  }
  return '';
}

export function validateCvv(value) {
  const cvv = String(value ?? '').trim();
  if (!cvv) {
    return 'CVV is required.';
  }
  if (!/^\d{3}$/.test(cvv)) {
    return 'CVV must be 3 digits.';
  }
  return '';
}

export function validateUpi(value) {
  const upi = String(value ?? '').trim();
  if (!upi) {
    return 'UPI ID is required.';
  }
  if (!/^[\w.-]+@[\w.-]+$/.test(upi)) {
    return 'Enter a valid UPI ID.';
  }
  return '';
}

export function validatePaymentForm(values) {
  const errors = {};
  const method = values.method || 'card';
  if (method === 'card') {
    errors.cardNumber = validateCardNumber(values.cardNumber);
    errors.expiry = validateExpiry(values.expiry);
    errors.cvv = validateCvv(values.cvv);
  }
  if (method === 'upi') {
    errors.upi = validateUpi(values.upi);
  }
  if (method === 'wallet' && !String(values.wallet ?? '').trim()) {
    errors.wallet = 'Choose a wallet.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateRegistration(values) {
  const errors = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
  if (!values.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms to continue.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateLogin(values) {
  const errors = {
    email: validateEmail(values.email),
    password: values.password ? '' : 'Password is required.',
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateContactForm(values) {
  const message = sanitizeText(values.message);
  const errors = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    message: '',
  };
  if (!message) {
    errors.message = 'Tell us how we can help.';
  } else if (message.length < 15) {
    errors.message = 'Please provide a little more detail.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, text]) => text));
}

export function validateMovieInput(values) {
  const errors = {
    title: validateName(values.title),
    language: validateName(values.language),
    synopsis: '',
  };
  if (!String(values.synopsis ?? '').trim()) {
    errors.synopsis = 'Synopsis is required.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
