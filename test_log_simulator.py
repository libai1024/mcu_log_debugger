#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCU Log Simulator - 模拟STM32发送日志数据
用于测试 MCU Log Debugger 应用

依赖: pyserial
安装: pip install pyserial

使用方法:
1. 创建虚拟串口对（macOS/Linux 使用 socat）
   macOS: brew install socat
   创建虚拟串口对: socat -d -d pty,raw,echo=0 pty,raw,echo=0
   
2. 或者使用真实串口设备

3. 运行脚本:
   python3 test_log_simulator.py --port /dev/cu.usbserial-XXX --baud 115200
"""

import serial
import time
import random
import argparse
import sys
from datetime import datetime
from typing import List, Tuple

# 日志级别定义（符合 LOG_PROTOCOL.md 第3.1节）
LOG_LEVELS = ['VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR']

# 模拟的Tag列表（符合 LOG_PROTOCOL.md 第5.2节）
TAGS = ['MAIN', 'SENSOR', 'SCREEN', 'WIFI', 'STATE_MACHINE', 'AUDIO', 'HTTP', 'OTA']

# 模拟的日志消息模板（参考 LOG_PROTOCOL.md 第10节示例）
LOG_MESSAGES = {
    'VERBOSE': [
        '>> Enter: {}',
        '<< Exit: {} (return: {})',
        'Variable: {} = {}',
        'Loop iteration: {}',
        'Memory allocated: {} bytes',
    ],
    'DEBUG': [
        '>> Enter: Sensor_ReadData',
        'Reading I2C sensor...',
        'Raw data: 0x{:04X} 0x{:04X}',
        'State transition: {} -> {}',
        'GPIO Pin{} = {}',
        'SPI transfer: {} bytes sent',
    ],
    'INFO': [
        'System initialized',
        'Module initialized',
        'Connected successfully',
        'Temperature: {}.{} C',
        'IP: 192.168.1.{}',
        'WiFi module initialized',
        'Screen module initialized',
        'Sensor module initialized',
        'Temperature range: -20.0 ~ 50.0 C',
        'System ready',
    ],
    'WARN': [
        'Connection timeout',
        'Low memory: {} bytes free',
        'Retrying connection (attempt {}/3)',
        'Buffer nearly full: {}/{}',
        'Temperature high: {} C',
    ],
    'ERROR': [
        'Failed to connect to AP',
        'Failed to initialize',
        'Sensor read error: code {}',
        'File open failed: {}',
        'Memory allocation failed',
        'Communication timeout',
    ]
}

# 模拟的文件名和行号
SOURCE_FILES = [
    'main.c', 'sensor.c', 'motor.c', 'comm.c', 
    'power.c', 'ui.c', 'storage.c', 'network.c',
    'utils.c', 'config.c'
]


class LogSimulator:
    """日志模拟器类"""
    
    def __init__(self, port: str, baudrate: int = 115200):
        """
        初始化日志模拟器
        
        Args:
            port: 串口设备路径
            baudrate: 波特率
        """
        self.port = port
        self.baudrate = baudrate
        self.serial = None
        self.running = False
        self.log_count = 0
        
    def connect(self) -> bool:
        """连接串口"""
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1
            )
            print(f"✓ 已连接到串口: {self.port} @ {self.baudrate} bps")
            return True
        except serial.SerialException as e:
            print(f"✗ 串口连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开串口连接"""
        if self.serial and self.serial.is_open:
            self.serial.close()
            print("✓ 串口已断开")
    
    def format_timestamp(self) -> str:
        """生成时间戳 [HH:MM:SS.mmm]"""
        now = datetime.now()
        return now.strftime("%H:%M:%S.") + f"{now.microsecond // 1000:03d}"
    
    def generate_log_line(self, level: str = None, tag: str = None, 
                         include_location: bool = True) -> str:
        """
        生成一条日志
        
        Args:
            level: 日志级别，None则随机
            tag: 日志Tag，None则随机
            include_location: 是否包含文件位置信息
            
        Returns:
            格式化的日志字符串
        """
        # 随机选择级别和Tag
        if level is None:
            level = random.choice(LOG_LEVELS)
        if tag is None:
            tag = random.choice(TAGS)
        
        # 生成时间戳
        timestamp = self.format_timestamp()
        
        # 随机选择消息模板并填充
        message_template = random.choice(LOG_MESSAGES[level])
        
        # 填充消息参数
        if '{}' in message_template:
            if level == 'VERBOSE':
                params = [
                    random.choice(['init', 'process', 'update', 'read', 'write']),
                    random.randint(0, 100),
                    random.randint(100, 1024),
                ]
            elif level == 'DEBUG':
                params = [
                    random.randint(0, 1023),
                    random.choice(['IDLE', 'RUNNING', 'STOPPED']),
                    random.choice(['READY', 'BUSY', 'ERROR']),
                    random.randint(0, 255),
                    random.randint(1, 128),
                    random.randint(0, 15),
                    random.choice(['HIGH', 'LOW']),
                ]
            elif level == 'INFO':
                params = [
                    random.choice(['data.txt', 'config.json', 'log.bin']),
                    random.choice(['TaskA', 'TaskB', 'TaskC']),
                    random.randint(50, 100),
                    random.randint(20, 30),
                    random.randint(40, 60),
                ]
            elif level == 'WARN':
                params = [
                    random.randint(80, 95),
                    random.randint(10, 20),
                    random.randint(900, 1000),
                    random.randint(1000, 1024),
                    random.randint(50, 80),
                ]
            else:  # ERROR
                params = [
                    random.randint(1, 99),
                    random.choice(['data.txt', 'config.json']),
                    hex(random.randint(0, 255)),
                    hex(random.randint(0, 255)),
                    random.choice(['Sensor', 'Motor', 'Display']),
                    random.randint(0, 255),
                ]
            
            # 填充模板（只取需要的参数数量）
            param_count = message_template.count('{}')
            message = message_template.format(*params[:param_count])
        else:
            message = message_template
        
        # 构建日志行
        log_line = f"[{timestamp}] [{level}] [{tag}] {message}"
        
        # 添加文件位置（可选）
        if include_location and random.random() > 0.3:  # 70%概率包含位置
            source_file = random.choice(SOURCE_FILES)
            line_number = random.randint(10, 500)
            log_line += f" ({source_file}:{line_number})"
        
        return log_line
    
    def send_log(self, log_line: str):
        """发送一条日志到串口"""
        if self.serial and self.serial.is_open:
            try:
                self.serial.write((log_line + '\n').encode('utf-8'))
                self.serial.flush()
                self.log_count += 1
            except serial.SerialException as e:
                print(f"✗ 发送失败: {e}")
    
    def run_scenario_startup(self):
        """场景1: 系统启动（参考 LOG_PROTOCOL.md 第10.1节）"""
        print("\n=== 场景: 系统启动 ===")
        logs = [
            ('INFO', 'MAIN', ''),
            ('INFO', 'MAIN', '╔══════════════════════════════════════════╗'),
            ('INFO', 'MAIN', '║     MCU State Machine Demo v1.0.0      ║'),
            ('INFO', 'MAIN', '║     A portable state machine framework   ║'),
            ('INFO', 'MAIN', '║     Platform: STM32F407                ║'),
            ('INFO', 'MAIN', '╚══════════════════════════════════════════╝'),
            ('INFO', 'MAIN', 'Initializing modules...'),
            ('INFO', 'SCREEN', 'Screen module initialized'),
            ('INFO', 'SENSOR', 'Sensor module initialized'),
            ('INFO', 'SENSOR', 'Temperature range: -20.0 ~ 50.0 C'),
            ('INFO', 'WIFI', 'WiFi module initialized'),
            ('INFO', 'STATE_MACHINE', 'StateMachine initialized'),
            ('INFO', 'MAIN', 'System ready'),
        ]
        for level, tag, msg in logs:
            timestamp = self.format_timestamp()
            log = f"[{timestamp}] [{level}] [{tag}] {msg}"
            print(f"  → {log}")
            self.send_log(log)
            time.sleep(0.15)
    
    def run_scenario_sensor_reading(self):
        """场景2: 传感器数据读取"""
        print("\n=== 场景: 传感器数据读取 ===")
        for i in range(5):
            temp = random.randint(20, 30)
            humidity = random.randint(40, 60)
            timestamp = self.format_timestamp()
            log = f"[{timestamp}] [INFO] [SENSOR] 温度: {temp}°C, 湿度: {humidity}% (sensor.c:156)"
            print(f"  → {log}")
            self.send_log(log)
            time.sleep(0.5)
    
    def run_scenario_error_recovery(self):
        """场景3: 错误和恢复（参考 LOG_PROTOCOL.md 第10.2节）"""
        print("\n=== 场景: 错误和恢复 ===")
        
        # 错误发生
        timestamp = self.format_timestamp()
        log = f"[{timestamp}] [WARN] [WIFI] Connection timeout"
        print(f"  → {log}")
        self.send_log(log)
        time.sleep(0.3)
        
        # 错误
        timestamp = self.format_timestamp()
        log = f"[{timestamp}] [ERROR] [WIFI] Failed to connect to AP"
        print(f"  → {log}")
        self.send_log(log)
        time.sleep(0.3)
        
        # 重试
        timestamp = self.format_timestamp()
        log = f"[{timestamp}] [INFO] [WIFI] Retrying connection (attempt 2/3)"
        print(f"  → {log}")
        self.send_log(log)
        time.sleep(0.5)
        
        # 恢复
        timestamp = self.format_timestamp()
        log = f"[{timestamp}] [INFO] [WIFI] Connected successfully"
        print(f"  → {log}")
        self.send_log(log)
        time.sleep(0.2)
        
        # IP地址
        timestamp = self.format_timestamp()
        log = f"[{timestamp}] [INFO] [WIFI] IP: 192.168.1.100"
        print(f"  → {log}")
        self.send_log(log)
    
    def run_scenario_debug_trace(self):
        """场景4: DEBUG级别日志（参考 LOG_PROTOCOL.md 第10.3节）"""
        print("\n=== 场景: DEBUG级别日志 ===")
        logs = [
            ('DEBUG', 'SENSOR', '>> Enter: Sensor_ReadData', 'sensor.c:123'),
            ('DEBUG', 'SENSOR', 'Reading I2C sensor...', 'sensor.c:124'),
            ('DEBUG', 'SENSOR', 'Raw data: 0x1234 0x5678 0x9ABC', 'sensor.c:145'),
            ('DEBUG', 'SENSOR', 'Temperature: 25.3 C', 'sensor.c:146'),
            ('DEBUG', 'SENSOR', '<< Exit: Sensor_ReadData (return: 1)', 'sensor.c:147'),
        ]
        for level, tag, msg, location in logs:
            timestamp = self.format_timestamp()
            log = f"[{timestamp}] [{level}] [{tag}] {msg} ({location})"
            print(f"  → {log}")
            self.send_log(log)
            time.sleep(0.15)
    
    def run_continuous(self, interval: float = 1.0, burst_mode: bool = False):
        """
        持续发送随机日志
        
        Args:
            interval: 发送间隔（秒）
            burst_mode: 突发模式（快速发送大量日志）
        """
        print(f"\n=== 持续模式 ===")
        print(f"发送间隔: {interval}秒")
        print(f"突发模式: {'开启' if burst_mode else '关闭'}")
        print("按 Ctrl+C 停止\n")
        
        self.running = True
        try:
            while self.running:
                if burst_mode and random.random() < 0.1:  # 10%概率触发突发
                    print("  [突发] 发送10条日志...")
                    for _ in range(10):
                        log = self.generate_log_line()
                        self.send_log(log)
                        time.sleep(0.05)
                else:
                    log = self.generate_log_line()
                    print(f"  [{self.log_count:04d}] {log}")
                    self.send_log(log)
                    time.sleep(interval)
                    
        except KeyboardInterrupt:
            print("\n\n✓ 已停止")
            self.running = False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='MCU日志模拟器 - 用于测试日志助手',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本使用
  python3 test_log_simulator.py --port /dev/cu.usbserial-0001
  
  # 指定波特率
  python3 test_log_simulator.py --port /dev/cu.usbserial-0001 --baud 115200
  
  # 持续模式（每秒1条）
  python3 test_log_simulator.py --port /dev/cu.usbserial-0001 --mode continuous
  
  # 快速模式（每0.1秒1条）
  python3 test_log_simulator.py --port /dev/cu.usbserial-0001 --mode continuous --interval 0.1
  
  # 突发模式（随机快速发送大量日志）
  python3 test_log_simulator.py --port /dev/cu.usbserial-0001 --mode continuous --burst
  
macOS创建虚拟串口对:
  1. 安装 socat: brew install socat
  2. 运行: socat -d -d pty,raw,echo=0 pty,raw,echo=0
  3. 记下两个串口路径，一个用于此脚本，一个用于日志助手
        """
    )
    
    parser.add_argument('--port', '-p', required=True, help='串口设备路径 (如: /dev/cu.usbserial-0001)')
    parser.add_argument('--baud', '-b', type=int, default=115200, help='波特率 (默认: 115200)')
    parser.add_argument('--mode', '-m', choices=['scenarios', 'continuous'], default='scenarios',
                       help='运行模式: scenarios=场景演示, continuous=持续发送 (默认: scenarios)')
    parser.add_argument('--interval', '-i', type=float, default=1.0,
                       help='持续模式下的发送间隔(秒) (默认: 1.0)')
    parser.add_argument('--burst', action='store_true',
                       help='启用突发模式（随机快速发送大量日志）')
    
    args = parser.parse_args()
    
    # 创建模拟器
    simulator = LogSimulator(args.port, args.baud)
    
    # 连接串口
    if not simulator.connect():
        sys.exit(1)
    
    try:
        if args.mode == 'scenarios':
            # 场景演示模式
            print("\n" + "="*50)
            print("  MCU 日志模拟器 - 场景演示模式")
            print("  (符合 LOG_PROTOCOL.md 规范)")
            print("="*50)
            
            simulator.run_scenario_startup()
            time.sleep(1)
            
            simulator.run_scenario_sensor_reading()
            time.sleep(1)
            
            simulator.run_scenario_error_recovery()
            time.sleep(1)
            
            simulator.run_scenario_debug_trace()
            time.sleep(1)
            
            print(f"\n✓ 场景演示完成，共发送 {simulator.log_count} 条日志")
            
        else:
            # 持续模式
            print("\n" + "="*50)
            print("  MCU 日志模拟器 - 持续模式")
            print("="*50)
            simulator.run_continuous(args.interval, args.burst)
            
    finally:
        simulator.disconnect()


if __name__ == '__main__':
    main()
