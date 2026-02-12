import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';
import { showStatus } from '../../ui/toast.js';
import { parseLogLine } from '../log/parser.js';

let loopTimer = null;

export function setupSendPanel() {
  const el = getElements();
  if (!el.sendInput || !el.sendBtn) return;

  el.sendBtn.addEventListener('click', () => {
    if (el.loopSend?.checked) {
      startLoopSend();
    } else {
      sendOnce();
    }
  });

  el.sendInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (el.loopSend?.checked) startLoopSend();
      else sendOnce();
    }
  });

  el.quickCommands?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-chip[data-cmd]');
    if (!btn) return;
    el.sendInput.value = btn.dataset.cmd;
    sendOnce();
  });

  // Stop looping when checkbox turned off
  el.loopSend?.addEventListener('change', () => {
    if (!el.loopSend.checked) stopLoopSend();
  });
}

async function sendOnce() {
  const el = getElements();
  const data = el.sendInput.value;

  if (!data || !state.isConnected) {
    if (!state.isConnected) showStatus('请先连接串口', 'warning');
    return;
  }

  let payload = data;

  if (el.sendHex?.checked) {
    const hex = data.replace(/\s/g, '');
    if (!/^[0-9A-Fa-f]*$/.test(hex)) {
      showStatus('无效的 HEX 格式', 'error');
      return;
    }
  }

  if (el.sendNewline?.checked) payload += '\n';

  try {
    // NOTE: backend send command not implemented in Rust yet.
    // When it exists, replace this with invoke('send_serial', { data: payload })

    // Local echo entry
    const entry = parseLogLine(`[SEND] ${data}`, state.allEntries.length + state.pendingEntries.length);
    if (entry) {
      entry.tag = 'SEND';
      entry.levelName = 'INFO';
      state.pendingEntries.push(entry);
    }

    el.sendInput.value = '';
    showStatus('数据已发送', 'success');
  } catch (e) {
    showStatus(`发送失败: ${e}`, 'error');
  }
}

function startLoopSend() {
  const el = getElements();
  const intervalMs = Math.max(parseInt(el.loopInterval?.value || '1000', 10), 100);

  stopLoopSend();
  sendOnce();

  loopTimer = setInterval(() => {
    sendOnce();
  }, intervalMs);

  showStatus(`循环发送已启动（${intervalMs}ms）`, 'info');
}

function stopLoopSend() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
    showStatus('循环发送已停止', 'info');
  }
}

