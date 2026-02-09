# 快速测试指南

## 一键设置并测试

### 步骤1: 设置环境（首次运行）

```bash
# 进入项目目录
cd /Users/wangwei/Desktop/Projects/log_stm32_helper

# 运行设置脚本
./setup_test_env.sh

# 激活虚拟环境
source venv/bin/activate
```

### 步骤2: 创建虚拟串口对

**打开一个新终端窗口**，运行：

```bash
# 如果没有安装 socat
brew install socat

# 创建虚拟串口对（保持此窗口运行）
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```

记下输出的两个串口，例如：
```
2024/02/08 15:30:00 socat[12345] N PTY is /dev/ttys001
2024/02/08 15:30:00 socat[12345] N PTY is /dev/ttys002
```

### 步骤3: 运行日志模拟器

**回到第一个终端**（已激活虚拟环境），运行：

```bash
# 使用 socat 输出的第一个串口
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous
```

### 步骤4: 启动日志助手

**打开第三个终端窗口**，运行：

```bash
cd /Users/wangwei/Desktop/Projects/log_stm32_helper

# 启动应用
npm run tauri dev
```

### 步骤5: 连接并查看日志

1. 在日志助手应用中，选择串口 `/dev/ttys002`（socat的第二个串口）
2. 点击"连接串口"
3. 观察日志实时显示！

## 测试不同场景

### 场景模式（演示）
```bash
python3 test_log_simulator.py --port /dev/ttys001
```

### 持续模式（每秒1条）
```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous
```

### 快速模式（每0.1秒1条）
```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --interval 0.1
```

### 压力测试（突发大量日志）
```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --burst
```

## 停止测试

1. 模拟器终端: 按 `Ctrl+C`
2. 日志助手: 点击"断开连接"
3. socat终端: 按 `Ctrl+C`
4. 退出虚拟环境: `deactivate`

## 常见问题

**Q: 找不到串口？**
A: 确保 socat 正在运行，使用 `ls /dev/tty*` 查看可用串口

**Q: 权限错误？**
A: macOS通常不需要额外权限，Linux可能需要 `sudo chmod 666 /dev/ttyUSB0`

**Q: 串口被占用？**
A: 关闭其他串口工具，重新创建虚拟串口对

详细文档请查看 [TEST_GUIDE.md](./TEST_GUIDE.md)
