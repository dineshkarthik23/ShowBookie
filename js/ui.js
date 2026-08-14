import { APP_CONFIG } from './config.js';
import { generateQrLikeBlock } from './booking.js';
import { t } from './i18n.js';

const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
let lottieLoaderPromise;

function ensureLottieWeb() {
  if (window.lottie) {
    return Promise.resolve(window.lottie);
  }
  if (lottieLoaderPromise) {
    return lottieLoaderPromise;
  }

  lottieLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('lottie-web-cdn');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.lottie));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load lottie-web script.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'lottie-web-cdn';
    script.src = LOTTIE_CDN;
    script.async = true;
    script.addEventListener('load', () => resolve(window.lottie));
    script.addEventListener('error', () => reject(new Error('Failed to load lottie-web script.')));
    document.head.appendChild(script);
  });

  return lottieLoaderPromise;
}

function mountBrandLottie(container) {
  if (!container) {
    return;
  }

  ensureLottieWeb()
    .then((lottie) => {
      if (!lottie?.loadAnimation) {
        console.error('lottie-web loaded but no loadAnimation API found.');
        return;
      }
      container.replaceChildren();
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const animation = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: !reducedMotion,
        autoplay: !reducedMotion,
        path: '/Entertainment.json',
      });
      if (reducedMotion) {
        animation.addEventListener('DOMLoaded', () => animation.goToAndStop(0, true));
      }
    })
    .catch((error) => {
      console.error('Unable to initialize brand animation.', error);
    });
}

export function el(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  const {
    className,
    text,
    attrs = {},
    dataset = {},
    value,
    checked,
    disabled,
    type,
    name,
    id,
    src,
    alt,
    href,
    ariaLabel,
    title,
  } = options;

  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  if (value !== undefined) {
    node.value = value;
  }
  if (checked !== undefined) {
    node.checked = checked;
  }
  if (disabled !== undefined) {
    node.disabled = disabled;
  }
  if (type) {
    node.type = type;
  }
  if (name) {
    node.name = name;
  }
  if (id) {
    node.id = id;
  }
  if (src) {
    node.src = src;
  }
  if (alt !== undefined) {
    node.alt = alt;
  }
  if (href) {
    node.href = href;
  }
  if (ariaLabel) {
    node.setAttribute('aria-label', ariaLabel);
  }
  if (title) {
    node.title = title;
  }

  Object.entries(attrs).forEach(([key, valueToSet]) => {
    if (valueToSet !== undefined && valueToSet !== null) {
      node.setAttribute(key, valueToSet);
    }
  });
  Object.entries(dataset).forEach(([key, valueToSet]) => {
    node.dataset[key] = valueToSet;
  });

  const normalizedChildren = Array.isArray(children) ? children : [children];
  normalizedChildren.filter(Boolean).forEach((child) => {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat(APP_CONFIG.locale, {
    style: 'currency',
    currency: APP_CONFIG.currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat(APP_CONFIG.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value) {
  return new Intl.DateTimeFormat(APP_CONFIG.locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function getInitials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function createBrandLottie(className = 'brand-logo') {
  const mark = el('div', { className, attrs: { 'aria-hidden': 'true' } });
  window.requestAnimationFrame(() => mountBrandLottie(mark));
  return mark;
}

export function icon(name) {
  const paths = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
  };
  const svg = el('svg', { className: 'icon-svg', attrs: { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' } });
  svg.innerHTML = paths[name] || '';
  return svg;
}

export function setDocumentMeta({ title, description }) {
  document.title = title;
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
  if (ogTitle) {
    ogTitle.setAttribute('content', title);
  }
  if (ogDescription) {
    ogDescription.setAttribute('content', description);
  }
}

export function createStatusState(type, title, message) {
  return el('div', { className: `state-card state-${type}` }, [
    el('h3', { text: title }),
    el('p', { text: message }),
  ]);
}

export function createToastRoot() {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = el('div', { id: 'toast-root', className: 'toast-root', attrs: { 'aria-live': 'polite' } });
    document.body.appendChild(root);
  }
  return root;
}

export function showToast({ title, message, type = 'info' }) {
  const root = createToastRoot();
  const toast = el('article', { className: `toast toast-${type}` }, [
    el('strong', { text: title }),
    el('p', { text: message }),
  ]);
  root.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-leaving');
    window.setTimeout(() => toast.remove(), 250);
  }, 3500);
}

export function ensureModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = el('div', { id: 'modal-root' });
    document.body.appendChild(root);
  }
  return root;
}

export function openModal({ title, body, actions = [] }) {
  const root = ensureModalRoot();
  clearNode(root);

  const dialog = el('div', { className: 'modal-backdrop' }, [
    el('div', { className: 'modal-card', attrs: { role: 'dialog', 'aria-modal': 'true' } }, [
      el('div', { className: 'modal-header' }, [
        el('h3', { text: title }),
        el(
          'button',
          {
            className: 'icon-button',
            type: 'button',
            ariaLabel: 'Close dialog',
          },
          '×'
        ),
      ]),
      el('div', { className: 'modal-body' }, body),
      el(
        'div',
        { className: 'modal-actions' },
        actions.map((action) => {
          const button = el(
            'button',
            { className: action.className || 'button button-secondary', type: 'button', text: action.label },
            []
          );
          button.addEventListener('click', action.onClick);
          return button;
        })
      ),
    ]),
  ]);

  dialog.querySelector('.icon-button').addEventListener('click', () => closeModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeModal();
    }
  });
  root.appendChild(dialog);
}

export function closeModal() {
  const root = ensureModalRoot();
  clearNode(root);
}

export function createNavbar({ activePage, user, notifications = [], locale, onThemeToggle, onLocaleChange }) {
  const links = [
    { label: t('nav.home'), href: APP_CONFIG.routeMap.home, page: 'home' },
    { label: t('nav.movies'), href: APP_CONFIG.routeMap.movies, page: 'movies' },
    { label: t('nav.history'), href: APP_CONFIG.routeMap.history, page: 'history' },
    { label: t('nav.contact'), href: APP_CONFIG.routeMap.help, page: 'help' },
    { label: t('nav.about'), href: APP_CONFIG.routeMap.about, page: 'about' },
  ];

  if (user?.role === 'admin') {
    links.push({ label: t('nav.admin'), href: APP_CONFIG.routeMap.admin, page: 'admin' });
  }

  const notificationsButton = el(
    'button',
    {
      className: 'header-action',
      type: 'button',
      ariaLabel: t('nav.notifications'),
    },
    [
      icon('bell'),
      el('span', { className: 'notification-count', text: String(notifications.filter((item) => !item.read).length) }),
    ]
  );
  notificationsButton.dataset.action = 'toggle-notifications';

  const availableLocales = Array.isArray(APP_CONFIG.supportedLocales) && APP_CONFIG.supportedLocales.length
    ? APP_CONFIG.supportedLocales
    : ['en'];
  const currentLocale = availableLocales.includes(locale) ? locale : availableLocales[0];
  const langButton = el('button', {
    className: 'lang-btn',
    type: 'button',
    text: `${currentLocale.toUpperCase()} ▾`,
  });
  langButton.addEventListener('click', () => {
    if (!availableLocales.length) {
      return;
    }
    const currentIndex = availableLocales.indexOf(currentLocale);
    const nextLocale = availableLocales[(currentIndex + 1) % availableLocales.length];
    onLocaleChange?.(nextLocale);
  });

  const themeButton = el('button', { className: 'header-action utility-button', type: 'button' }, [icon('moon'), el('span', { text: 'Theme' })]);
  themeButton.addEventListener('click', () => onThemeToggle?.());

  const pagesNav = el(
    'nav',
    { className: 'nav-pages', attrs: { 'aria-label': 'Primary navigation' } },
    links.map((link) =>
      el('a', {
        href: link.href,
        className: activePage === link.page ? 'nav-link active' : 'nav-link',
        text: link.label,
      })
    )
  );

  // Sign-in or profile block
  const authBlock = user
    ? el('div', { className: 'header-user-stack' }, [
        el('a', { href: APP_CONFIG.routeMap.profile, className: 'profile-pill', ariaLabel: 'Open profile' }, [
          el('span', { className: 'profile-avatar', text: getInitials(user.name) }),
          el('span', { className: 'sr-only', text: user.name }),
        ]),
        el('a', { href: APP_CONFIG.routeMap.login, className: 'button button-secondary action-compact', text: 'Logout', dataset: { action: 'logout' } }),
      ])
    : (() => {
        const btn = el('button', { className: 'btn-signin', type: 'button' }, [
          el('span', { className: 'icon', text: '🔐' }),
          el('span', { text: 'Sign in' }),
        ]);
        btn.addEventListener('click', () => { window.location.href = APP_CONFIG.routeMap.login; });
        return btn;
      })();

  const actionsRow = el('div', { className: 'nav-actions' }, [
    themeButton,
    notificationsButton,
    authBlock,
  ]);

  const brandLogo = createBrandLottie();
  const brandCard = el('div', { className: 'brand-card' }, [
    brandLogo,
    el('div', { className: 'brand-text' }, [
      el('a', { href: APP_CONFIG.routeMap.home, className: 'brand-title', text: APP_CONFIG.appName }),
      el('div', { className: 'brand-tagline', text: 'Book today. Print instantly. Rebook smartly.' }),
    ]),
  ]);

  const header = el('header', { className: 'site-header' }, [
    brandCard,
    el('div', { className: 'nav-right' }, [pagesNav, actionsRow]),
  ]);

  return header;
}

export function createNotificationDrawer(notifications) {
  const content = notifications.length
    ? notifications.map((notification) =>
        el('article', { className: `notification-item ${notification.read ? '' : 'unread'}` }, [
          el('strong', { text: notification.title }),
          el('p', { text: notification.message }),
          el('small', { text: formatDateTime(notification.createdAt) }),
        ])
      )
    : [createStatusState('empty', 'No notifications', 'You are all caught up.')];

  return el('aside', { className: 'notification-drawer hidden', attrs: { 'aria-label': 'Notification center' } }, [
    el('div', { className: 'section-heading' }, [
      el('h3', { text: 'Notifications' }),
      el('p', { text: 'Booking updates and offers' }),
    ]),
    ...content,
  ]);
}

export function createFooter() {
  return el('footer', { className: 'site-footer' }, [
    el('div', { className: 'footer-copy' }, [
      el('strong', { text: APP_CONFIG.appName }),
      el('p', { text: t('footer.tagline') }),
    ]),
    el('div', { className: 'footer-links' }, [
      el('a', { href: APP_CONFIG.routeMap.terms, text: 'Terms' }),
      el('a', { href: APP_CONFIG.routeMap.privacy, text: 'Privacy' }),
      el('a', { href: APP_CONFIG.routeMap.cancellation, text: 'Cancellation Policy' }),
      el('a', { href: APP_CONFIG.routeMap.faq, text: 'FAQ' }),
    ]),
  ]);
}

export function createPageLayout({ header, hero, main, footer, notifications }) {
  return el('div', { className: 'page-shell' }, [header, notifications, hero, main, footer]);
}

export function createHero({
  eyebrow,
  title,
  description,
  actions = [],
  image,
  chips = [],
}) {
  return el('section', { className: 'hero-section' }, [
    el('div', { className: 'hero-copy' }, [
      eyebrow ? el('span', { className: 'eyebrow', text: eyebrow }) : null,
      el('h1', { text: title }),
      el('p', { text: description }),
      chips.length
        ? el(
            'div',
            { className: 'chip-row' },
            chips.map((chip) => el('span', { className: 'chip', text: chip }))
          )
        : null,
      actions.length
        ? el(
            'div',
            { className: 'hero-actions' },
            actions.map((action) =>
              el('a', {
                href: action.href,
                className: action.kind === 'secondary' ? 'button button-secondary' : 'button button-primary',
                text: action.label,
              })
            )
          )
        : null,
    ]),
    image
      ? el('div', { className: 'hero-visual' }, [el('img', { src: image, alt: title, attrs: { loading: 'eager' } })])
      : null,
  ]);
}

export function createSection(title, subtitle, content, actions = []) {
  return el('section', { className: 'content-section card-surface' }, [
    el('div', { className: 'section-heading' }, [
      el('div', {}, [el('h2', { text: title }), subtitle ? el('p', { text: subtitle }) : null]),
      actions.length ? el('div', { className: 'inline-actions' }, actions) : null,
    ]),
    content,
  ]);
}

export function createMovieCard({ movie, isFavorite, showFavorite = true, ctaLabel = 'View details' }) {
  const card = el('article', { className: 'movie-card' }, [
    el('div', { className: 'movie-poster-wrap' }, [
      el('img', { className: 'movie-poster', src: movie.image, alt: `${movie.title} poster`, attrs: { loading: 'lazy' } }),
      el('span', { className: 'rating-badge', text: `${movie.rating}/10` }),
    ]),
    el('div', { className: 'movie-card-body' }, [
      el('h3', { text: movie.title }),
      el('p', { text: `${movie.language} · ${movie.genres.join(' / ')}` }),
      el('div', { className: 'movie-meta' }, [
        el('span', { text: `${movie.durationMinutes} min` }),
        el('span', { text: movie.votesLabel }),
      ]),
      el('div', { className: 'movie-card-actions' }, [
        el('a', {
          className: 'button button-primary',
          href: movie.legacyPath || `${APP_CONFIG.routeMap.details}?movie=${movie.slug}`,
          text: ctaLabel,
        }),
        showFavorite
          ? el('button', {
              className: isFavorite ? 'button button-ghost active' : 'button button-ghost',
              type: 'button',
              text: isFavorite ? 'Wishlisted' : 'Wishlist',
              dataset: { action: 'favorite', movieId: movie.id },
            })
          : null,
      ]),
    ]),
  ]);
  return card;
}

export function createSeatLegend() {
  const items = [
    { label: 'Available', className: 'seat-swatch available' },
    { label: 'Selected', className: 'seat-swatch selected' },
    { label: 'Reserved', className: 'seat-swatch reserved' },
  ];

  return el(
    'div',
    { className: 'seat-legend', attrs: { 'aria-label': 'Seat legend' } },
    items.map((item) =>
      el('div', { className: 'legend-item' }, [el('span', { className: item.className }), el('span', { text: item.label })])
    )
  );
}

export function createBookingSummary(summary, ticketCode = '') {
  const rows = [
    ['Subtotal', formatCurrency(summary.subtotal)],
    ['Convenience fee', formatCurrency(summary.convenienceFee)],
    ['Discount', `- ${formatCurrency(summary.discount)}`],
    ['Tax', formatCurrency(summary.tax)],
    ['Total', formatCurrency(summary.total)],
  ];
  return el('section', { className: 'booking-summary card-surface' }, [
    el('h3', { text: 'Booking summary' }),
    ...rows.map(([label, value]) =>
      el('div', { className: 'summary-row' }, [el('span', { text: label }), el('strong', { text: value })])
    ),
    ticketCode
      ? el('div', { className: 'ticket-code' }, [
          el('span', { text: 'Booking code' }),
          el('strong', { text: ticketCode }),
          el(
            'pre',
            { className: 'qr-block', attrs: { 'aria-label': 'Mock booking code block' } },
            generateQrLikeBlock(ticketCode).join('\n')
          ),
        ])
      : null,
  ]);
}

export function createFilterField(label, control) {
  return el('label', { className: 'field-group' }, [el('span', { text: label }), control]);
}

export function createDetailList(items) {
  return el(
    'dl',
    { className: 'detail-list' },
    items.flatMap(([label, value]) => [el('dt', { text: label }), el('dd', { text: value })])
  );
}

export function createEmptyGridMessage(message) {
  const isBrowsePrompt = /recently viewed|wishlist/i.test(message);
  return el('div', { className: 'empty-grid-message' }, [
    el('span', { text: message.replace(/\.$/, '') }),
    isBrowsePrompt ? el('a', { href: APP_CONFIG.routeMap.movies, className: 'inline-link', text: 'Browse movies →' }) : null,
  ]);
}
