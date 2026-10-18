//! Güvenlikle ilgili kullanıcı tercihleri (WebView depolaması yerine uygulama klasöründe, 0600).

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::secure_fs;

#[derive(Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "yes")]
    pub content_protection: bool,
}

fn yes() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self { content_protection: true }
    }
}

fn path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join("settings.json"))
}

pub fn load(app: &AppHandle) -> Settings {
    path(app)
        .and_then(|p| std::fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub fn update(app: &AppHandle, f: impl FnOnce(&mut Settings)) -> Result<(), String> {
    let mut s = load(app);
    f(&mut s);
    let p = path(app).ok_or("err.vault.state")?;
    let bytes = serde_json::to_vec(&s).map_err(|e| e.to_string())?;
    secure_fs::write_private(&p, &bytes).map_err(|e| format!("err.vault.write::{e}"))
}
