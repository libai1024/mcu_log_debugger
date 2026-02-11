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
[开发路线](#-开发路线) •
[文档](#-文档)

</div>

---

## 📌 当前版本

**v1.0.1-dev** (开发中)

- 查看 [v1.0.0 文档](docs/v1.0.0/)
- 查看 [v1.0.1 开发计划](docs/v1.0.1/ROADMAP.md)

## ✨ 功能特性

### 核心功能

- 🔌 **串口通信** - 支持自动检测、多波特率、虚拟串口测试
- 📊 **多模式显示** - Log 模式、HEX 模式、Normal 模式
- 🔍 **智能过滤** - 级别/Tag/关键字多维度过滤
- 📖 **书签管理** - 标记重要日志，快速导航
- 🔎 **高级搜索** - 支持正则表达式、历史记录
- 💾 **多格式导出** - TXT/CSV/JSON
- ⚙️ **设置管理** - 保存路径、导出格式、自动保存配置
- 🎨 **双主题** - 亮色/暗色主题
- 🖥️ **跨平台** - macOS / Windows / Linux

## 🚀 快速开始

### 环境要求

- **Rust** 1.70+ ([安装](https://rustup.rs/))
- **Node.js** 18+
- **Tauri CLI**: `npm install -g @tauri-apps/cli@1`

### 运行开发模式

```bash
cd /Users/wangwei/Desktop/Projects/log_stm32_helper
tauri dev
```

### 打包应用

```bash
tauri build
```

详细说明请查看 [v1.0.0 构建指南](docs/v1.0.0/BUILD_GUIDE.md)

## 🗺️ 开发路线

### v1.0.0 ✅ (已完成)

- ✅ 串口通信与实时日志显示
- ✅ 多维度过滤和搜索
- ✅ 书签和导出功能
- ✅ 设置管理与持久化
- ✅ 双主题 UI
- ✅ 跨平台支持

### v1.0.1 🚧 (开发中)

查看详细计划: [docs/v1.0.1/ROADMAP.md](docs/v1.0.1/ROADMAP.md)

**主要改进**:
- 🔄 三种显示模式切换 (Log/HEX/Normal)
- ⚙️ 设置入口优化（移至右上角图标）
- 🎨 UI/UX 改进（向主流串口助手靠近）
- 🐛 Bug 修复和性能优化

### v1.1.0 📋 (计划中)

- 发送功能增强
- 数据统计和可视化
- 插件系统
- 更多...

## 📚 文档

### v1.0.0 文档
- [构建指南](docs/v1.0.0/BUILD_GUIDE.md)
- [测试指南](docs/v1.0.0/TEST_GUIDE.md)
- [日志协议](docs/v1.0.0/LOG_PROTOCOL.md)
- [快速参考](docs/v1.0.0/QUICK_REFERENCE.md)

### v1.0.1 文档
- [开发路线图](docs/v1.0.1/ROADMAP.md)
- [功能评审](docs/v1.0.1/FEATURE_REVIEW.md)
- [UI 改进计划](docs/v1.0.1/UI_IMPROVEMENTS.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/)
- [serialport-rs](https://github.com/serialport/serialport-rs)
- [Font Awesome](https://fontawesome.com/)
