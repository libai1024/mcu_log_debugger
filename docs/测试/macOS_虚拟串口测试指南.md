# macOS 环境测试指南（虚拟串口 + Python 日志模拟器）

本指南用于在 **macOS（Mac mini）** 上，通过 **虚拟串口对** 配合项目自带的 `test_log_simulator.py`，向 MCU Log Debugger 发送模拟日志，完成端到端 UI/过滤/搜索/导出等功能验证。

---

## 0. 你将得到什么

- 1 对互通的虚拟串口（A <-> B）
- 让 MCU Log Debugger 连接其中一个串口（例如 B）
- 用 `test_log_simulator.py` 向另一个串口（例如 A）持续发送日志

---

## 1. 前置条件

### 1.1 安装 `socat`（用于创建虚拟串口对）

使用 Homebrew：

```bash
brew install socat
```

### 1.2 安装 Python 依赖 `pyserial`

建议使用虚拟环境（可选，但推荐）：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install pyserial
```

不使用虚拟环境也可以：

```bash
pip3 install pyserial
```

---

## 2. 创建虚拟串口对（关键步骤）

在终端 1 执行：

```bash
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```

你会看到类似输出（示例）：

```text
2026/.. socat[...] N PTY is /dev/ttys012
2026/.. socat[...] N PTY is /dev/ttys013
```

记下这两个串口路径：

- 串口 A：`/dev/ttys012`
- 串口 B：`/dev/ttys013`

注意：
- `socat` 进程 **必须保持运行**，不要关闭这个终端，否则虚拟串口会消失。
- 有时 macOS 应用更偏好 `cu.*`，但 `socat` 通常只给 `ttys*`；本项目 UI 中如果能列出 `tty.*` 就可直接使用。

---

## 3. MCU Log Debugger 端连接（接收端）

1. 打开 MCU Log Debugger
2. 点击刷新串口
3. 选择 **串口 B**（例如 `/dev/ttys013`）
4. 点击 **连接串口**

如果连接成功，状态会变为已连接，并且后续能看到日志滚动。

---

## 4. 使用 `test_log_simulator.py` 发送日志（发送端）

在终端 2（新的终端）进入项目根目录，执行：

### 4.1 场景演示模式（推荐首次测试）

```bash
python3 test_log_simulator.py --port /dev/ttys012 --mode scenarios --baud 115200
```

该模式会依次发送：
- 启动 banner
- 传感器数据
- WiFi 错误/恢复
- DEBUG trace

### 4.2 持续发送模式（验证过滤/搜索/性能）

每秒 1 条：

```bash
python3 test_log_simulator.py --port /dev/ttys012 --mode continuous --interval 1
```

更快（每 0.1 秒 1 条）：

```bash
python3 test_log_simulator.py --port /dev/ttys012 --mode continuous --interval 0.1
```

突发模式（随机短时间高频发送）：

```bash
python3 test_log_simulator.py --port /dev/ttys012 --mode continuous --interval 0.1 --burst
```

---

## 5. 推荐测试用例（快速验证 v2.0.x 功能）

### 5.1 级别筛选
- 打开“日志级别”多选下拉
- 勾选/取消不同级别，确认表格实时刷新
- 观察下拉选项高亮，以及触发器文本彩色 chips（V/D/I/W/E）

### 5.2 Tag 过滤
- 点击 Tag 名称/空白区域/按钮均能切换选择
- 全选/取消全选可用

### 5.3 搜索
- 输入关键字，确认高亮与计数变化
- 上一条/下一条跳转工作正常
- 区分大小写/全词/正则开关按钮：开启后高亮样式正确

### 5.4 导出/保存
- 点击导出按钮，确认能调用后端保存（在 Tauri 环境）
- 设置中选择保存路径并保存

---

## 6. 常见问题排查

### 6.1 应用里找不到 `/dev/ttys*`
- 确认 `socat` 仍在运行
- 点击“刷新串口”
- 若 UI 只显示 `cu.*`，可尝试：
  - 继续用 `socat` 输出的 `ttys*`（有些环境仍能连接）
  - 或改用其他虚拟串口工具（如 `tty0tty` 仅 Linux；macOS 推荐仍是 socat）

### 6.2 脚本报错 `SerialException`
- 确认传入的 `--port` 是 `socat` 打印的串口路径
- 确认没有把同一个端口同时给 App 和脚本使用

### 6.3 App 已连接但没有日志
- 检查 App 连接的是 **B**，脚本发送的是 **A**
- 交换 A/B 再试一次

---

## 7. 参考
- 脚本：`test_log_simulator.py`
- 协议文档（如需对齐日志格式）：`docs/v1.0.0/LOG_PROTOCOL.md`

