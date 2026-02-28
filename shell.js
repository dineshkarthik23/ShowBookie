(function () {
  const userInfo = document.getElementById('user-info');
  if (!userInfo) {
    return;
  }

  const usernameLabel = document.getElementById('username');
  const avatarLabel = document.getElementById('profile-avatar');
  const profileInfoAction = document.querySelector('[data-action="profile-info"]');
  const themeAction = document.querySelector('[data-action="theme"]');
  const settingsAction = document.querySelector('[data-action="settings"]');
  const searchInput = document.getElementById('movie-search');
  const suggestionsRoot = document.getElementById('search-suggestions');

  const availableMovies = [
    { title: 'DJANGO', path: '/html/movdetails.html' },
    { title: 'DUNE 2', path: '/html/movdetails2.html' },
    { title: 'SHAWSHANK REDEMPTION', path: '/html/movdetails3.html' },
    { title: 'INTERSTELLAR', path: '/html/movdetails4.html' }
  ];

  function applyTheme(themeName) {
    if (themeName === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }

    if (themeAction) {
      themeAction.textContent = `Theme: ${themeName === 'dark' ? 'Dark' : 'Light'}`;
    }
  }

  function loadSavedTheme() {
    const savedTheme = localStorage.getItem('showbookieTheme') || 'light';
    applyTheme(savedTheme);
  }

  function getInitials(name) {
    if (!name) {
      return 'U';
    }
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  function normalizeValue(value) {
    return String(value || '').trim().toLowerCase();
  }

  function findMovieMatches(query) {
    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) {
      return [];
    }

    const startsWith = [];
    const includes = [];

    availableMovies.forEach((movie) => {
      const title = movie.title.toLowerCase();
      if (title.startsWith(normalizedQuery)) {
        startsWith.push(movie);
      } else if (title.includes(normalizedQuery)) {
        includes.push(movie);
      }
    });

    return [...startsWith, ...includes];
  }

  function hideSuggestions() {
    if (!suggestionsRoot) {
      return;
    }
    suggestionsRoot.classList.add('hidden');
    suggestionsRoot.innerHTML = '';
  }

  function navigateToMovie(moviePath) {
    if (!moviePath) {
      return;
    }
    window.location.href = moviePath;
  }

  function renderSuggestions(items) {
    if (!suggestionsRoot) {
      return;
    }

    if (!items.length) {
      hideSuggestions();
      return;
    }

    suggestionsRoot.innerHTML = '';

    items.forEach((movie) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'search-option';
      option.textContent = movie.title;
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        navigateToMovie(movie.path);
      });
      suggestionsRoot.appendChild(option);
    });

    suggestionsRoot.classList.remove('hidden');
  }

  function initMovieSearch() {
    if (!searchInput || !suggestionsRoot) {
      return;
    }

    searchInput.addEventListener('input', () => {
      const query = searchInput.value;
      const matches = findMovieMatches(query);
      renderSuggestions(matches);
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value;
      if (!query.trim()) {
        return;
      }
      renderSuggestions(findMovieMatches(query));
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      const query = searchInput.value;
      const matches = findMovieMatches(query);
      if (matches.length > 0) {
        navigateToMovie(matches[0].path);
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-box')) {
        hideSuggestions();
      }
    });
  }

  async function getUserData() {
    try {
      const response = await fetch('/get-user');
      if (!response.ok) {
        return null;
      }

      const user = await response.json();
      if (!user || !user.username) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  function wireMenuActions(user) {
    if (profileInfoAction) {
      profileInfoAction.addEventListener('click', (event) => {
        event.preventDefault();
        const userName = user.username || 'Unknown';
        const email = user.email || 'Not available';
        const userId = user.userId || 'N/A';
        alert(`Profile\nName: ${userName}\nEmail: ${email}\nUser ID: ${userId}`);
      });
    }

    if (themeAction) {
      themeAction.addEventListener('click', (event) => {
        event.preventDefault();
        const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        localStorage.setItem('showbookieTheme', nextTheme);
        applyTheme(nextTheme);
      });
    }

    if (settingsAction) {
      settingsAction.addEventListener('click', (event) => {
        event.preventDefault();
        alert('Settings will be available soon.');
      });
    }
  }

  async function init() {
    loadSavedTheme();
    const user = await getUserData();

    if (!user) {
      window.location.href = '/';
      return;
    }

    if (usernameLabel) {
      usernameLabel.textContent = user.username;
    }
    if (avatarLabel) {
      avatarLabel.textContent = getInitials(user.username);
    }

    wireMenuActions(user);
    initMovieSearch();
  }

  init();
})();
