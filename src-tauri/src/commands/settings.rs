use tauri::AppHandle;

#[tauri::command]
pub fn get_save_path(app: AppHandle) -> Result<String, String> {
    let config_dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or("无法获取配置目录")?;

    let config_file = config_dir.join("settings.json");

    if !config_file.exists() {
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
        let default_path = app
            .path_resolver()
            .app_data_dir()
            .ok_or("无法获取应用数据目录")?
            .join("logs");
        Ok(default_path.to_string_lossy().to_string())
    }
}

#[tauri::command]
pub fn set_save_path(path: String, app: AppHandle) -> Result<String, String> {
    let config_dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or("无法获取配置目录")?;

    std::fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;

    let config_file = config_dir.join("settings.json");

    let mut config: serde_json::Value = if config_file.exists() {
        let content = std::fs::read_to_string(&config_file)
            .map_err(|e| format!("读取配置文件失败: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    config["savePath"] = serde_json::Value::String(path.clone());

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    std::fs::write(&config_file, content).map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(format!("保存路径已设置为: {}", path))
}

