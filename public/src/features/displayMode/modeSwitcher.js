import { state } from '../../core/state.js';

export function initModeSwitcher() {
  const savedMode = localStorage.getItem('displayMode');
  if (savedMode) state.displayMode = savedMode;

  const scheduleUpdate = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => updateModeSwitcherUI());
    });
  };

  // Defer first measurement to a double-rAF to avoid initial layout/font-load jitter
  scheduleUpdate();

  // Second pass after full load (fonts/icons may change widths)
  window.addEventListener('load', scheduleUpdate);

  // If Font Loading API is available, update again after fonts are ready
  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleUpdate).catch(() => {});
  }

  // Update on window resize to keep indicator aligned
  window.addEventListener('resize', scheduleUpdate);
}

export function switchDisplayMode(mode) {
  if (!mode) return;
  state.displayMode = mode;
  localStorage.setItem('displayMode', mode);
  updateModeSwitcherUI();
}

export function updateModeSwitcherUI() {
  const options = document.querySelectorAll('.mode-option');
  const indicator = document.querySelector('.mode-indicator');
  
  options.forEach((option) => {
    const mode = option.dataset.mode;
    if (mode === state.displayMode) {
      option.classList.add('active');
      if (indicator) {
        indicator.style.width = `${option.offsetWidth}px`;
        indicator.style.transform = `translateX(${option.offsetLeft}px)`;
      }
    } else {
      option.classList.remove('active');
    }
  });
}

