use tauri::State;

use crate::models::serial::SerialConfig;
use crate::services::serial as serial_service;
use crate::state::serial_state::SerialState;

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<String>, String> {
    let mut all_ports = Vec::new();

    match serialport::available_ports() {
        Ok(ports) => {
            for port in ports {
                all_ports.push(port.port_name);
            }
        }
        Err(_) => {}
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(entries) = std::fs::read_dir("/dev") {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    if file_name.starts_with("ttys") {
                        let path = format!("/dev/{}", file_name);
                        if !all_ports.contains(&path) && std::path::Path::new(&path).exists() {
                            all_ports.push(path);
                        }
                    } else if file_name.starts_with("ptyp") {
                        let path = format!("/dev/{}", file_name);
                        if !all_ports.contains(&path) && std::path::Path::new(&path).exists() {
                            all_ports.push(path);
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(entries) = std::fs::read_dir("/dev/pts") {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
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

    all_ports.sort();
    Ok(all_ports)
}

#[tauri::command]
pub fn connect_serial(
    config: SerialConfig,
    state: State<'_, SerialState>,
    window: tauri::Window,
) -> Result<String, String> {
    {
        let mut running = state.running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }

    let running = state.running.clone();
    let port_name = config.path.clone();
    let baud_rate = config.baud_rate;

    serial_service::spawn_reader_thread(port_name, baud_rate, running, window);

    Ok("连接成功".to_string())
}

#[tauri::command]
pub fn disconnect_serial(state: State<'_, SerialState>) -> Result<String, String> {
    let mut running = state.running.lock().map_err(|e| e.to_string())?;
    *running = false;
    Ok("断开连接".to_string())
}

