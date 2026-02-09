// MCU Log Debugger - Tauri 后端主程序
// 
// 功能：
// - 管理串口连接和通信
// - 实时接收 MCU 日志数据
// - 向 MCU 发送命令
// - 处理多个连接实例

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::io::{BufRead, BufReader, Write};
use std::fs::{OpenOptions, File};
use std::path::PathBuf;
use tauri::{State, AppHandle};

// ========== 数据结构定义 ==========

/// 串口运行状态管理
/// 
/// - `running`: Arc<Mutex<bool>> - 线程安全的运行状态标志
struct SerialState {
    running: Arc<Mutex<bool>>,
}

/// 日志条目结构体
///
/// 字段说明：
/// - `id`: 唯一标识符
/// - `timestamp`: 时间戳（格式：HH:MM:SS.mmm）
/// - `level`: 日志级别（DEBUG/INFO/WARN/ERROR）
/// - `tag`: 日志标签/模块名称
/// - `message`: 日志消息内容
/// - `raw_line`: 原始日志行
///
/// 注意：此结构体保留用于将来的扩展功能
#[derive(serde::Serialize, Clone, Debug)]
#[allow(dead_code)]
struct LogEntry {
    id: String,
    timestamp: String,
    level: String,
    tag: String,
    message: String,
    raw_line: String,
}

/// 串口配置参数
/// 
/// 字段说明：
/// - `path`: 串口设备路径（如 /dev/cu.usbserial-1234）
/// - `baud_rate`: 波特率（9600, 115200, 230400 等）
#[derive(serde::Deserialize)]
struct SerialConfig {
    path: String,
    baud_rate: u32,
}

// ========== 命令处理函数 ==========

/// 列出当前系统可用的串口列表
/// 
/// 返回值：
/// - Ok(Vec<String>): 串口路径列表
/// - Err(String): 错误信息
/// 
/// 示例返回: ["/dev/cu.usbserial-1234", "/dev/tty.usbserial-1234", "/dev/ttys019"]
/// 
/// 说明：
/// - 自动检测硬件串口（USB转串口等）
/// - 扫描虚拟串口（socat创建的 /dev/ttys* 和 /dev/ptyp*）
/// - macOS: 包含 cu.*, tty.*, ttys*, ptyp*
/// - Linux: 包含 ttyUSB*, ttyACM*, pts/*
#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    let mut all_ports = Vec::new();
    
    // 1. 获取硬件串口（USB转串口等）
    match serialport::available_ports() {
        Ok(ports) => {
            for port in ports {
                all_ports.push(port.port_name);
            }
        }
        Err(_) => {
            // 忽略错误，继续扫描虚拟串口
        }
    }
    
    // 2. 扫描虚拟串口（socat创建的PTY设备）
    #[cfg(target_os = "macos")]
    {
        // macOS: 扫描 /dev/ttys* (socat创建的虚拟串口)
        if let Ok(entries) = std::fs::read_dir("/dev") {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    // 匹配 ttys* (socat虚拟串口)
                    if file_name.starts_with("ttys") {
                        let path = format!("/dev/{}", file_name);
                        if !all_ports.contains(&path) {
                            // 验证设备是否可访问
                            if std::path::Path::new(&path).exists() {
                                all_ports.push(path);
                            }
                        }
                    }
                    // 匹配 ptyp* (其他虚拟串口)
                    else if file_name.starts_with("ptyp") {
                        let path = format!("/dev/{}", file_name);
                        if !all_ports.contains(&path) {
                            if std::path::Path::new(&path).exists() {
                                all_ports.push(path);
                            }
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 扫描 /dev/pts/* (虚拟终端)
        if let Ok(entries) = std::fs::read_dir("/dev/pts") {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    // 跳过特殊文件
                    if file_name == "ptmx" || file_name == "." || file_name == ".." {
                        continue;
                    }
                    let path = format!("/dev/pts/{}", file_name);
                    if !all_ports.contains(&path) {
                        all_ports.push(path);
                    }
                }
            }
        }
    }
    
    // 3. 排序并返回
    all_ports.sort();
    
    Ok(all_ports)
}

/// 检测是否为虚拟串口（PTY设备）
/// 
/// macOS: /dev/ttys*, /dev/ptyp*
/// Linux: /dev/pts/*
fn is_virtual_port(path: &str) -> bool {
    path.contains("/ttys") || path.contains("/ptyp") || path.contains("/pts/")
}

/// 连接到指定的串口设备并启动日志接收线程
/// 
/// 参数：
/// - `config`: 串口配置（路径和波特率）
/// - `state`: 共享的串口状态
/// - `window`: Tauri窗口对象（用于事件发送）
/// 
/// 返回值：
/// - Ok(String): 连接成功提示
/// - Err(String): 连接失败的错误信息
/// 
/// 事件发送：
/// - "serial-data": 接收到新的日志行
/// - "serial-error": 连接错误
/// - "serial-disconnected": 连接已断开
/// 
/// 说明：
/// - 对真实串口使用 serialport crate
/// - 对虚拟串口（PTY）使用标准文件I/O
#[tauri::command]
fn connect_serial(
    config: SerialConfig,
    state: State<'_, SerialState>,
    window: tauri::Window,
) -> Result<String, String> {
    // 设置运行标志为 true
    {
        let mut running = state.running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }

    let running = state.running.clone();
    let port_name = config.path.clone();
    let baud_rate = config.baud_rate;
    let is_virtual = is_virtual_port(&port_name);

    // 在新线程中执行串口读取循环
    thread::spawn(move || {
        if is_virtual {
            // 虚拟串口：使用标准文件I/O
            read_virtual_port(port_name, running, window);
        } else {
            // 真实串口：使用serialport crate
            read_real_port(port_name, baud_rate, running, window);
        }
    });

    Ok("连接成功".to_string())
}

/// 读取真实串口设备
fn read_real_port(port_name: String, baud_rate: u32, running: Arc<Mutex<bool>>, window: tauri::Window) {
    // 尝试打开串口设备
    let port_result = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open();

    let mut port = match port_result {
        Ok(p) => p,
        Err(e) => {
            let _ = window.emit("serial-error", format!("打开失败: {}", e));
            return;
        }
    };

    let mut buffer: Vec<u8> = vec![0; 1024];
    let mut line_buffer = String::new();

    // 持续读取串口数据直到收到停止信号
    loop {
        // 检查是否应该停止读取
        {
            let running_guard = running.lock().unwrap();
            if !*running_guard {
                break;
            }
        }

        // 从串口读取数据
        match port.read(buffer.as_mut_slice()) {
            Ok(n) if n > 0 => {
                let data = String::from_utf8_lossy(&buffer[..n]);
                line_buffer.push_str(&data);

                // 按换行符分割并发送完整的日志行
                while let Some(pos) = line_buffer.find('\n') {
                    let line = line_buffer[..pos].trim().to_string();
                    line_buffer = line_buffer[pos + 1..].to_string();
                    
                    if !line.is_empty() {
                        let _ = window.emit("serial-data", line);
                    }
                }
            }
            Ok(_) => {} // 超时或无数据
            Err(e) => {
                // 只在非超时错误时报告
                if e.kind() != std::io::ErrorKind::TimedOut {
                    let _ = window.emit("serial-error", format!("读取失败: {}", e));
                    break;
                }
            }
        }

        thread::sleep(Duration::from_millis(1));
    }

    let _ = window.emit("serial-disconnected", ());
}

/// 读取虚拟串口设备（PTY）
fn read_virtual_port(port_name: String, running: Arc<Mutex<bool>>, window: tauri::Window) {
    // 使用标准文件I/O打开PTY设备
    let file_result = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&port_name);

    let file = match file_result {
        Ok(f) => f,
        Err(e) => {
            let _ = window.emit("serial-error", format!("打开失败: {}", e));
            return;
        }
    };

    let mut reader = BufReader::new(file);
    let mut line = String::new();

    // 持续读取数据直到收到停止信号
    loop {
        // 检查是否应该停止读取
        {
            let running_guard = running.lock().unwrap();
            if !*running_guard {
                break;
            }
        }

        // 读取一行数据
        line.clear();
        match reader.read_line(&mut line) {
            Ok(n) if n > 0 => {
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    let _ = window.emit("serial-data", trimmed);
                }
            }
            Ok(_) => {
                // EOF - 等待一下再重试
                thread::sleep(Duration::from_millis(10));
            }
            Err(e) => {
                let _ = window.emit("serial-error", format!("读取失败: {}", e));
                break;
            }
        }
    }

    let _ = window.emit("serial-disconnected", ());
}

/// 断开串口连接
/// 
/// 参数：
/// - `state`: 共享的串口状态
/// 
/// 返回值：
/// - Ok(String): 断开成功提示
/// - Err(String): 断开失败的错误信息
/// 
/// 说明：通过设置运行标志为 false，通知读取线程停止
#[tauri::command]
fn disconnect_serial(state: State<'_, SerialState>) -> Result<String, String> {
    let mut running = state.running.lock().map_err(|e| e.to_string())?;
    *running = false;
    Ok("断开连接".to_string())
}

// ========== 文件保存功能 ==========

/// 保存日志到文件
/// 
/// 参数：
/// - `content`: 要保存的日志内容
/// - `filename`: 文件名
/// - `save_path`: 保存路径（可选，如果为空则使用默认路径）
/// - `app`: Tauri 应用句柄
/// 
/// 返回值：
/// - Ok(String): 保存成功，返回文件完整路径
/// - Err(String): 保存失败的错误信息
#[tauri::command]
fn save_log_file(
    content: String,
    filename: String,
    save_path: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    // 确定保存路径
    let base_path = if let Some(path) = save_path {
        PathBuf::from(path)
    } else {
        // 使用应用数据目录作为默认路径
        app.path_resolver()
            .app_data_dir()
            .ok_or("无法获取应用数据目录")?
            .join("logs")
    };

    // 确保目录存在
    std::fs::create_dir_all(&base_path).map_err(|e| format!("创建目录失败: {}", e))?;

    // 构建完整文件路径
    let file_path = base_path.join(&filename);

    // 写入文件
    let mut file = File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 获取保存路径配置
/// 
/// 参数：
/// - `app`: Tauri 应用句柄
/// 
/// 返回值：
/// - Ok(String): 保存路径配置
/// - Err(String): 读取失败的错误信息
#[tauri::command]
fn get_save_path(app: AppHandle) -> Result<String, String> {
    let config_dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or("无法获取配置目录")?;

    let config_file = config_dir.join("settings.json");

    if !config_file.exists() {
        // 返回默认路径
        let default_path = app
            .path_resolver()
            .app_data_dir()
            .ok_or("无法获取应用数据目录")?
            .join("logs");
        return Ok(default_path.to_string_lossy().to_string());
    }

    let content = std::fs::read_to_string(&config_file)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置文件失败: {}", e))?;

    if let Some(path) = config.get("savePath").and_then(|v| v.as_str()) {
        Ok(path.to_string())
    } else {
        // 返回默认路径
        let default_path = app
            .path_resolver()
            .app_data_dir()
            .ok_or("无法获取应用数据目录")?
            .join("logs");
        Ok(default_path.to_string_lossy().to_string())
    }
}

/// 设置保存路径配置
/// 
/// 参数：
/// - `path`: 新的保存路径
/// - `app`: Tauri 应用句柄
/// 
/// 返回值：
/// - Ok(String): 设置成功提示
/// - Err(String): 设置失败的错误信息
#[tauri::command]
fn set_save_path(path: String, app: AppHandle) -> Result<String, String> {
    let config_dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or("无法获取配置目录")?;

    // 确保配置目录存在
    std::fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;

    let config_file = config_dir.join("settings.json");

    // 读取现有配置或创建新配置
    let mut config: serde_json::Value = if config_file.exists() {
        let content = std::fs::read_to_string(&config_file)
            .map_err(|e| format!("读取配置文件失败: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // 更新保存路径
    config["savePath"] = serde_json::Value::String(path.clone());

    // 写入配置文件
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    std::fs::write(&config_file, content).map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(format!("保存路径已设置为: {}", path))
}

// ========== 应用初始化 ==========

/// Tauri 应用主入口点
/// 
/// 初始化流程：
/// 1. 创建并管理 SerialState 的共享实例
/// 2. 注册所有可调用的命令处理函数
/// 3. 启动事件循环
fn main() {
    tauri::Builder::default()
        // 管理全局串口状态
        .manage(SerialState {
            running: Arc::new(Mutex::new(false)),
        })
        // 注册前端可调用的 Rust 命令
        .invoke_handler(tauri::generate_handler![
            list_serial_ports,    // 列举串口
            connect_serial,       // 连接串口
            disconnect_serial,    // 断开串口
            save_log_file,        // 保存日志文件
            get_save_path,        // 获取保存路径
            set_save_path         // 设置保存路径
        ])
        // 启动 Tauri 事件循环
        .run(tauri::generate_context!())
        .expect("启动应用时出错");
}
