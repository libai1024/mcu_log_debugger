import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';
import { showStatus } from '../../ui/toast.js';
import { hasTauri, listen } from '../../services/tauriClient.js';
import { listSerialPorts, connectSerial, disconnectSerial } from './serialService.js';
import { dropdowns } from '../../ui/dropdowns/initDropdowns.js';

function parsePortName(fullPath) {
  const name = fullPath.replace('/dev/', '');
  const isCU = name.startsWith('cu.');
  const isTTY = name.startsWith('tty.');
  let deviceId = name;
  if (isCU) deviceId = name.substring(3);
  else if (isTTY) deviceId = name.substring(4);
  return { path: fullPath, name, isCU, isTTY, deviceId };
}

function optimizePortList(ports) {
  const portMap = new Map();
  ports.forEach((path) => {
    const parsed = parsePortName(path);
    if (portMap.has(parsed.deviceId)) {
      const existing = portMap.get(parsed.deviceId);
      if (parsed.isCU && !existing.isCU) portMap.set(parsed.deviceId, parsed);
    } else {
      portMap.set(parsed.deviceId, parsed);
    }
  });

  return Array.from(portMap.values()).sort((a, b) => {
    if (a.isCU && !b.isCU) return -1;
    if (!a.isCU && b.isCU) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function refreshPorts() {
  const el = getElements();
  el.refreshPorts?.classList.add('spinning');

  try {
    const rawPorts = await listSerialPorts();
    const optimized = optimizePortList(rawPorts);
    const current = el.portSelect?.value;

    let html = '<option value="">选择串口...</option>';
    if (optimized.length === 0) {
      html += '<option value="" disabled>未检测到串口</option>';
    } else {
      const cuPorts = optimized.filter((p) => p.isCU);
      const others = optimized.filter((p) => !p.isCU);

      if (cuPorts.length > 0) {
        html += '<optgroup label="推荐 (cu.)">';
        cuPorts.forEach((p) => {
          html += `<option value="${p.path}" ${p.path === current ? 'selected' : ''}>${p.name}</option>`;
        });
        html += '</optgroup>';
      }

      if (others.length > 0) {
        html += '<optgroup label="其他">';
        others.forEach((p) => {
          html += `<option value="${p.path}" ${p.path === current ? 'selected' : ''}>${p.name}</option>`;
        });
        html += '</optgroup>';
      }
    }

    if (el.portSelect) el.portSelect.innerHTML = html;

    if (current && el.portSelect && Array.from(el.portSelect.options).some((o) => o.value === current)) {
      el.portSelect.value = current;
    }

    if (dropdowns.port) dropdowns.port.refresh();
  } catch (e) {
    console.error('Failed to list ports:', e);
  } finally {
    setTimeout(() => el.refreshPorts?.classList.remove('spinning'), 600);
  }
}

export async function connect() {
  const el = getElements();
  const path = el.portSelect?.value;
  if (!path) {
    showStatus('请先选择串口', 'warning');
    return;
  }

  try {
    await connectSerial({
      path,
      baudRate: parseInt(el.baudRate?.value || '115200', 10),
    });

    state.isConnected = true;
    state.selectedPortPath = path;

    if (el.connectBtn) {
      el.connectBtn.innerHTML = '<i class="fas fa-link-slash"></i><span>断开连接</span>';
      el.connectBtn.classList.add('connected');
    }

    document.getElementById('statusDot')?.classList.add('connected');
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.textContent = '已连接';

    if (el.portSelectWrapper) el.portSelectWrapper.style.display = 'none';
    if (el.selectedPortInfo) el.selectedPortInfo.style.display = 'flex';
    if (el.connectedPortName) el.connectedPortName.textContent = path.replace('/dev/', '');

    if (el.baudRate) el.baudRate.disabled = true;
    if (el.refreshPorts) el.refreshPorts.disabled = true;

    if (dropdowns.port) dropdowns.port.wrapper.style.display = 'none';
    dropdowns.baudRate?.setDisabled(true);
    dropdowns.dataBits?.setDisabled(true);
    dropdowns.stopBits?.setDisabled(true);
    dropdowns.parity?.setDisabled(true);

    showStatus(`已连接: ${path.replace('/dev/', '')}`, 'success');
  } catch (e) {
    showStatus(`连接失败: ${e}`, 'error');
  }
}

export async function disconnect() {
  const el = getElements();

  try {
    await disconnectSerial();
  } catch (e) {
    console.error('Disconnect error:', e);
  }

  state.isConnected = false;

  if (el.connectBtn) {
    el.connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>连接串口</span>';
    el.connectBtn.classList.remove('connected');
  }

  document.getElementById('statusDot')?.classList.remove('connected');
  const statusText = document.getElementById('statusText');
  if (statusText) statusText.textContent = '未连接';

  if (el.portSelectWrapper) el.portSelectWrapper.style.display = 'none';
  if (el.selectedPortInfo) el.selectedPortInfo.style.display = 'none';

  if (el.baudRate) el.baudRate.disabled = false;
  if (el.refreshPorts) el.refreshPorts.disabled = false;

  if (dropdowns.port) {
    dropdowns.port.wrapper.style.display = '';
    dropdowns.port.setDisabled(false);
  }

  dropdowns.baudRate?.setDisabled(false);
  dropdowns.dataBits?.setDisabled(false);
  dropdowns.stopBits?.setDisabled(false);
  dropdowns.parity?.setDisabled(false);

  showStatus('已断开连接', 'info');
}

export function initSerial() {
  const el = getElements();

  el.refreshPorts?.addEventListener('click', refreshPorts);
  el.connectBtn?.addEventListener('click', () => {
    state.isConnected ? disconnect() : connect();
  });

  if (!hasTauri()) return;

  refreshPorts();
  setInterval(refreshPorts, 3000);

  listen('serial-error', (event) => {
    showStatus(`串口错误: ${event.payload}`, 'error');
    disconnect();
  });

  listen('serial-disconnected', () => {
    if (state.isConnected) {
      showStatus('串口已断开', 'warning');
      disconnect();
    }
  });
}

