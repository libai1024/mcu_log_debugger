# 视图锁定功能设计文档

## 📋 功能概述

视图锁定功能允许用户在查看历史日志或搜索时，冻结当前视图，防止新消息滚动干扰。这是主流串口助手的标配功能，极大提升用户体验。

---

## 🎯 使用场景

### 场景 1: 搜索时锁定
```
用户操作: 输入搜索关键词 "ERROR"
系统行为:
  1. 自动锁定视图
  2. 高亮显示搜索结果
  3. 新消息在后台累积
  4. 右下角显示 "+5 条新消息"
  5. 用户可以专注查看搜索结果
```

### 场景 2: 关闭自动滚动时锁定
```
用户操作: 点击关闭"自动滚动"
系统行为:
  1. 自动锁定视图
  2. 保持当前滚动位置
  3. 新消息累积提示
  4. 用户可以查看历史日志
```

### 场景 3: 手动滚动时锁定
```
用户操作: 向上滚动查看历史日志
系统行为:
  1. 检测到滚动位置不在底部
  2. 自动锁定视图
  3. 显示新消息提示
  4. 提供快速返回底部的方式
```

### 场景 4: 手动锁定
```
用户操作: 点击工具栏的锁定按钮 🔒
系统行为:
  1. 立即锁定视图
  2. 显示锁定状态
  3. 累积新消息
  4. 用户可以安心分析当前内容
```

---

## 🎨 UI 设计

### 1. 工具栏锁定按钮

**位置**: 工具栏左侧，模式切换器旁边

**状态**:
```
未锁定: [🔓] 或 [🔓 自动]
已锁定: [🔒 已锁定]
```

**样式**:
```css
.btn-lock {
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-lock.locked {
    background: var(--warning);
    border-color: var(--warning);
    color: white;
}

.btn-lock:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

### 2. 新消息提示卡片

**位置**: 右下角悬浮，距离边缘 24px

**设计方案 A - 紧凑型**:
```
┌──────────────┐
│ 🔒 已锁定     │
│ +23 条新消息  │
│ [解锁查看]    │
└──────────────┘
```

**设计方案 B - 详细型**:
```
┌────────────────────┐
│ 🔒 视图已锁定       │
│                    │
│ 有 23 条新消息     │
│ 等待查看           │
│                    │
│ [解锁] [忽略]      │
└────────────────────┘
```

**推荐**: 方案 A（紧凑型）

**HTML 结构**:
```html
<div class="lock-notification" id="lockNotification">
    <div class="lock-header">
        <i class="fas fa-lock"></i>
        <span class="lock-title">视图已锁定</span>
    </div>
    <div class="lock-count">
        <span class="count-number">+23</span>
        <span class="count-text">条新消息</span>
    </div>
    <button class="btn-unlock" id="btnUnlockView">
        <i class="fas fa-unlock"></i>
        解锁查看
    </button>
</div>
```

**CSS 样式**:
```css
.lock-notification {
    position: fixed;
    right: 24px;
    bottom: 24px;
    min-width: 200px;
    background: var(--bg-primary);
    border: 2px solid var(--warning);
    border-radius: var(--radius-md);
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideInUp 0.3s ease;
}

@keyframes slideInUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.lock-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--warning);
    font-weight: 600;
}

.lock-count {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 12px;
}

.count-number {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
}

.count-text {
    font-size: 13px;
    color: var(--text-secondary);
}

.btn-unlock {
    width: 100%;
    padding: 8px 16px;
    background: var(--primary);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-unlock:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
}
```

### 3. 锁定状态指示器

**位置**: 日志显示区域顶部（可选）

```
┌─────────────────────────────────────────────────┐
│ 🔒 视图已锁定 - 新消息将在后台累积              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [日志内容]                                      │
│                                                 │
```

---

## 💻 技术实现

### 1. 状态管理

```javascript
// 锁定状态
const viewLockState = {
    isLocked: false,
    lockReason: null,  // 'search' | 'manual' | 'auto-scroll-off' | 'user-scroll'
    newMessagesCount: 0,
    lockTimestamp: null,
    pendingMessages: []  // 锁定期间的新消息
};

// 锁定原因枚举
const LOCK_REASON = {
    SEARCH: 'search',           // 搜索时自动锁定
    MANUAL: 'manual',           // 用户手动锁定
    AUTO_SCROLL_OFF: 'auto-scroll-off',  // 关闭自动滚动
    USER_SCROLL: 'user-scroll'  // 用户滚动到非底部
};
```

### 2. 核心函数

```javascript
/**
 * 锁定视图
 * @param {string} reason - 锁定原因
 */
function lockView(reason) {
    if (viewLockState.isLocked) return;
    
    viewLockState.isLocked = true;
    viewLockState.lockReason = reason;
    viewLockState.lockTimestamp = Date.now();
    viewLockState.newMessagesCount = 0;
    viewLockState.pendingMessages = [];
    
    // 更新 UI
    updateLockButton(true);
    
    // 记录日志
    console.log(`[View Lock] Locked due to: ${reason}`);
}

/**
 * 解锁视图
 */
function unlockView() {
    if (!viewLockState.isLocked) return;
    
    const reason = viewLockState.lockReason;
    const messageCount = viewLockState.newMessagesCount;
    
    // 重置状态
    viewLockState.isLocked = false;
    viewLockState.lockReason = null;
    viewLockState.newMessagesCount = 0;
    
    // 处理待处理的消息
    if (viewLockState.pendingMessages.length > 0) {
        // 批量添加到显示列表
        allEntries.push(...viewLockState.pendingMessages);
        viewLockState.pendingMessages = [];
        
        // 重新渲染
        renderLogTable();
    }
    
    // 更新 UI
    updateLockButton(false);
    hideLockNotification();
    
    // 如果自动滚动开启，滚动到底部
    if (autoScroll) {
        scrollToBottom();
    }
    
    // 显示提示
    if (messageCount > 0) {
        showStatus(`已解锁，显示 ${messageCount} 条新消息`, 'info');
    }
    
    console.log(`[View Lock] Unlocked. Processed ${messageCount} messages.`);
}

/**
 * 接收新消息时的处理
 * @param {Object} message - 新消息对象
 */
function onNewMessage(message) {
    if (viewLockState.isLocked) {
        // 锁定状态：累积消息
        viewLockState.pendingMessages.push(message);
        viewLockState.newMessagesCount++;
        
        // 更新提示卡片
        updateLockNotification();
    } else {
        // 未锁定：正常处理
        allEntries.push(message);
        renderLogTable();
        
        if (autoScroll) {
            scrollToBottom();
        }
    }
}

/**
 * 更新锁定按钮状态
 * @param {boolean} isLocked - 是否锁定
 */
function updateLockButton(isLocked) {
    const btn = document.getElementById('btnLock');
    if (!btn) return;
    
    if (isLocked) {
        btn.classList.add('locked');
        btn.innerHTML = '<i class="fas fa-lock"></i> 已锁定';
        btn.title = '点击解锁视图 (Cmd+L)';
    } else {
        btn.classList.remove('locked');
        btn.innerHTML = '<i class="fas fa-unlock"></i> 自动';
        btn.title = '点击锁定视图 (Cmd+L)';
    }
}

/**
 * 显示/更新锁定通知
 */
function updateLockNotification() {
    let notification = document.getElementById('lockNotification');
    
    if (!viewLockState.isLocked) {
        if (notification) {
            notification.remove();
        }
        return;
    }
    
    if (!notification) {
        // 创建通知元素
        notification = document.createElement('div');
        notification.id = 'lockNotification';
        notification.className = 'lock-notification';
        document.body.appendChild(notification);
    }
    
    // 更新内容
    notification.innerHTML = `
        <div class="lock-header">
            <i class="fas fa-lock"></i>
            <span class="lock-title">视图已锁定</span>
        </div>
        <div class="lock-count">
            <span class="count-number">+${viewLockState.newMessagesCount}</span>
            <span class="count-text">条新消息</span>
        </div>
        <button class="btn-unlock" onclick="unlockView()">
            <i class="fas fa-unlock"></i>
            解锁查看
        </button>
    `;
}

/**
 * 隐藏锁定通知
 */
function hideLockNotification() {
    const notification = document.getElementById('lockNotification');
    if (notification) {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }
}
```

### 3. 事件监听

```javascript
// 搜索时自动锁定
elements.searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    
    if (keyword) {
        // 有搜索内容，锁定视图
        lockView(LOCK_REASON.SEARCH);
    } else {
        // 清空搜索，询问是否解锁
        if (viewLockState.lockReason === LOCK_REASON.SEARCH) {
            unlockView();
        }
    }
    
    performSearch();
});

// 自动滚动切换时
elements.autoScrollToggle.addEventListener('change', (e) => {
    autoScroll = e.target.checked;
    
    if (autoScroll) {
        // 开启自动滚动，解锁
        if (viewLockState.lockReason === LOCK_REASON.AUTO_SCROLL_OFF) {
            unlockView();
        }
    } else {
        // 关闭自动滚动，锁定
        lockView(LOCK_REASON.AUTO_SCROLL_OFF);
    }
});

// 用户滚动时
elements.logContainer.addEventListener('scroll', throttle(() => {
    const container = elements.logContainer;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    
    if (isAtBottom) {
        // 滚动到底部，解锁
        if (viewLockState.lockReason === LOCK_REASON.USER_SCROLL) {
            unlockView();
        }
    } else {
        // 不在底部，锁定
        if (!viewLockState.isLocked && !autoScroll) {
            lockView(LOCK_REASON.USER_SCROLL);
        }
    }
}, 200));

// 手动锁定按钮
document.getElementById('btnLock').addEventListener('click', () => {
    if (viewLockState.isLocked) {
        unlockView();
    } else {
        lockView(LOCK_REASON.MANUAL);
    }
});

// 快捷键 Cmd/Ctrl + L
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        
        if (viewLockState.isLocked) {
            unlockView();
        } else {
            lockView(LOCK_REASON.MANUAL);
        }
    }
});

// 跳转到底部按钮（自动解锁）
elements.scrollToBottom.addEventListener('click', () => {
    unlockView();
    scrollToBottom();
});
```

### 4. 性能优化

```javascript
/**
 * 批量处理待处理消息（优化性能）
 */
function processPendingMessages() {
    if (viewLockState.pendingMessages.length === 0) return;
    
    // 使用 requestAnimationFrame 分批处理
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < viewLockState.pendingMessages.length; i += batchSize) {
        batches.push(viewLockState.pendingMessages.slice(i, i + batchSize));
    }
    
    function processBatch(index) {
        if (index >= batches.length) {
            // 所有批次处理完成
            renderLogTable();
            return;
        }
        
        // 处理当前批次
        allEntries.push(...batches[index]);
        
        // 处理下一批次
        requestAnimationFrame(() => processBatch(index + 1));
    }
    
    processBatch(0);
}
```

---

## 🧪 测试用例

### 测试 1: 搜索时自动锁定
```
1. 打开应用，连接串口
2. 输入搜索关键词 "ERROR"
3. 验证：视图自动锁定
4. 验证：新消息在后台累积
5. 验证：右下角显示新消息数量
6. 清空搜索
7. 验证：视图自动解锁
```

### 测试 2: 关闭自动滚动时锁定
```
1. 打开应用，连接串口
2. 关闭"自动滚动"开关
3. 验证：视图自动锁定
4. 验证：新消息累积提示
5. 开启"自动滚动"
6. 验证：视图自动解锁并滚动到底部
```

### 测试 3: 手动滚动时锁定
```
1. 打开应用，连接串口
2. 向上滚动查看历史日志
3. 验证：视图自动锁定
4. 验证：新消息提示出现
5. 滚动到底部
6. 验证：视图自动解锁
```

### 测试 4: 手动锁定/解锁
```
1. 打开应用，连接串口
2. 点击锁定按钮
3. 验证：视图锁定
4. 验证：按钮状态改变
5. 点击解锁按钮
6. 验证：视图解锁
7. 验证：显示累积的新消息
```

### 测试 5: 快捷键
```
1. 打开应用
2. 按 Cmd/Ctrl + L
3. 验证：视图锁定
4. 再按 Cmd/Ctrl + L
5. 验证：视图解锁
```

### 测试 6: 大量消息累积
```
1. 锁定视图
2. 模拟接收 1000 条消息
3. 验证：提示卡片显示正确数量
4. 解锁视图
5. 验证：所有消息正确显示
6. 验证：性能流畅，无卡顿
```

---

## 📊 性能指标

- 锁定/解锁响应时间: < 50ms
- 1000 条消息累积处理: < 500ms
- 内存占用增加: < 10MB
- UI 更新帧率: 保持 60fps

---

## 🔗 相关文档

- [开发路线图](ROADMAP.md)
- [功能评审](FEATURE_REVIEW.md)
- [UI 改进计划](UI_IMPROVEMENTS.md)
- [技术实现细节](TECHNICAL_DETAILS.md)

---

**最后更新**: 2026-02-08
**作者**: 开发团队
**状态**: 📝 设计完成，待实现
