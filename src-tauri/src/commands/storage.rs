use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct ReleaseNote {
    pub version: String,
    pub date: String,
    pub channel: String,
    pub content: String,
}

#[derive(Deserialize)]
struct ReleaseIndexItem {
    version: String,
    date: Option<String>,
    channel: Option<String>,
    notes_path: String,
}

fn resolve_docs_root(app: &AppHandle) -> PathBuf {
    let mut docs_path = app
        .path_resolver()
        .resource_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("docs");

    if !docs_path.exists() {
        docs_path = PathBuf::from("docs");
    }

    if !docs_path.exists() {
        docs_path = PathBuf::from("../docs");
    }

    docs_path
}

#[tauri::command]
pub fn get_all_release_notes(app: AppHandle) -> Result<Vec<ReleaseNote>, String> {
    let docs_root = resolve_docs_root(&app);
    let mut notes: Vec<ReleaseNote> = Vec::new();

    if !docs_root.exists() {
        return Ok(notes);
    }

    // Prefer index file if present
    let index_path = docs_root.join("releases").join("index.json");
    if index_path.exists() {
        let index_str = fs::read_to_string(&index_path)
            .map_err(|e| format!("读取公告索引失败: {}", e))?;
        let index: Vec<ReleaseIndexItem> =
            serde_json::from_str(&index_str).map_err(|e| format!("解析公告索引失败: {}", e))?;

        for item in index {
            let note_file = docs_root.join(item.notes_path);
            if !note_file.exists() {
                continue;
            }
            let content = fs::read_to_string(&note_file)
                .map_err(|e| format!("读取公告文件失败({:?}): {}", note_file, e))?;

            notes.push(ReleaseNote {
                version: item.version,
                date: item.date.unwrap_or_default(),
                channel: item.channel.unwrap_or_else(|| "stable".to_string()),
                content,
            });
        }

        return Ok(notes);
    }

    // Fallback: scan docs/v*/RELEASE_NOTES.md
    if let Ok(entries) = fs::read_dir(&docs_root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let dirname = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if !dirname.starts_with('v') {
                continue;
            }
            let note_file = path.join("RELEASE_NOTES.md");
            if !note_file.exists() {
                continue;
            }
            if let Ok(content) = fs::read_to_string(note_file) {
                notes.push(ReleaseNote {
                    version: dirname,
                    date: "".to_string(),
                    channel: "stable".to_string(),
                    content,
                });
            }
        }
    }

    notes.sort_by(|a, b| b.version.cmp(&a.version));
    Ok(notes)
}

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
