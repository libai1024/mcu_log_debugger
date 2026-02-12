import { CustomDropdown } from '../components/CustomDropdown.js';
import { getElements } from '../dom.js';

export const dropdowns = {};

export function initDropdowns() {
  const el = getElements();

  if (el.portSelect) {
    dropdowns.port = new CustomDropdown(el.portSelect, {
      triggerClass: 'port-trigger',
      showCheck: false,
      emptyText: '未检测到串口',
      emptyIcon: 'fa-usb',
      formatItem: (opt) => {
        const isCU = opt.textContent.startsWith('cu.');
        const icon = isCU ? 'fa-microchip' : 'fa-plug';
        const badge = isCU ? '<span class="item-badge">推荐</span>' : '';
        return `<i class="fas ${icon}" style="color:var(--primary);font-size:10px;width:14px;text-align:center;flex-shrink:0;"></i>
                <span class="item-text">${opt.textContent}</span>${badge}`;
      },
    });
  }

  if (el.baudRate) {
    dropdowns.baudRate = new CustomDropdown(el.baudRate, {
      showCheck: true,
      formatItem: (opt) => {
        const isRecommended = opt.textContent.includes('推荐');
        const badge = isRecommended ? '<span class="item-badge">推荐</span>' : '';
        return `<span class="item-check"><i class="fas fa-check"></i></span>
                <span class="item-text">${opt.textContent}</span>${badge}`;
      },
    });
  }

  if (el.dataBits) dropdowns.dataBits = new CustomDropdown(el.dataBits, { showCheck: true });
  if (el.stopBits) dropdowns.stopBits = new CustomDropdown(el.stopBits, { showCheck: true });

  if (el.parity) {
    dropdowns.parity = new CustomDropdown(el.parity, {
      showCheck: true,
      formatItem: (opt) => {
        const labels = { none: '无', even: '偶', odd: '奇' };
        const label = labels[opt.value] || opt.textContent;
        return `<span class="item-check"><i class="fas fa-check"></i></span>
                <span class="item-text">${label}</span>`;
      },
    });
  }

  const exportFormat = document.getElementById('defaultExportFormat');
  if (exportFormat) {
    dropdowns.exportFormat = new CustomDropdown(exportFormat, { showCheck: true });
  }
}

