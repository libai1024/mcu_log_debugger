import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';
import { renderLogTable } from './renderer.js';

function updateToggleAllTagsButton() {
  const el = getElements();
  const checkboxes = el.tagList?.querySelectorAll('input') || [];
  if (checkboxes.length === 0) return;

  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  const btnIcon = el.toggleAllTags?.querySelector('i');
  const btnText = el.toggleAllTags?.querySelector('span');

  if (!btnIcon || !btnText) return;

  if (allChecked) {
    btnIcon.className = 'fas fa-times-circle';
    btnText.textContent = '取消全选';
  } else {
    btnIcon.className = 'fas fa-check-double';
    btnText.textContent = '全选';
  }
}

export function updateTagList() {
  const el = getElements();
  if (!el.tagList) return;

  const tags = [...new Set(state.allEntries.map((e) => e.tag))].sort();
  const currentTags = new Set(
    Array.from(el.tagList.querySelectorAll('input:checked')).map((cb) => cb.value)
  );

  const shouldSelectByDefault = !state.tagFilterInitialized && currentTags.size === 0;
  if (shouldSelectByDefault) state.tagFilterInitialized = true;

  el.tagList.innerHTML = tags
    .map((tag) => {
      const isActive = currentTags.has(tag) || (shouldSelectByDefault && !currentTags.size);
      return `
        <div class="tag-item ${isActive ? '' : 'inactive'}" data-tag="${escapeHtml(tag)}">
          <input type="checkbox" value="${escapeHtml(tag)}" ${isActive ? 'checked' : ''} style="display:none;">
          <span class="tag-label">${escapeHtml(tag)}</span>
          <button type="button" class="tag-toggle" title="${isActive ? '取消选择' : '选择'}">
            <i class="fas ${isActive ? 'fa-times' : 'fa-check'}"></i>
          </button>
        </div>`;
    })
    .join('');

  // Use event delegation for the entire tag list
  el.tagList.onclick = (e) => {
    const tagItem = e.target.closest('.tag-item');
    if (!tagItem) return;

    const checkbox = tagItem.querySelector('input[type="checkbox"]');
    const btn = tagItem.querySelector('.tag-toggle');
    const icon = btn.querySelector('i');

    // Toggle state
    checkbox.checked = !checkbox.checked;
    tagItem.classList.toggle('inactive', !checkbox.checked);
    icon.className = `fas ${checkbox.checked ? 'fa-times' : 'fa-check'}`;
    btn.title = checkbox.checked ? '取消选择' : '选择';

    renderLogTable();
    updateToggleAllTagsButton();
  };

  updateToggleAllTagsButton();
}

export function setupToggleAllTags() {
  const el = getElements();
  el.toggleAllTags?.addEventListener('click', () => {
    const checkboxes = el.tagList?.querySelectorAll('input') || [];
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

    state.tagFilterInitialized = true;

    if (allChecked) {
      checkboxes.forEach((cb) => (cb.checked = false));
      el.tagList?.querySelectorAll('.tag-item').forEach((item) => item.classList.add('inactive'));
      el.tagList?.querySelectorAll('.tag-toggle i').forEach((icon) => (icon.className = 'fas fa-check'));
      el.tagList?.querySelectorAll('.tag-toggle').forEach((btn) => (btn.title = '选择'));
    } else {
      checkboxes.forEach((cb) => (cb.checked = true));
      el.tagList?.querySelectorAll('.tag-item').forEach((item) => item.classList.remove('inactive'));
      el.tagList?.querySelectorAll('.tag-toggle i').forEach((icon) => (icon.className = 'fas fa-times'));
      el.tagList?.querySelectorAll('.tag-toggle').forEach((btn) => (btn.title = '取消选择'));
    }

    updateToggleAllTagsButton();
    renderLogTable();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

