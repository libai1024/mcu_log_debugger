import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';

let scrollTimeout = null;

export function setupSmartScroll() {
  const el = getElements();
  if (!el.logContainer) return;

  el.logContainer.addEventListener('scroll', () => {
    state.isUserScrolling = true;

    const nearBottom =
      el.logContainer.scrollHeight - el.logContainer.scrollTop - el.logContainer.clientHeight < 50;

    if (nearBottom) {
      state.autoScroll = true;
      if (el.newDataToast) el.newDataToast.style.display = 'none';
      if (state.isViewLocked && state.lockReason === 'scroll') {
        unlockView();
      }
    } else {
      state.autoScroll = false;
      if (!state.isViewLocked) {
        lockView('scroll');
      }
    }

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      state.isUserScrolling = false;
    }, 1000);
  });

  el.jumpToNew?.addEventListener('click', () => {
    el.logContainer.scrollTop = el.logContainer.scrollHeight;
    if (el.newDataToast) el.newDataToast.style.display = 'none';
    state.autoScroll = true;
    if (state.isViewLocked && state.lockReason === 'scroll') {
      unlockView();
    }
  });

  el.scrollToBottom?.addEventListener('click', () => {
    el.logContainer.scrollTop = el.logContainer.scrollHeight;
    state.autoScroll = true;
    if (state.isViewLocked && state.lockReason === 'scroll') {
      unlockView();
    }
  });

  el.btnViewLock?.addEventListener('click', () => {
    if (state.isViewLocked) unlockView();
    else lockView('manual');
  });

  el.btnUnlockFromNotification?.addEventListener('click', unlockView);
}

export function lockView(reason) {
  if (state.isViewLocked && state.lockReason === reason) return;

  state.isViewLocked = true;
  state.lockReason = reason;
  state.pendingMessageCount = 0;

  updateViewLockUI();
  showLockNotification();
}

export function unlockView() {
  if (!state.isViewLocked) return;

  state.isViewLocked = false;
  state.lockReason = '';
  state.pendingMessageCount = 0;

  updateViewLockUI();
  hideLockNotification();
}

function updateViewLockUI() {
  const el = getElements();
  if (!el.btnViewLock) return;

  const icon = el.btnViewLock.querySelector('i');

  if (state.isViewLocked) {
    el.btnViewLock.classList.add('locked');
    if (icon) icon.className = 'fas fa-lock';
    el.btnViewLock.title = '解锁视图 (Cmd+L)';
  } else {
    el.btnViewLock.classList.remove('locked');
    if (icon) icon.className = 'fas fa-unlock';
    el.btnViewLock.title = '锁定视图 (Cmd+L)';
  }
}

function showLockNotification() {
  const el = getElements();
  if (!el.viewLockNotification) return;

  if (el.lockReasonText) {
    el.lockReasonText.textContent = state.lockReason === 'scroll' ? '手动浏览' : state.lockReason === 'search' ? '搜索中' : '已锁定';
  }

  if (el.pendingCountValue) {
    el.pendingCountValue.textContent = String(state.pendingMessageCount);
  }

  el.viewLockNotification.style.display = 'block';
}

function hideLockNotification() {
  const el = getElements();
  if (!el.viewLockNotification) return;
  el.viewLockNotification.style.display = 'none';
}

