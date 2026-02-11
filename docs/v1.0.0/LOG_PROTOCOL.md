# MCU 日志系统协议文档

## 文档版本

- **版本**: 1.0
- **日期**: 2025-02-07
- **适用平台**: STM32 / ESP32 等嵌入式系统
- **传输接口**: UART 串口

---

## 1. 协议概述

本日志系统专为嵌入式 MCU 设计，通过 UART 串口输出格式化的日志信息。设计目标是：
- 轻量级（最小内存占用）
- 可读性强（人类友好格式）
- 可过滤（支持按 Tag 和级别过滤）
- 可扩展（支持配置显示选项）

---

## 2. 日志格式规范

### 2.1 标准日志格式

```
[时间戳] [级别] [Tag] 消息内容
```

**格式说明**：
- 所有字段用方括号 `[]` 包裹
- 字段之间用空格分隔
- 每条日志以换行符 `\n` (0x0A) 结束
- 时间戳格式：`HH:MM:SS.mmm`（时:分:秒.毫秒）
- 级别名称：大写字母（见 3.1 节）
- Tag：模块名称，大写字母（如 `MAIN`, `SENSOR`, `SCREEN`）

### 2.2 完整格式示例

```
[00:00:00.000] [INFO] [MAIN] System initialized
[00:00:01.234] [DEBUG] [SENSOR] >> Enter: Sensor_Init
[00:00:01.235] [INFO] [SENSOR] Temperature: 25.3 C
[00:00:02.456] [WARN] [WIFI] Connection timeout
[00:00:03.789] [ERROR] [MAIN] Failed to initialize
```

### 2.3 带文件位置信息的格式

当日志级别为 `VERBOSE` 或 `DEBUG` 时，可选择性显示文件位置：

```
[时间戳] [级别] [Tag] 消息内容 (文件名:行号)
```

**示例**：
```
[00:00:01.234] [DEBUG] [SENSOR] >> Enter: Sensor_Init (sensor.c:76)
```

---

## 3. 日志级别定义

### 3.1 级别枚举

| 级别值 | 级别名称 | 字符串 | 用途 | 颜色建议 |
|--------|----------|--------|------|----------|
| 0 | `LOG_LEVEL_VERBOSE` | `VERBOSE` | 最详细信息 | 灰色 |
| 1 | `LOG_LEVEL_DEBUG` | `DEBUG` | 调试信息 | 青色 |
| 2 | `LOG_LEVEL_INFO` | `INFO` | 一般信息 | 绿色 |
| 3 | `LOG_LEVEL_WARN` | `WARN` | 警告信息 | 黄色 |
| 4 | `LOG_LEVEL_ERROR` | `ERROR` | 错误信息 | 红色 |
| 5 | `LOG_LEVEL_NONE` | `NONE` | 关闭所有日志 | - |

### 3.2 级别过滤规则

日志级别采用**阈值过滤**机制：
- 只有级别值 **≥** 设置级别的日志才会输出
- 例如：设置级别为 `INFO` (2)，则输出 `INFO`, `WARN`, `ERROR`，不输出 `DEBUG`, `VERBOSE`

| 设置级别 | 输出的日志 |
|----------|------------|
| `VERBOSE` (0) | 全部 |
| `DEBUG` (1) | DEBUG, INFO, WARN, ERROR |
| `INFO` (2) | INFO, WARN, ERROR |
| `WARN` (3) | WARN, ERROR |
| `ERROR` (4) | ERROR |
| `NONE` (5) | 无 |

---

## 4. 时间戳格式

### 4.1 格式规范

```
HH:MM:SS.mmm
```

- **HH**: 小时（00-23），2 位数字，补 0
- **MM**: 分钟（00-59），2 位数字，补 0
- **SS**: 秒（00-59），2 位数字，补 0
- **mmm**: 毫秒（000-999），3 位数字，补 0

### 4.2 时间戳计算

在 STM32 上使用 `HAL_GetTick()` 获取毫秒数：
```c
uint32_t tick = HAL_GetTick();
uint32_t hours = (tick / 3600000) % 24;
uint32_t minutes = (tick / 60000) % 60;
uint32_t seconds = (tick / 1000) % 60;
uint32_t milliseconds = tick % 1000;
```

### 4.3 时间戳示例

| 时间值 | 格式化输出 |
|--------|------------|
| 0 ms | `[00:00:00.000]` |
| 1234 ms | `[00:00:01.234]` |
| 61567 ms | `[00:01:01.567]` |
| 3661789 ms | `[01:01:01.789]` |

---

## 5. Tag 过滤机制

### 5.1 Tag 定义

Tag 是模块的标识符，用于：
- 标识日志来源
- 按模块过滤日志
- 诊断特定模块问题

### 5.2 常用 Tag 列表

| Tag 名称 | 模块 | 说明 |
|----------|------|------|
| `MAIN` | 主程序 | 应用程序主流程 |
| `SENSOR` | 传感器 | 温湿度、气压等传感器 |
| `SCREEN` | 屏幕 | OLED/LCD 显示模块 |
| `WIFI` | WiFi | 网络连接模块 |
| `STATE_MACHINE` | 状态机 | 设备状态管理 |
| `AUDIO` | 音频 | 音频处理模块 |
| `HTTP` | HTTP | 网络请求模块 |
| `OTA` | OTA | 固件升级模块 |

### 5.3 Tag 过滤规则

1. **全局级别过滤**：适用于所有 Tag
2. **特定 Tag 级别**：可覆盖全局级别
3. **优先级**：Tag 级别 > 全局级别

**示例**：
```c
// 设置全局级别为 INFO
log_set_level(LOG_LEVEL_INFO);

// SENSOR 模块使用 DEBUG 级别（更详细）
log_set_tag_level("SENSOR", LOG_LEVEL_DEBUG);
```

---

## 6. 配置选项

### 6.1 显示配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `show_timestamp` | bool | true | 是否显示时间戳 |
| `show_level` | bool | true | 是否显示日志级别 |
| `show_tag` | bool | true | 是否显示 Tag |
| `show_location` | bool | false | 是否显示文件位置 |

### 6.2 缓冲区配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_MAX_MSG_LENGTH` | 256 | 单条日志最大长度 |
| `LOG_MAX_TAG_LENGTH` | 32 | Tag 名称最大长度 |
| `LOG_MAX_TAG_FILTERS` | 8 | Tag 过滤器数量 |
| `LOG_UART_BUFFER_SIZE` | 512 | UART 发送缓冲区大小 |

---

## 7. 串口配置参数

### 7.1 推荐 UART 配置

| 参数 | 值 | 说明 |
|------|-----|------|
| 波特率 | 115200 | 标准波特率 |
| 数据位 | 8 | 8 位数据 |
| 停止位 | 1 | 1 位停止位 |
| 校验位 | None | 无校验 |
| 流控制 | None | 无流控制 |

### 7.2 支持的其他波特率

- 9600（低速调试）
- 38400
- 57600
- 115200（推荐）
- 230400
- 460800
- 921600（高速）

---

## 8. 日志解析算法

### 8.1 正则表达式

```regex
^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.+?)(?:\s+\(([^:]+):(\d+)\))?$
```

**捕获组**：
- 组 1: 时间戳 (`HH:MM:SS.mmm`)
- 组 2: 日志级别 (`INFO`, `DEBUG`, etc.)
- 组 3: Tag (`MAIN`, `SENSOR`, etc.)
- 组 4: 消息内容
- 组 5: 文件名（可选）
- 组 6: 行号（可选）

### 8.2 解析流程

```python
import re

def parse_log_line(line):
    pattern = r'^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.+)$'
    match = re.match(pattern, line)
    if match:
        return {
            'timestamp': match.group(1),    # "00:00:01.234"
            'level': match.group(2),        # "INFO"
            'tag': match.group(3),          # "SENSOR"
            'message': match.group(4)       # "Temperature: 25.3 C"
        }
    return None
```

---

## 9. 串口调试助手开发建议

### 9.1 功能需求

#### 必需功能
1. **串口配置**
   - 波特率选择（9600 ~ 921600）
   - 数据位、停止位、校验位配置
   - 自动打开串口

2. **日志显示**
   - 实时显示日志
   - 不同级别用不同颜色
   - 支持自动滚动
   - 时间戳解析与显示

3. **级别过滤**
   - 动态调整显示级别
   - 支持 Tag 过滤
   - 支持关键字搜索

#### 推荐功能
1. **日志统计**
   - 各级别日志数量统计
   - 错误日志高亮统计
   - 实时日志速率

2. **日志导出**
   - 保存为文本文件
   - 导出为 CSV/JSON 格式
   - 支持时间范围选择

3. **高级功能**
   - 日志断点（匹配特定内容暂停）
   - 图表化显示数值
   - 多设备同时监控

### 9.2 UI 布局建议

```
┌─────────────────────────────────────────────────────────┐
│  MCU 日志调试助手                              │
├──────────┬──────────────────────────────────────────────┤
│          │  ╔══════════════════════════════════════╗     │
│  配置区   │  ║  [00:00:00.000] [INFO] [MAIN] ...  ║     │
│          │  ║  [00:00:00.001] [INFO] [SENSOR] ... ║     │
│ ┌────┐  │  ║  [00:00:00.002] [DEBUG] [SCREEN].  ║     │
│ │串口│  │  ║  [00:00:00.003] [WARN] [WIFI] ...  ║     │
│ │配置│  │  ║                                      ║     │
│ └────┘  │  ║          日志显示区域                ║     │
│          │  ╚══════════════════════════════════════╝     │
│ ┌────┐  │                                              │
│ │日志│  │  ╔══════════════════════════════════════╗     │
│ │过滤│  │  ║  统计信息                             ║     │
│ └────┘  │  ║  INFO: 1234  WARN: 5  ERROR: 1       ║     │
│          │  ╚══════════════════════════════════════╝     │
└──────────┴──────────────────────────────────────────────┘
```

### 9.3 颜色方案建议

| 级别 | 背景色 | 文字色 | RGB 值 |
|------|--------|--------|--------|
| VERBOSE | #F5F5F5 | #757575 | 浅灰背景，灰字 |
| DEBUG | #E3F2FD | #0277BD | 浅蓝背景，深蓝字 |
| INFO | #E8F5E9 | #2E7D32 | 浅绿背景，深绿字 |
| WARN | #FFF3E0 | #EF6C00 | 浅橙背景，深橙字 |
| ERROR | #FFEBEE | #C62828 | 浅红背景，深红字 |

### 9.4 性能优化建议

1. **接收缓冲**
   - 使用环形缓冲区（建议 4KB ~ 16KB）
   - 后台线程接收数据
   - 批量更新 UI（避免频繁刷新）

2. **显示优化**
   - 虚拟列表（只渲染可见行）
   - 日志行数限制（如最多保留 10000 行）
   - 延迟滚动（使用定时器合并滚动请求）

3. **解析优化**
   - 预编译正则表达式
   - 字符串池（缓存重复的 Tag/Level）
   - 避免频繁创建对象

---

## 10. 完整日志示例

### 10.1 系统启动日志

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

### 10.2 错误场景日志

```
[00:05:23.456] [WARN] [WIFI] Connection timeout
[00:05:24.567] [ERROR] [WIFI] Failed to connect to AP
[00:05:24.568] [INFO] [WIFI] Retrying connection (attempt 2/3)
[00:05:26.789] [INFO] [WIFI] Connected successfully
[00:05:26.790] [INFO] [WIFI] IP: 192.168.1.100
```

### 10.3 DEBUG 级别日志

```
[00:10:30.123] [DEBUG] [SENSOR] >> Enter: Sensor_ReadData
[00:10:30.124] [DEBUG] [SENSOR] Reading I2C sensor...
[00:10:30.145] [DEBUG] [SENSOR] Raw data: 0x1234 0x5678 0x9ABC
[00:10:30.146] [DEBUG] [SENSOR] Temperature: 25.3 C
[00:10:30.147] [DEBUG] [SENSOR] << Exit: Sensor_ReadData (return: 1)
```

---

## 11. 常见问题

### Q1: 如何识别日志开始和结束？

**A**: 每条日志以 `[` 开头，以 `\n` 结束。

### Q2: 如何处理日志截断？

**A**: 单条日志最大 256 字节。如果日志内容过长，会被截断。建议：
- 检查是否收到完整行（以 `\n` 结束）
- 如果不完整，等待后续数据

### Q3: 如何处理特殊字符？

**A**: 日志内容可能包含：
- 中文字符（UTF-8 编码）
- 二进制数据（建议十六进制显示）
- 控制字符（建议转义显示）

### Q4: 时间戳会回绕吗？

**A**: 会。`uint32_t` 毫秒计数器约 49.7 天回绕一次。
- 回绕后时间从 `00:00:00.000` 重新开始
- 调试助手应正确处理时间戳回绕

---

## 12. 附录

### 12.1 STM32 移植示例

```c
// 在 UART 中断接收回调中处理日志
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    if (huart == &log_uart_handle) {
        // 处理接收到的日志数据
        log_process_rx_data(rx_buffer, rx_len);
    }
}
```

### 12.2 测试用例

```
# 发送测试日志
LOG_VERBOSE("This is a verbose message");
LOG_DEBUG("Debug: value = %d", 42);
LOG_INFO("System ready");
LOG_WARN("Low memory: %d bytes free", 1024);
LOG_ERROR("Failed to open file: %s", "config.txt");
```

### 12.3 性能指标

| 指标 | 值 |
|------|-----|
| 单条日志处理时间 | < 1ms (115200 波特率) |
| 内存占用 | ~1KB RAM + 512B UART 缓冲 |
| CPU 占用 | < 1% (日志频率 100/s) |
| 最大日志速率 | ~500 条/秒 (115200 波特率) |

---

**文档结束**

如有疑问，请参考源码：`log/log.h` 和 `log/log.c`
