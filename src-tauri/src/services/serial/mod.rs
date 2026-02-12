use std::fs::OpenOptions;
use std::io::{BufRead, BufReader};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub fn is_virtual_port(path: &str) -> bool {
    path.contains("/ttys") || path.contains("/ptyp") || path.contains("/pts/")
}

pub fn spawn_reader_thread(
    port_name: String,
    baud_rate: u32,
    running: Arc<Mutex<bool>>,
    window: tauri::Window,
) {
    let is_virtual = is_virtual_port(&port_name);

    thread::spawn(move || {
        if is_virtual {
            read_virtual_port(port_name, running, window);
        } else {
            read_real_port(port_name, baud_rate, running, window);
        }
    });
}

fn read_real_port(
    port_name: String,
    baud_rate: u32,
    running: Arc<Mutex<bool>>,
    window: tauri::Window,
) {
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

    loop {
        {
            let running_guard = running.lock().unwrap();
            if !*running_guard {
                break;
            }
        }

        match port.read(buffer.as_mut_slice()) {
            Ok(n) if n > 0 => {
                let data = String::from_utf8_lossy(&buffer[..n]);
                line_buffer.push_str(&data);

                while let Some(pos) = line_buffer.find('\n') {
                    let line = line_buffer[..pos].trim().to_string();
                    line_buffer = line_buffer[pos + 1..].to_string();

                    if !line.is_empty() {
                        let _ = window.emit("serial-data", line);
                    }
                }
            }
            Ok(_) => {}
            Err(e) => {
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

fn read_virtual_port(port_name: String, running: Arc<Mutex<bool>>, window: tauri::Window) {
    let file_result = OpenOptions::new().read(true).write(true).open(&port_name);

    let file = match file_result {
        Ok(f) => f,
        Err(e) => {
            let _ = window.emit("serial-error", format!("打开失败: {}", e));
            return;
        }
    };

    let mut reader = BufReader::new(file);
    let mut line = String::new();

    loop {
        {
            let running_guard = running.lock().unwrap();
            if !*running_guard {
                break;
            }
        }

        line.clear();
        match reader.read_line(&mut line) {
            Ok(n) if n > 0 => {
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    let _ = window.emit("serial-data", trimmed);
                }
            }
            Ok(_) => {
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

