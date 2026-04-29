import {
  deleteMovie,
  deleteShow,
  getAdminSnapshot,
  saveMovie,
  saveShow,
} from './api.js';

export function loadAdminDashboard() {
  return getAdminSnapshot();
}

export function saveAdminMovie(values) {
  return saveMovie(values);
}

export function removeAdminMovie(movieId) {
  deleteMovie(movieId);
}

export function saveAdminShow(values) {
  return saveShow(values);
}

export function removeAdminShow(showId) {
  deleteShow(showId);
}
