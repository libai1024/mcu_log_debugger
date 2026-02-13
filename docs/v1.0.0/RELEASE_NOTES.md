# v1.0.0 Release Notes

## 概述
v1.0.0 为项目早期版本（v1 系列的基础能力），围绕“串口日志接收 + 表格展示 + 基础过滤/搜索 + 协议规范”提供了完整可用的端到端闭环。

本版本相关文档集中在：
- `docs/v1.0.0/README.md`
- `docs/v1.0.0/LOG_PROTOCOL.md`
- `docs/v1.0.0/TEST_GUIDE.md`
- `docs/v1.0.0/TESTING_QUICKSTART.md`
- `docs/v1.0.0/VIRTUAL_PORT_SETUP.md`

---

## 核心能力

### 串口与数据流
- 串口连接、接收与基本状态展示
- 按协议解析日志行并渲染

### 日志协议与规范
- 发布日志协议文档：`LOG_PROTOCOL.md`
- 协议合规说明：`PROTOCOL_COMPLIANCE.md`

### 测试与虚拟串口
- 提供测试快速开始与详细测试指南
- 提供虚拟串口的搭建说明（用于本地自测与联调）

---

## 测试建议（macOS / Linux）
- 按 `docs/v1.0.0/VIRTUAL_PORT_SETUP.md` 创建虚拟串口对
- 按 `docs/v1.0.0/TESTING_QUICKSTART.md` 或 `TEST_GUIDE.md` 执行验证

---

## 兼容性
- Tauri v1.x
- Rust stable
- Node.js（用于前端资源构建/运行，具体以当时工程配置为准）

