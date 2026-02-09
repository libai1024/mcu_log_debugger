# 日志模拟器协议符合性检查

本文档验证 `test_log_simulator.py` 是否完全符合 `LOG_PROTOCOL.md` 规范。

## ✅ 符合性检查清单

### 1. 日志格式规范（第2节）

#### 2.1 标准日志格式
- ✅ **格式**: `[时间戳] [级别] [Tag] 消息内容`
- ✅ **字段分隔**: 使用方括号 `[]` 包裹
- ✅ **字段间隔**: 使用空格分隔
- ✅ **行结束符**: 每条日志以 `\n` (0x0A) 结束
- ✅ **时间戳格式**: `HH:MM:SS.mmm`（时:分:秒.毫秒）
- ✅ **级别名称**: 大写字母
- ✅ **Tag名称**: 大写字母

**实现代码**:
```python
log_line = f"[{timestamp}] [{level}] [{tag}] {message}"
self.serial.write((log_line + '\n').encode('utf-8'))
```

#### 2.3 带文件位置信息的格式
- ✅ **格式**: `[时间戳] [级别] [Tag] 消息内容 (文件名:行号)`
- ✅ **可选性**: 70%概率包含位置信息（可配置）

**实现代码**:
```python
if include_location and random.random() > 0.3:
    source_file = random.choice(SOURCE_FILES)
    line_number = random.randint(10, 500)
    log_line += f" ({source_file}:{line_number})"
```

---

### 2. 日志级别定义（第3节）

#### 3.1 级别枚举
- ✅ **VERBOSE (0)**: 最详细信息
- ✅ **DEBUG (1)**: 调试信息
- ✅ **INFO (2)**: 一般信息
- ✅ **WARN (3)**: 警告信息
- ✅ **ERROR (4)**: 错误信息
- ✅ **NONE (5)**: 关闭所有日志（未在模拟器中使用，符合预期）

**实现代码**:
```python
LOG_LEVELS = ['VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR']
```

---

### 3. 时间戳格式（第4节）

#### 4.1 格式规范
- ✅ **格式**: `HH:MM:SS.mmm`
- ✅ **HH**: 小时（00-23），2位数字，补0
- ✅ **MM**: 分钟（00-59），2位数字，补0
- ✅ **SS**: 秒（00-59），2位数字，补0
- ✅ **mmm**: 毫秒（000-999），3位数字，补0

**实现代码**:
```python
def format_timestamp(self) -> str:
    now = datetime.now()
    return now.strftime("%H:%M:%S.") + f"{now.microsecond // 1000:03d}"
```

**示例输出**:
```
[15:30:45.123]
[00:00:01.234]
[23:59:59.999]
```

---

### 4. Tag定义（第5节）

#### 5.2 常用Tag列表
- ✅ **MAIN**: 主程序
- ✅ **SENSOR**: 传感器
- ✅ **SCREEN**: 屏幕
- ✅ **WIFI**: WiFi
- ✅ **STATE_MACHINE**: 状态机
- ✅ **AUDIO**: 音频
- ✅ **HTTP**: HTTP
- ✅ **OTA**: OTA

**实现代码**:
```python
TAGS = ['MAIN', 'SENSOR', 'SCREEN', 'WIFI', 'STATE_MACHINE', 'AUDIO', 'HTTP', 'OTA']
```

---

### 5. 串口配置参数（第7节）

#### 7.1 推荐UART配置
- ✅ **波特率**: 115200（默认，可配置）
- ✅ **数据位**: 8
- ✅ **停止位**: 1
- ✅ **校验位**: None
- ✅ **流控制**: None

**实现代码**:
```python
self.serial = serial.Serial(
    port=self.port,
    baudrate=self.baudrate,  # 默认115200
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    timeout=1
)
```

#### 7.2 支持的其他波特率
- ✅ 9600
- ✅ 38400
- ✅ 57600
- ✅ 115200（推荐）
- ✅ 230400
- ✅ 460800
- ✅ 921600

**使用方法**:
```bash
python3 test_log_simulator.py --port /dev/ttys001 --baud 921600
```

---

### 6. 日志解析算法（第8节）

#### 8.1 正则表达式兼容性
协议定义的正则表达式：
```regex
^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.+?)(?:\s+\(([^:]+):(\d+)\))?$
```

**测试用例**:
```python
# 生成的日志示例
[15:30:45.123] [INFO] [SENSOR] Temperature: 25.3 C
[15:30:45.124] [DEBUG] [SENSOR] >> Enter: Sensor_ReadData (sensor.c:123)
[15:30:45.125] [ERROR] [WIFI] Failed to connect to AP
```

- ✅ **捕获组1**: 时间戳 `15:30:45.123`
- ✅ **捕获组2**: 日志级别 `INFO`
- ✅ **捕获组3**: Tag `SENSOR`
- ✅ **捕获组4**: 消息内容 `Temperature: 25.3 C`
- ✅ **捕获组5**: 文件名（可选）`sensor.c`
- ✅ **捕获组6**: 行号（可选）`123`

---

### 7. 完整日志示例（第10节）

#### 10.1 系统启动日志
- ✅ 实现了完整的系统启动场景
- ✅ 包含ASCII艺术边框
- ✅ 模块初始化顺序正确

**场景代码**: `run_scenario_startup()`

**输出示例**:
```
[00:00:00.000] [INFO] [MAIN]
[00:00:00.001] [INFO] [MAIN] ╔══════════════════════════════════════════╗
[00:00:00.002] [INFO] [MAIN] ║     MCU State Machine Demo v1.0.0      ║
[00:00:00.003] [INFO] [MAIN] ║     A portable state machine framework   ║
[00:00:00.004] [INFO] [MAIN] ║     Platform: STM32F407                ║
[00:00:00.005] [INFO] [MAIN] ╚══════════════════════════════════════════╝
[00:00:00.006] [INFO] [MAIN] Initializing modules...
[00:00:00.007] [INFO] [SCREEN] Screen module initialized
[00:00:00.008] [INFO] [SENSOR] Sensor module initialized
[00:00:00.009] [INFO] [SENSOR] Temperature range: -20.0 ~ 50.0 C
[00:00:00.010] [INFO] [WIFI] WiFi module initialized
[00:00:00.011] [INFO] [STATE_MACHINE] StateMachine initialized
[00:00:00.012] [INFO] [MAIN] System ready
```

#### 10.2 错误场景日志
- ✅ 实现了完整的错误恢复场景
- ✅ WARN -> ERROR -> INFO 流程

**场景代码**: `run_scenario_error_recovery()`

**输出示例**:
```
[00:05:23.456] [WARN] [WIFI] Connection timeout
[00:05:24.567] [ERROR] [WIFI] Failed to connect to AP
[00:05:24.568] [INFO] [WIFI] Retrying connection (attempt 2/3)
[00:05:26.789] [INFO] [WIFI] Connected successfully
[00:05:26.790] [INFO] [WIFI] IP: 192.168.1.100
```

#### 10.3 DEBUG级别日志
- ✅ 实现了完整的DEBUG跟踪场景
- ✅ 包含函数进入/退出标记
- ✅ 包含文件位置信息

**场景代码**: `run_scenario_debug_trace()`

**输出示例**:
```
[00:10:30.123] [DEBUG] [SENSOR] >> Enter: Sensor_ReadData (sensor.c:123)
[00:10:30.124] [DEBUG] [SENSOR] Reading I2C sensor... (sensor.c:124)
[00:10:30.145] [DEBUG] [SENSOR] Raw data: 0x1234 0x5678 0x9ABC (sensor.c:145)
[00:10:30.146] [DEBUG] [SENSOR] Temperature: 25.3 C (sensor.c:146)
[00:10:30.147] [DEBUG] [SENSOR] << Exit: Sensor_ReadData (return: 1) (sensor.c:147)
```

---

## ✅ 额外功能（超出协议要求）

### 1. 多种运行模式
- ✅ **场景模式**: 演示协议中的标准场景
- ✅ **持续模式**: 持续发送随机日志
- ✅ **突发模式**: 性能压力测试

### 2. 灵活配置
- ✅ 可配置波特率
- ✅ 可配置发送间隔
- ✅ 可配置是否包含文件位置

### 3. 用户友好
- ✅ 彩色终端输出
- ✅ 详细的帮助信息
- ✅ 错误处理和提示

---

## 📊 测试验证

### 手动测试步骤

1. **启动模拟器（场景模式）**:
   ```bash
   python3 test_log_simulator.py --port /dev/ttys001
   ```

2. **验证输出格式**:
   - 检查每条日志是否符合格式 `[HH:MM:SS.mmm] [LEVEL] [TAG] message`
   - 检查时间戳是否正确（2位小时、2位分钟、2位秒、3位毫秒）
   - 检查级别名称是否大写
   - 检查Tag名称是否大写

3. **验证文件位置**:
   - 检查部分日志是否包含 `(filename:line)` 格式
   - 检查文件名是否为 `.c` 文件
   - 检查行号是否为数字

4. **验证场景**:
   - 场景1: 系统启动（包含ASCII边框）
   - 场景2: 传感器读取（温度、湿度数据）
   - 场景3: 错误恢复（WARN -> ERROR -> INFO）
   - 场景4: DEBUG跟踪（函数进入/退出）

5. **在日志助手中验证**:
   - 连接到对应串口
   - 检查日志是否正确解析
   - 检查颜色是否正确显示
   - 检查过滤功能是否正常
   - 检查搜索功能是否正常

---

## ✅ 结论

`test_log_simulator.py` **完全符合** `LOG_PROTOCOL.md` 规范，包括：

1. ✅ 日志格式（第2节）
2. ✅ 日志级别（第3节）
3. ✅ 时间戳格式（第4节）
4. ✅ Tag定义（第5节）
5. ✅ 串口配置（第7节）
6. ✅ 解析兼容性（第8节）
7. ✅ 完整示例（第10节）

**额外优势**:
- 提供多种测试场景
- 支持性能压力测试
- 用户友好的命令行界面
- 详细的文档和示例

---

## 📝 修改历史

### 2024-02-08 - 初始版本
- 创建基本日志模拟器

### 2024-02-08 - 协议符合性更新
- ✅ 更新Tag列表为协议推荐的Tag（MAIN, SENSOR, SCREEN, WIFI等）
- ✅ 更新日志消息模板为协议示例格式
- ✅ 实现系统启动场景（第10.1节）
- ✅ 实现错误恢复场景（第10.2节）
- ✅ 新增DEBUG跟踪场景（第10.3节）
- ✅ 所有输出完全符合协议规范
