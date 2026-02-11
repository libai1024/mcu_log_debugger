# MCU日志助手 - 测试指南

本指南介绍如何使用Python脚本模拟STM32设备发送日志数据，用于测试MCU日志助手应用。

## 快速开始

### 1. 设置测试环境

```bash
# 给脚本添加执行权限
chmod +x setup_test_env.sh

# 运行设置脚本
./setup_test_env.sh

# 激活虚拟环境
source venv/bin/activate
```

### 2. 创建虚拟串口对（macOS/Linux）

#### macOS

```bash
# 安装 socat
brew install socat

# 创建虚拟串口对
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```

输出示例：
```
2024/02/08 15:30:00 socat[12345] N PTY is /dev/ttys001
2024/02/08 15:30:00 socat[12345] N PTY is /dev/ttys002
```

记下这两个串口路径：
- `/dev/ttys001` - 用于日志模拟器
- `/dev/ttys002` - 用于MCU日志助手

**注意**: 保持 `socat` 命令运行，不要关闭终端窗口。

#### Linux

```bash
# 安装 socat
sudo apt-get install socat

# 创建虚拟串口对
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```

### 3. 运行日志模拟器

#### 场景演示模式（默认）

模拟系统启动、传感器读取、错误恢复等场景：

```bash
python3 test_log_simulator.py --port /dev/ttys001
```

#### 持续模式

持续发送随机日志（每秒1条）：

```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous
```

#### 快速模式

快速发送日志（每0.1秒1条）：

```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --interval 0.1
```

#### 突发模式

随机触发突发日志（快速发送大量日志，测试性能）：

```bash
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --burst
```

### 4. 启动MCU日志助手

1. 在另一个终端窗口，启动Tauri应用：
   ```bash
   npm run tauri dev
   ```

2. 在应用中选择串口 `/dev/ttys002`（socat创建的另一个端口）

3. 点击"连接串口"

4. 观察日志实时显示

## 命令行参数

```bash
python3 test_log_simulator.py [选项]

必需参数:
  --port, -p PATH       串口设备路径 (如: /dev/ttys001)

可选参数:
  --baud, -b RATE       波特率 (默认: 115200)
  --mode, -m MODE       运行模式: scenarios 或 continuous (默认: scenarios)
  --interval, -i SEC    持续模式下的发送间隔(秒) (默认: 1.0)
  --burst               启用突发模式（随机快速发送大量日志）
  --help, -h            显示帮助信息
```

## 测试场景

### 场景1: 系统启动
模拟MCU启动过程，包括硬件初始化、传感器初始化、文件系统挂载等。

### 场景2: 传感器数据读取
连续读取温度和湿度数据，每条日志包含文件位置信息。

### 场景3: 错误和恢复
模拟传感器读取失败、重试、恢复的完整流程。

### 场景4: 持续随机日志
随机生成各种级别的日志，包括：
- VERBOSE: 函数调用、变量值
- DEBUG: 状态机、通信数据、GPIO状态
- INFO: 系统状态、任务启动、配置加载
- WARN: 资源警告、超时、电量低
- ERROR: 硬件故障、通信失败、校验错误

## 日志格式

所有日志严格遵循 `LOG_PROTOCOL.md` 定义的格式：

```
[HH:MM:SS.mmm] [LEVEL] [TAG] 消息内容 (文件名:行号)
```

示例：
```
[15:30:45.123] [INFO] [SENSOR] 温度: 25°C, 湿度: 55% (sensor.c:156)
[15:30:46.234] [ERROR] [COMM] 通信超时: 无响应 (comm.c:89)
[15:30:47.345] [WARN] [POWER] 电池电量低: 15% (power.c:234)
```

## 测试功能点

使用模拟器可以测试以下功能：

### 基础功能
- [x] 串口连接/断开
- [x] 实时日志接收
- [x] 日志级别颜色显示
- [x] 时间戳显示
- [x] Tag显示
- [x] 文件位置显示

### 过滤功能
- [x] 按日志级别过滤
- [x] 按Tag过滤
- [x] 关键字搜索（普通/正则）
- [x] 搜索历史

### 性能测试
- [x] 大量日志处理（突发模式）
- [x] 虚拟滚动
- [x] 自动滚动
- [x] 内存管理（最大10000条）

### UI功能
- [x] 深色/浅色主题切换
- [x] 自定义下拉框
- [x] Toast通知
- [x] 书签/固定日志
- [x] 右键菜单
- [x] 日志导出

## 使用真实串口

如果有真实的USB转串口设备：

```bash
# 查看可用串口
ls /dev/cu.* # macOS
ls /dev/ttyUSB* # Linux

# 使用真实串口
python3 test_log_simulator.py --port /dev/cu.usbserial-0001 --baud 115200
```

## 故障排除

### 问题1: 找不到串口设备

**解决方案**:
- 检查 socat 是否正在运行
- 确认串口路径正确（使用 `ls /dev/tty*` 或 `ls /dev/cu.*`）
- macOS上使用 `cu.*` 而不是 `tty.*`

### 问题2: 权限被拒绝

**解决方案**:
```bash
# Linux
sudo chmod 666 /dev/ttyUSB0

# macOS通常不需要
```

### 问题3: 串口已被占用

**解决方案**:
- 确保没有其他程序使用该串口
- 关闭其他串口监视工具
- 重新创建虚拟串口对

### 问题4: pyserial 未安装

**解决方案**:
```bash
# 激活虚拟环境
source venv/bin/activate

# 安装 pyserial
pip install pyserial
```

## 退出测试

1. 在模拟器终端按 `Ctrl+C` 停止日志发送
2. 在MCU日志助手中点击"断开连接"
3. 在socat终端按 `Ctrl+C` 关闭虚拟串口对
4. 退出虚拟环境：
   ```bash
   deactivate
   ```

## 高级用法

### 自定义日志内容

编辑 `test_log_simulator.py`，修改以下部分：

```python
# 自定义Tag列表
TAGS = ['YOUR_TAG1', 'YOUR_TAG2', ...]

# 自定义消息模板
LOG_MESSAGES = {
    'INFO': ['你的消息模板 {}', ...],
    ...
}
```

### 编程接口

```python
from test_log_simulator import LogSimulator

# 创建模拟器
sim = LogSimulator('/dev/ttys001', 115200)
sim.connect()

# 发送自定义日志
timestamp = sim.format_timestamp()
log = f"[{timestamp}] [INFO] [CUSTOM] 自定义消息"
sim.send_log(log)

# 生成随机日志
random_log = sim.generate_log_line(level='ERROR', tag='SYSTEM')
sim.send_log(random_log)

sim.disconnect()
```

## 相关文档

- [LOG_PROTOCOL.md](./LOG_PROTOCOL.md) - 日志协议规范
- [README.md](./README.md) - 项目说明
