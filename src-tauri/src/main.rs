// MCU Log Debugger - Tauri 后端主程序 (v2.0.0-beta 模块化版)

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod models;
mod state;
mod services;
mod commands;

use state::serial_state::SerialState;

fn main() {
    tauri::Builder::default()
        // 管理全局串口状态
        .manage(SerialState::default())
        // 注册前端可调用的 Rust 命令
        .invoke_handler(tauri::generate_handler![
            commands::serial::list_serial_ports,
            commands::serial::connect_serial,
            commands::serial::disconnect_serial,
            commands::storage::save_log_file,
            commands::storage::get_all_release_notes,
            commands::settings::get_save_path,
            commands::settings::set_save_path
        ])
        // 启动 Tauri 事件循环
        .run(tauri::generate_context!())
        .expect("启动应用时出错");
}
