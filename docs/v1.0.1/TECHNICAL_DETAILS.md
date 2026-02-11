# MCU Log Debugger v1.0.1 技术实现细节

## 🏗️ 架构概览

### 技术栈
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **后端**: Rust + Tauri 1.5+
- **通信**: Tauri IPC (Invoke/Event)
- **串口**: serialport-rs

### 模块划分
```
┌─────────────────────────────────────┐
│         Frontend (Web)              │
│  ┌─────────────────────────────┐   │
│  │  UI Components              │   │
│  │  - Mode Switcher            │   │
│  │  - Log Display              │   │
│  │  - HEX Viewer               │   │
│  │  - Settings Modal           │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  State Management           │   │
│  │  - Display Mode             │   │
│  │  - Log Entries              │   │
│  │  - Filters                  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              ↕ Tauri IPC
┌─────────────────────────────────────┐
│         Backend (Rust)              │
│  ┌─────────────────────────────┐   │
│  │  Serial Port Manager        │   │
│  │  - Connection               │   │
│  │  - Data Reading             │   │
│  │  - Data Writing             │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  File System                │   │
│  │  - Save Logs                │   │
│  │  - Load Settings            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🔄 模式切换实现

### 1. 状态管理

**JavaScript 状态**:
```javascript
// 全局状态
let displayMode = 'log'; // 'log' | 'hex' | 'normal'

// 模式配置
const MODE_CONFIG = {
    log: {
        name: 'Log 模式',
        icon: '📝',
        description: '结构化日志显示'
    },
    hex: {
        name: 'HEX 模式',
        icon: '🔢',
        description: '十六进制数据查看'
    },
    normal: {
        name: 'Normal 模式',
        icon: '📄',
        description: '纯文本终端风格'
    }
};
```

### 2. 模式切换逻辑

```javascript
function switchDisplayMode(mode) {
    if (displayMode === mode) return;
    
    // 保存当前滚动位置
    const scrollPos = elements.logContainer.scrollTop;
    
    // 更新状态
    displayMode = mode;
    
    // 保存到 localStorage
    localStorage.setItem('displayMode', mode);
    
    // 更新 UI
    updateModeSwitcher();
    
    // 重新渲染
    renderLogTable();
    
    // 恢复滚动位置（如果可能）
    if (autoScroll) {
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    } else {
        elements.logContainer.scrollTop = scrollPos;
    }
    
    // 显示提示
    showStatus(`已切换到${MODE_CONFIG[mode].name}`, 'info');
}
```

### 3. 渲染函数重构

```javascript
function renderLogTable() {
    switch (displayMode) {
        case 'log':
            renderLogMode();
            break;
        case 'hex':
            renderHexMode();
            break;
        case 'normal':
            renderNormalMode();
            break;
    }
}
```

---

## 🔢 HEX 模式实现

### 1. 数据转换

```javascript
/**
 * 将字符串转换为十六进制显示
 * @param {string} str - 原始字符串
 * @param {number} bytesPerLine - 每行字节数 (8/16/32)
 * @returns {Array} 格式化的行数组
 */
function stringToHexLines(str, bytesPerLine = 16) {
    const bytes = new TextEncoder().encode(str);
    const lines = [];
    
    for (let i = 0; i < bytes.length; i += bytesPerLine) {
        const chunk = bytes.slice(i, i + bytesPerLine);
        
        lines.push({
            address: i.toString(16).padStart(8, '0').toUpperCase(),
            hex: Array.from(chunk)
                .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' '),
            ascii: Array.from(chunk)
                .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                .join('')
        });
    }
    
    return lines;
}
```

### 2. HEX 模式渲染

```javascript
function renderHexMode() {
    const bytesPerLine = 16;
    const hexLines = [];
    
    // 处理每条日志
    filteredEntries.forEach(entry => {
        const lines = stringToHexLines(entry.rawLine, bytesPerLine);
        hexLines.push(...lines);
    });
    
    // 渲染表格
    elements.logBody.innerHTML = hexLines.map((line, idx) => `
        <tr class="hex-row" data-index="${idx}">
            <td class="hex-address">${line.address}</td>
            <td class="hex-data">${line.hex}</td>
            <td class="hex-ascii">${line.ascii}</td>
        </tr>
    `).join('');
    
    // 更新表头
    elements.logHead.innerHTML = `
        <tr>
            <th class="hex-address">地址</th>
            <th class="hex-data">HEX 数据</th>
            <th class="hex-ascii">ASCII</th>
        </tr>
    `;
}
```

### 3. HEX 模式样式

```css
/* HEX 模式表格 */
.hex-row {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
}

.hex-address {
    width: 100px;
    color: var(--text-hint);
    text-align: right;
    padding-right: 16px;
    user-select: none;
}

.hex-data {
    font-family: var(--font-mono);
    letter-spacing: 0.5px;
    padding: 4px 16px;
}

.hex-ascii {
    width: 200px;
    color: var(--text-secondary);
    padding-left: 16px;
    border-left: 1px solid var(--border-color);
}

/* 选中高亮 */
.hex-row:hover {
    background: var(--bg-hover);
}

.hex-row.selected {
    background: var(--primary-light);
}
```

---

## 📄 Normal 模式实现

### 1. Normal 模式渲染

```javascript
function renderNormalMode() {
    // 纯文本显示，无格式化
    const text = filteredEntries
        .map(entry => entry.rawLine)
        .join('\n');
    
    // 使用 <pre> 标签保持格式
    elements.logBody.innerHTML = `
        <tr>
            <td colspan="100%" class="normal-mode-content">
                <pre>${escapeHtml(text)}</pre>
            </td>
        </tr>
    `;
    
    // 更新表头（隐藏）
    elements.logHead.innerHTML = '';
}
```

### 2. ANSI 颜色支持（可选）

```javascript
/**
 * 解析 ANSI 颜色码
 * @param {string} text - 包含 ANSI 码的文本
 * @returns {string} HTML 格式的彩色文本
 */
function parseAnsiColors(text) {
    const ansiRegex = /\x1b\[(\d+)m/g;
    const colorMap = {
        '30': 'black',
        '31': 'red',
        '32': 'green',
        '33': 'yellow',
        '34': 'blue',
        '35': 'magenta',
        '36': 'cyan',
        '37': 'white'
    };
    
    let html = '';
    let lastIndex = 0;
    let currentColor = null;
    
    text.replace(ansiRegex, (match, code, offset) => {
        // 添加前面的文本
        const textBefore = text.slice(lastIndex, offset);
        if (currentColor) {
            html += `<span style="color: ${currentColor}">${escapeHtml(textBefore)}</span>`;
        } else {
            html += escapeHtml(textBefore);
        }
        
        // 更新颜色
        if (code === '0') {
            currentColor = null; // 重置
        } else if (colorMap[code]) {
            currentColor = colorMap[code];
        }
        
        lastIndex = offset + match.length;
        return '';
    });
    
    // 添加剩余文本
    const remaining = text.slice(lastIndex);
    if (currentColor) {
        html += `<span style="color: ${currentColor}">${escapeHtml(remaining)}</span>`;
    } else {
        html += escapeHtml(remaining);
    }
    
    return html;
}
```

### 3. Normal 模式样式

```css
.normal-mode-content {
    padding: 0;
}

.normal-mode-content pre {
    margin: 0;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* 终端风格（可选） */
.normal-mode-content.terminal-style pre {
    background: #1e1e1e;
    color: #d4d4d4;
}
```

---

## ⚙️ 设置图标实现

### 1. HTML 结构

```html
<!-- 标题栏右上角 -->
<div class="title-bar-right">
    <button class="title-icon" id="btnTheme" title="切换主题">
        <i class="fas fa-moon"></i>
    </button>
    <button class="title-icon" id="btnSettings" title="设置 (Cmd+,)">
        <i class="fas fa-cog"></i>
    </button>
    <button class="title-icon" id="btnHelp" title="帮助">
        <i class="fas fa-question-circle"></i>
    </button>
</div>
```

### 2. JavaScript 事件

```javascript
// 设置按钮点击
elements.btnSettings.addEventListener('click', () => {
    openSettings();
});

// 快捷键支持
document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + ,
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
    }
});

function openSettings() {
    elements.settingsModal.style.display = 'flex';
    // 聚焦第一个输入框
    const firstInput = elements.settingsModal.querySelector('input');
    if (firstInput) firstInput.focus();
}
```

### 3. CSS 样式

```css
.title-bar-right {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-right: 16px;
}

.title-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    border-radius: var(--radius-xs);
}

.title-icon:hover {
    transform: scale(1.1);
    color: var(--primary);
    background: var(--bg-hover);
}

.title-icon:active {
    transform: scale(0.95);
}

/* 设置图标旋转动画 */
.title-icon#btnSettings:hover i {
    animation: rotate 0.5s ease-in-out;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(90deg); }
}
```

---

## 🚀 性能优化

### 1. 虚拟滚动优化

```javascript
class VirtualScroller {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        this.container.addEventListener('scroll', () => this.onScroll());
    }
    
    onScroll() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        this.visibleStart = Math.floor(scrollTop / this.itemHeight);
        this.visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);
        
        this.render();
    }
    
    render() {
        // 只渲染可见区域 + 缓冲区
        const buffer = 10;
        const start = Math.max(0, this.visibleStart - buffer);
        const end = Math.min(this.data.length, this.visibleEnd + buffer);
        
        // 渲染逻辑...
    }
}
```

### 2. 防抖和节流

```javascript
// 防抖 - 用于搜索输入
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流 - 用于滚动事件
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 使用
elements.searchInput.addEventListener('input', debounce(performSearch, 300));
elements.logContainer.addEventListener('scroll', throttle(onScroll, 100));
```

### 3. 批量 DOM 更新

```javascript
function batchUpdateDOM(updates) {
    // 使用 DocumentFragment 减少重排
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
        const element = document.createElement(update.tag);
        element.innerHTML = update.content;
        fragment.appendChild(element);
    });
    
    // 一次性插入
    targetElement.appendChild(fragment);
}
```

---

## 💾 数据持久化

### 1. 设置存储

**前端 (localStorage)**:
```javascript
const SETTINGS_KEY = 'mcu_log_debugger_settings';

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettings() {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : getDefaultSettings();
}

function getDefaultSettings() {
    return {
        displayMode: 'log',
        theme: 'light',
        autoScroll: true,
        showTimestamp: true,
        showLevel: true,
        showTag: true,
        defaultExportFormat: 'txt',
        autoSaveInterval: 30
    };
}
```

**后端 (Rust)**:
```rust
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
struct AppSettings {
    save_path: String,
    // 其他设置...
}

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let config_dir = app.path_resolver()
        .app_config_dir()
        .ok_or("无法获取配置目录")?;
    
    let config_file = config_dir.join("settings.json");
    
    if config_file.exists() {
        let content = fs::read_to_string(&config_file)
            .map_err(|e| e.to_string())?;
        let settings: AppSettings = serde_json::from_str(&content)
            .map_err(|e| e.to_string())?;
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}
```

---

## 🧪 测试策略

### 1. 单元测试

```javascript
// 测试 HEX 转换
describe('stringToHexLines', () => {
    it('should convert string to hex lines', () => {
        const input = 'Hello';
        const result = stringToHexLines(input, 16);
        
        expect(result).toHaveLength(1);
        expect(result[0].address).toBe('00000000');
        expect(result[0].hex).toContain('48 65 6C 6C 6F');
        expect(result[0].ascii).toBe('Hello');
    });
});
```

### 2. 集成测试

```javascript
// 测试模式切换
describe('Mode Switching', () => {
    it('should switch between modes', async () => {
        switchDisplayMode('hex');
        expect(displayMode).toBe('hex');
        expect(document.querySelector('.hex-row')).toBeTruthy();
        
        switchDisplayMode('normal');
        expect(displayMode).toBe('normal');
        expect(document.querySelector('.normal-mode-content')).toBeTruthy();
    });
});
```

---

## 📚 API 文档

### Tauri Commands

```rust
// 串口相关
list_serial_ports() -> Result<Vec<PortInfo>, String>
connect_serial(port: String, baud_rate: u32, ...) -> Result<String, String>
disconnect_serial() -> Result<String, String>

// 文件相关
save_log_file(content: String, filename: String, save_path: Option<String>) -> Result<String, String>
get_save_path() -> Result<String, String>
set_save_path(path: String) -> Result<String, String>

// 设置相关
load_settings() -> Result<AppSettings, String>
save_settings(settings: AppSettings) -> Result<String, String>
```

### 前端 API

```javascript
// 模式切换
switchDisplayMode(mode: 'log' | 'hex' | 'normal'): void

// 渲染
renderLogMode(): void
renderHexMode(): void
renderNormalMode(): void

// 视图锁定
lockView(reason: string): void
unlockView(): void
updateLockNotification(): void
onNewMessage(message: Object): void

// 工具函数
stringToHexLines(str: string, bytesPerLine: number): HexLine[]
parseAnsiColors(text: string): string
```

---

## 🔒 视图锁定实现

详细设计请参考: [VIEW_LOCK_FEATURE.md](VIEW_LOCK_FEATURE.md)

### 核心逻辑

```javascript
// 状态管理
const viewLockState = {
    isLocked: false,
    lockReason: null,
    newMessagesCount: 0,
    pendingMessages: []
};

// 锁定原因
const LOCK_REASON = {
    SEARCH: 'search',
    MANUAL: 'manual',
    AUTO_SCROLL_OFF: 'auto-scroll-off',
    USER_SCROLL: 'user-scroll'
};

// 接收新消息
function onNewMessage(message) {
    if (viewLockState.isLocked) {
        // 锁定：累积消息
        viewLockState.pendingMessages.push(message);
        viewLockState.newMessagesCount++;
        updateLockNotification();
    } else {
        // 未锁定：正常显示
        allEntries.push(message);
        renderLogTable();
        if (autoScroll) scrollToBottom();
    }
}

// 解锁并显示累积消息
function unlockView() {
    if (!viewLockState.isLocked) return;
    
    // 批量添加消息
    allEntries.push(...viewLockState.pendingMessages);
    
    // 重置状态
    viewLockState.isLocked = false;
    viewLockState.pendingMessages = [];
    viewLockState.newMessagesCount = 0;
    
    // 更新显示
    renderLogTable();
    hideLockNotification();
    
    if (autoScroll) scrollToBottom();
}
```

### 自动锁定触发

```javascript
// 1. 搜索时
elements.searchInput.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
        lockView(LOCK_REASON.SEARCH);
    } else if (viewLockState.lockReason === LOCK_REASON.SEARCH) {
        unlockView();
    }
});

// 2. 关闭自动滚动时
elements.autoScrollToggle.addEventListener('change', (e) => {
    if (!e.target.checked) {
        lockView(LOCK_REASON.AUTO_SCROLL_OFF);
    } else if (viewLockState.lockReason === LOCK_REASON.AUTO_SCROLL_OFF) {
        unlockView();
    }
});

// 3. 用户滚动到非底部时
elements.logContainer.addEventListener('scroll', throttle(() => {
    const isAtBottom = checkIfAtBottom();
    
    if (!isAtBottom && !viewLockState.isLocked && !autoScroll) {
        lockView(LOCK_REASON.USER_SCROLL);
    } else if (isAtBottom && viewLockState.lockReason === LOCK_REASON.USER_SCROLL) {
        unlockView();
    }
}, 200));
```

---

## 🔗 相关文档

- [开发路线图](ROADMAP.md)
- [功能评审](FEATURE_REVIEW.md)
- [UI 改进计划](UI_IMPROVEMENTS.md)

---

**最后更新**: 2026-02-08
**作者**: 技术团队
**状态**: 📝 编写中
