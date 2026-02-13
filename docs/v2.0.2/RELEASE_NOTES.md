# v2.0.2 Release Notes

## 概述
本版本为 v2.0.1 的小版本迭代，主要包含：
- macOS 虚拟串口测试指南补齐（便于在 Mac mini / macOS 环境快速验证）
- GitHub Actions Windows 打包工作流优化（用于稳定产出 MSI/NSIS 安装包）
- 若干 UI/交互细节修复与样式架构优化（badge、搜索开关高亮、动画统一等）

---

## 变更内容

### 1. 测试
- 新增：`docs/测试/macOS_虚拟串口测试指南.md`
  - 说明如何使用 `socat` 创建虚拟串口对
  - 说明如何使用 `test_log_simulator.py` 进行场景/持续/突发发送
  - 说明 MCU Log Debugger 端如何连接端口并验证过滤/搜索/导出

### 2. CI / 打包
- 更新：`.github/workflows/build-windows.yml`
  - 增加 `npm ci` 安装前端依赖
  - 开启 `setup-node` npm cache
  - 直接使用 `tauri build` 产出 Windows 安装包并上传 artifact / release

### 3. UI / UX
- 收藏夹角标：`bookmark-badge` 尺寸与定位优化（更小、更稳定）
- 搜索模式开关按钮：激活态高亮全局统一（token 化）
- 动画：集中到 `public/styles/core/animations.css`，避免重复 keyframes

---

## 兼容性
- Tauri v1.x
- Node.js 20
- Rust stable

---

## 升级说明
- 无需迁移数据。
- 若你依赖旧的 `public/style.css`，该文件已被拆分为 `public/styles/**` 并在 `index.html` 中按模块引入。

