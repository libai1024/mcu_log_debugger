export class CustomDropdown {
  constructor(selectEl, opts = {}) {
    this.select = selectEl;
    this.opts = {
      triggerClass: '',
      showCheck: true,
      formatItem: null,
      emptyText: '暂无选项',
      emptyIcon: 'fa-inbox',
      ...opts,
    };
    this.isOpen = false;
    this.focusedIndex = -1;
    this.items = [];

    this._build();
    this._bind();
  }

  _build() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dropdown';
    if (this.select.disabled) this.wrapper.classList.add('disabled');

    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = `dropdown-trigger ${this.opts.triggerClass}`.trim();
    this.trigger.setAttribute('role', 'combobox');
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-expanded', 'false');

    this.menu = document.createElement('div');
    this.menu.className = 'dropdown-menu';
    this.menu.setAttribute('role', 'listbox');

    this.menuInner = document.createElement('div');
    this.menuInner.className = 'dropdown-menu-inner';
    this.menu.appendChild(this.menuInner);

    const customSelectParent = this.select.closest('.custom-select');
    if (customSelectParent) {
      customSelectParent.style.display = 'none';
      customSelectParent.parentNode.insertBefore(this.wrapper, customSelectParent.nextSibling);
    } else {
      this.select.style.display = 'none';
      this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
    }

    this.wrapper.appendChild(this.trigger);
    this.wrapper.appendChild(this.menu);

    this.refresh();
  }

  refresh() {
    this.menuInner.innerHTML = '';
    this.items = [];

    const children = this.select.children;
    let hasItems = false;

    for (const child of children) {
      if (child.tagName === 'OPTGROUP') {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'dropdown-group-label';
        groupLabel.textContent = child.label;
        this.menuInner.appendChild(groupLabel);

        for (const opt of child.children) {
          if (opt.tagName === 'OPTION' && opt.value !== '') {
            this._addItem(opt);
            hasItems = true;
          }
        }
      } else if (child.tagName === 'OPTION') {
        if (child.value === '' && child.textContent.includes('...')) continue;
        this._addItem(child);
        hasItems = true;
      }
    }

    if (!hasItems) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'dropdown-empty';
      emptyDiv.innerHTML = `<i class="fas ${this.opts.emptyIcon}"></i>${this.opts.emptyText}`;
      this.menuInner.appendChild(emptyDiv);
    }

    this._updateTrigger();
  }

  _addItem(option) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.setAttribute('role', 'option');
    item.dataset.value = option.value;

    if (option.disabled) item.classList.add('disabled');
    if (option.value === this.select.value && option.value !== '') item.classList.add('selected');

    if (this.opts.formatItem) {
      item.innerHTML = this.opts.formatItem(option);
    } else {
      let html = '';
      if (this.opts.showCheck) {
        html += `<span class="item-check"><i class="fas fa-check"></i></span>`;
      }
      html += `<span class="item-text">${option.textContent}</span>`;
      item.innerHTML = html;
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (option.disabled) return;
      this.setValue(option.value);
    });

    item.addEventListener('mouseenter', () => {
      this.focusedIndex = this.items.findIndex(i => i.el === item);
      this._updateFocus();
    });

    this.menuInner.appendChild(item);
    this.items.push({ el: item, option });
  }

  _updateTrigger() {
    const selectedOpt = this.select.options[this.select.selectedIndex];
    let text = '';
    let isPlaceholder = false;

    if (selectedOpt && selectedOpt.value !== '') {
      text = selectedOpt.textContent;
    } else if (selectedOpt) {
      text = selectedOpt.textContent;
      isPlaceholder = true;
    } else {
      text = '请选择...';
      isPlaceholder = true;
    }

    this.trigger.innerHTML = `
      <span class="dropdown-value ${isPlaceholder ? 'placeholder' : ''}">${text}</span>
      <i class="fas fa-chevron-down dropdown-arrow"></i>
    `;
  }

  setValue(value) {
    this.select.value = value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this._highlightSelected();
    this._updateTrigger();
    this.close();
  }

  _highlightSelected() {
    this.items.forEach(({ el }) => {
      el.classList.toggle('selected', el.dataset.value === this.select.value);
    });
  }

  open() {
    if (this.isOpen || this.select.disabled) return;
    this.isOpen = true;
    this.wrapper.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this._highlightSelected();

    const selIdx = this.items.findIndex(i => i.el.classList.contains('selected'));
    this.focusedIndex = selIdx >= 0 ? selIdx : 0;
    this._updateFocus();

    const selectedItem = this.items[this.focusedIndex]?.el;
    if (selectedItem) {
      requestAnimationFrame(() => {
        selectedItem.scrollIntoView({ block: 'nearest' });
      });
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.wrapper.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.focusedIndex = -1;
    this._updateFocus();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  setDisabled(disabled) {
    this.select.disabled = disabled;
    this.wrapper.classList.toggle('disabled', disabled);
    if (disabled) this.close();
  }

  _updateFocus() {
    this.items.forEach(({ el }, idx) => {
      el.classList.toggle('focused', idx === this.focusedIndex);
    });
  }

  _moveFocus(delta) {
    if (this.items.length === 0) return;
    let idx = this.focusedIndex + delta;
    while (idx >= 0 && idx < this.items.length && this.items[idx].option.disabled) {
      idx += delta;
    }
    if (idx < 0) idx = 0;
    if (idx >= this.items.length) idx = this.items.length - 1;
    this.focusedIndex = idx;
    this._updateFocus();
    this.items[idx]?.el.scrollIntoView({ block: 'nearest' });
  }

  _bind() {
    this.trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    this.trigger.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (this.isOpen && this.focusedIndex >= 0) {
            const focused = this.items[this.focusedIndex];
            if (focused && !focused.option.disabled) this.setValue(focused.option.value);
          } else {
            this.open();
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!this.isOpen) this.open();
          else this._moveFocus(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!this.isOpen) this.open();
          else this._moveFocus(-1);
          break;
        case 'Home':
          e.preventDefault();
          if (this.isOpen) { this.focusedIndex = -1; this._moveFocus(1); }
          break;
        case 'End':
          e.preventDefault();
          if (this.isOpen) { this.focusedIndex = this.items.length; this._moveFocus(-1); }
          break;
        case 'Tab':
          this.close();
          break;
      }
    });

    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.wrapper.contains(e.target)) this.close();
    });
  }

  destroy() {
    this.wrapper.remove();
    const customSelectParent = this.select.closest('.custom-select');
    if (customSelectParent) customSelectParent.style.display = '';
    else this.select.style.display = '';
  }
}

