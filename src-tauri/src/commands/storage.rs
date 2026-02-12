use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
pub fn save_log_file(
    content: String,
    filename: String,
    save_path: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    let base_path = if let Some(path) = save_path {
        PathBuf::from(path)
    } else {
        app.path_resolver()
            .app_data_dir()
            .ok_or("无法获取应用数据目录")?
            .join("logs")
    };

    std::fs::create_dir_all(&base_path).map_err(|e| format!("创建目录失败: {}", e))?;

    let file_path = base_path.join(&filename);

    let mut file = File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

