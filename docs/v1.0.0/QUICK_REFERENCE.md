# 快速参考卡片

## 🚀 一键启动测试

```bash
# 1. 终端1: 创建虚拟串口
socat -d -d pty,raw,echo=0 pty,raw,echo=0

# 2. 终端2: 启动模拟器（使用socat输出的第一个串口）
source venv/bin/activate
python3 test_log_simulator.py --port /dev/ttys001

# 3. 终端3: 启动应用
npm run tauri dev
# 在应用中连接第二个串口 /dev/ttys002
```

---

## 📋 常用命令

### 模拟器命令

```bash
# 场景演示（默认）
python3 test_log_simulator.py --port /dev/ttys001

# 持续模式
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous

# 快速模式（0.1秒/条）
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --interval 0.1

# 压力测试（突发）
python3 test_log_simulator.py --port /dev/ttys001 --mode continuous --burst

# 自定义波特率
python3 test_log_simulator.py --port /dev/ttys001 --baud 921600
```

### 虚拟串口

```bash
# macOS - 安装socat
brew install socat

# 创建虚拟串口对
socat -d -d pty,raw,echo=0 pty,raw,echo=0

# 查看可用串口
ls /dev/cu.* /dev/tty*
```

---

## 📊 日志格式

### 标准格式
```
[HH:MM:SS.mmm] [LEVEL] [TAG] message
```

### 带位置信息
```
[HH:MM:SS.mmm] [LEVEL] [TAG] message (file.c:123)
```

### 级别
- `VERBOSE` - 最详细
- `DEBUG` - 调试信息
- `INFO` - 一般信息
- `WARN` - 警告
- `ERROR` - 错误

### Tag列表
- `MAIN` - 主程序
- `SENSOR` - 传感器
- `SCREEN` - 屏幕
- `WIFI` - WiFi
- `STATE_MACHINE` - 状态机
- `AUDIO` - 音频
- `HTTP` - HTTP
- `OTA` - OTA

---

## 🧪 测试场景

### 场景1: 系统启动
- ASCII艺术边框
- 模块初始化序列
- 系统就绪消息

### 场景2: 传感器读取
- 温度、湿度数据
- 带文件位置信息

### 场景3: 错误恢复
- 连接超时 (WARN)
- 连接失败 (ERROR)
- 重试 (INFO)
- 恢复成功 (INFO)

### 场景4: DEBUG跟踪
- 函数进入 `>> Enter:`
- 函数退出 `<< Exit:`
- 详细调试信息
- 文件位置信息

---

## 🎯 功能测试清单

在日志助手中测试：

- [ ] 串口连接/断开
- [ ] 实时日志显示
- [ ] 日志级别颜色
- [ ] 时间戳解析
- [ ] Tag显示
- [ ] 文件位置显示
- [ ] 级别过滤
- [ ] Tag过滤
- [ ] 关键字搜索
- [ ] 正则搜索
- [ ] 搜索历史
- [ ] 书签功能
- [ ] 日志导出
- [ ] 深色主题
- [ ] 自定义下拉框
- [ ] 性能（突发模式）

---

## 🔧 故障排除

### 找不到串口
```bash
ls /dev/cu.* /dev/tty*  # 查看可用串口
```

### 权限错误
```bash
# Linux
sudo chmod 666 /dev/ttyUSB0
```

### 串口被占用
- 关闭其他串口工具
- 重启socat

### pyserial未安装
```bash
source venv/bin/activate
pip install pyserial
```

---

## 📚 相关文档

- [LOG_PROTOCOL.md](./LOG_PROTOCOL.md) - 日志协议规范
- [TEST_GUIDE.md](./TEST_GUIDE.md) - 详细测试指南
- [PROTOCOL_COMPLIANCE.md](./PROTOCOL_COMPLIANCE.md) - 协议符合性验证
- [TESTING_QUICKSTART.md](./TESTING_QUICKSTART.md) - 快速开始

---

## 💡 提示

- 保持socat窗口运行
- 使用 `cu.*` 串口（macOS）
- 突发模式测试性能
- 场景模式学习协议
- 持续模式长时间测试
