# MCU Log Debugger

<div align="center">

<img src="src-tauri/icons/icon.png" width="128" height="128" alt="MCU Log Debugger Icon" style="border-radius: 22%;">

**现代化的 MCU 串口日志调试助手**

基于 **Tauri + Rust + Web** 技术栈

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-1.5+-blue.svg)](https://tauri.app/)

[功能特性](#-功能特性) •
[快速开始](#-快速开始) •
[使用指南](#-使用指南) •
[开发文档](#-开发文档) •
[构建发布](#-构建发布)

</div>

---

## ✨ 为什么选择 Tauri？

| 对比项 | Electron | Tauri |
|--------|----------|-------|
| 包体积 | ~150MB | ~5MB |
| 内存占用 | 高 | 低 |
| 启动速度 | 较慢 | 快 |
| 安全性 | 一般 | 高 |
| 开发体验 | 好 | 好 |

## 🚀 快速开始

### 环境要求

- **Rust** 1.70+ ([安装](https://rustup.rs/))
- **Node.js** 16+

### 一键安装

```bash
# macOS / Linux
./install.sh

# Windows
install.bat
```

或手动安装：

```bash
# 1. 安装 Rust (如果还没有)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Tauri CLI
cargo install tauri-cli

# 3. 安装 Node 依赖
npm install
```

### 运行开发模式

```bash
cargo tauri dev
```

首次编译需要几分钟，请耐心等待。

### 打包应用

```bash
# 打包当前平台
cargo tauri build

# 输出位置:
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
```

## ✨ 功能特性

### 核心功能

- 🔌 **串口通信** - 支持自动检测、多波特率、虚拟串口测试
- 📊 **日志解析** - 严格遵循 LOG_PROTOCOL 标准格式
- 🔍 **智能过滤** - 级别/Tag/关键字多维度过滤
- 📖 **书签管理** - 标记重要日志，快速导航
- 🔎 **高级搜索** - 支持正则表达式、历史记录、快速导航
- 💾 **多格式导出** - TXT/CSV/JSON，自定义保存路径
- ⚙️ **设置管理** - 保存路径、导出格式、自动保存配置持久化
- 🎨 **双主题** - 亮色/暗色主题，自动切换
- 🖥️ **跨平台** - macOS / Windows / Linux 完整支持

### UI/UX 特性

- 🎨 **现代化设计** - 圆角图标、流畅动画、精美配色
- 🎯 **自定义下拉框** - 键盘导航、动画效果、美观样式
- 📊 **实时统计** - 各级别日志计数、实时更新
- 🔢 **虚拟滚动** - 大量日志流畅显示
- 🌈 **级别着色** - DEBUG/INFO/WARN/ERROR 不同颜色
- 🔧 **HEX 模式** - 查看原始十六进制数据
- 📍 **位置显示** - 显示日志来源文件和行号
- 🔔 **Toast 通知** - 优雅的操作反馈

## 📋 日志格式支持

```
[00:00:00.000] [INFO] [MAIN] System initialized
[00:00:01.234] [DEBUG] [SENSOR] Temperature: 25.3 C
[00:00:02.456] [WARN] [WIFI] Connection timeout
[00:00:03.789] [ERROR] [MAIN] Failed (main.c:42)
```

## 🧪 虚拟串口测试

### macOS

```bash
brew install socat
socat -d -d pty,raw,echo=0 pty,raw,echo=0

# 使用输出的设备路径测试
```

### Windows

使用 [com0com](https://com0com.sourceforge.net/) 创建虚拟串口对。

## 📁 项目结构

```
.
├── Cargo.toml              # Rust 项目配置
├── package.json            # Node 配置
├── src-tauri/
│   ├── src/main.rs         # Rust 主程序
│   └── tauri.conf.json     # Tauri 配置
├── public/
│   ├── index.html          # 前端页面
│   ├── style.css           # 样式
│   └── app.js              # 前端逻辑
└── install.sh              # 安装脚本
```

## 🔧 开发说明

### 修改前端

直接编辑 `public/` 目录下的 HTML/CSS/JS 文件，保存后自动刷新。

### 修改后端

编辑 `src-tauri/src/main.rs`，需要重新编译。

### 添加功能

Tauri 通过 `invoke` 实现前后端通信：

```rust
// Rust 后端
#[tauri::command]
fn my_function(arg: String) -> String {
    format!("Hello {}", arg)
}
```

```javascript
// 前端调用
const result = await window.__TAURI__.invoke('my_function', { arg: 'World' });
```

## 📚 文档索引

- **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - 完整构建和打包指南
- **[CROSS_COMPILE_WINDOWS.md](CROSS_COMPILE_WINDOWS.md)** - Windows 交叉编译详解
- **[TEST_GUIDE.md](TEST_GUIDE.md)** - 测试指南和虚拟串口设置
- **[LOG_PROTOCOL.md](LOG_PROTOCOL.md)** - 日志协议规范
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - 快速参考手册

## 🚀 构建发布

### 本地构建

```bash
# macOS
tauri build

# Windows (在 GitHub Actions 中自动构建)
# 参见 BUILD_GUIDE.md
```

### GitHub Actions

项目已配置自动化构建流程：

- **手动构建**: Actions → Build Windows App → Run workflow
- **自动发布**: 推送版本标签 `v1.0.0` 自动构建所有平台

详见 [BUILD_GUIDE.md](BUILD_GUIDE.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台框架
- [serialport-rs](https://github.com/serialport/serialport-rs) - Rust 串口库
- [Font Awesome](https://fontawesome.com/) - 图标库
