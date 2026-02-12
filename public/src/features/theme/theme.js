import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';

export function initTheme() {
  const saved = localStorage.getItem('theme');
  state.isDarkTheme = saved === 'dark';
  applyTheme();
}

export function toggleTheme() {
  state.isDarkTheme = !state.isDarkTheme;
  localStorage.setItem('theme', state.isDarkTheme ? 'dark' : 'light');
  applyTheme();
}

export function applyTheme() {
  const el = getElements();
  document.documentElement.setAttribute('data-theme', state.isDarkTheme ? 'dark' : 'light');
  const icon = el.toggleTheme?.querySelector('i');
  if (icon) {
    icon.className = state.isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
  }
}

