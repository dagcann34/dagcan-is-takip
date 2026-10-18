mod ai;
mod board;
mod crypto;
mod keychain;
mod secure_clipboard;
mod secure_fs;
mod settings;
mod vault;

use std::fs;
use std::path::Path;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use vault::VaultState;

/// Hızlı Görev penceresi: macOS'ta ⌘⇧Space, Windows'ta Ctrl+Shift+Space.
fn quick_shortcut() -> Shortcut {
    #[cfg(target_os = "macos")]
    let mods = Modifiers::SUPER | Modifiers::SHIFT;
    #[cfg(not(target_os = "macos"))]
    let mods = Modifiers::CONTROL | Modifiers::SHIFT;
    Shortcut::new(Some(mods), Code::Space)
}

fn toggle_quick(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("quick") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.center();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[derive(serde::Deserialize)]
struct TrayLabels {
    open: String,
    quick: String,
    lock: String,
    quit: String,
}

impl Default for TrayLabels {
    fn default() -> Self {
        Self {
            open: "Kanvault'u Aç".into(),
            quick: "Hızlı Görev Ekle".into(),
            lock: "Kasayı Kilitle".into(),
            quit: "Çıkış".into(),
        }
    }
}

fn tray_menu(app: &AppHandle, l: &TrayLabels) -> tauri::Result<Menu<tauri::Wry>> {
    let open = MenuItem::with_id(app, "open", &l.open, true, None::<&str>)?;
    let quick = MenuItem::with_id(app, "quick", &l.quick, true, None::<&str>)?;
    let lock = MenuItem::with_id(app, "lock", &l.lock, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", &l.quit, true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    Menu::with_items(app, &[&open, &quick, &lock, &sep, &quit])
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = tray_menu(app, &TrayLabels::default())?;
    let mut tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("Kanvault")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quick" => toggle_quick(app),
            "lock" => {
                app.state::<VaultState>().lock_now();
                let _ = app.emit("vault-locked", ());
            }
            "quit" => {
                app.state::<VaultState>().lock_now();
                app.exit(0);
            }
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Arayüz dili değişince tepsi menüsünü yeniden kurar.
#[tauri::command]
fn set_tray_labels(app: AppHandle, labels: TrayLabels) -> Result<(), String> {
    let menu = tray_menu(&app, &labels).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// İzin verilen dışa aktarma türleri ve üst sınır (base64 öncesi 50 MiB).
const EXPORT_EXTENSIONS: &[&str] = &["png", "pdf", "ics", "kvb"];
const EXPORT_MAX_BYTES: usize = 50 << 20;

/// Dışa aktarımları İndirilenler klasörüne yazar: yalnızca izinli uzantılar, boyut sınırı,
/// var olan dosyanın üzerine yazmadan yeni ad, 0600 izin ve sembolik bağ izlememe.
#[tauri::command]
fn save_export(app: AppHandle, file_name: String, base64: String) -> Result<String, String> {
    if base64.len() > EXPORT_MAX_BYTES / 3 * 4 + 4 {
        return Err("err.board.too_large".into());
    }
    let safe_name = Path::new(&file_name)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.starts_with('.') && n.len() <= 120)
        .ok_or("err.export.bad_name")?
        .to_string();
    let ext = Path::new(&safe_name).extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).unwrap_or_default();
    if !EXPORT_EXTENSIONS.contains(&ext.as_str()) {
        return Err("err.export.bad_name".into());
    }
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let bytes = B64.decode(base64).map_err(|e| e.to_string())?;
    let target = secure_fs::unique_path(&dir, &safe_name);
    secure_fs::write_new_private(&target, &bytes).map_err(|e| format!("err.export.write::{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}

/// AI çıktısı gibi kullanıcının bilerek kopyaladığı metni güvenli panoya yazar; 2 dk sonra temizler.
#[tauri::command]
fn copy_sensitive_text(app: AppHandle, text: String) -> Result<u64, String> {
    if text.len() > 1 << 20 {
        return Err("err.board.too_large".into());
    }
    let text = zeroize::Zeroizing::new(text);
    secure_clipboard::write_with_expiry(app, &text, std::time::Duration::from_secs(120))?;
    Ok(120)
}

/// Eski sürümlerin WebView depolamasında (localStorage) kalmış düz metin pano verisini bir kez siler.
#[tauri::command]
fn wipe_legacy_web_data(app: AppHandle) -> Result<bool, String> {
    let marker = app.path().app_data_dir().map_err(|e| e.to_string())?.join(".legacy-wiped");
    if marker.exists() {
        return Ok(false);
    }
    if let Some(w) = app.get_webview_window("main") {
        w.clear_all_browsing_data().map_err(|e| e.to_string())?;
    }
    secure_fs::write_private(&marker, b"1").map_err(|e| e.to_string())?;
    Ok(true)
}

fn apply_content_protection(app: &AppHandle, enabled: bool) -> Result<(), String> {
    for (_, w) in app.webview_windows() {
        w.set_content_protected(enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Ekran görüntüsü / ekran kaydı korumasını açar veya kapatır (macOS: NSWindow.sharingType = none,
/// Windows: WDA_EXCLUDEFROMCAPTURE). Ayar Rust tarafında saklanır; kapatmak için kasa varsa
/// açık olması gerekir (WebView'den kendiliğinden kapatılamaz).
#[tauri::command]
fn set_content_protection(app: AppHandle, enabled: bool) -> Result<(), String> {
    if !enabled {
        let vault = app.state::<VaultState>();
        if vault.exists() && !vault.is_unlocked() {
            return Err("err.settings.unlock_required".into());
        }
    }
    apply_content_protection(&app, enabled)?;
    settings::update(&app, |s| s.content_protection = enabled)
}

#[tauri::command]
fn get_content_protection(app: AppHandle) -> bool {
    settings::load(&app).content_protection
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_quick(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            app.manage(VaultState::new(data_dir.join("vault.dgv")));
            app.manage(board::BoardState::default());
            // Eski sürümlerden kalan hassas dosyaların izinlerini daralt.
            let _ = secure_fs::restrict(&data_dir.join("vault.dgv"));
            let _ = secure_fs::restrict(&data_dir.join("board.json"));
            vault::spawn_auto_lock(app.handle().clone());
            build_tray(app.handle())?;
            // Kayıtlı ekran koruması tercihini uygula (varsayılan: açık).
            let _ = apply_content_protection(app.handle(), settings::load(app.handle()).content_protection);
            // Girişte otomatik başlatıldıysa yalnızca tepside/menü çubuğunda başla.
            if std::env::args().any(|a| a == "--minimized") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            if let Err(e) = app.global_shortcut().register(quick_shortcut()) {
                eprintln!("Kısayol kaydedilemedi (başka uygulama kullanıyor olabilir): {e}");
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Ana pencere kapatılınca uygulama tepside çalışmaya devam eder.
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                let _ = window.hide();
                window.state::<VaultState>().set_background(true);
            }
            WindowEvent::Focused(focused) if window.label() == "main" => {
                window.state::<VaultState>().set_background(!*focused);
            }
            WindowEvent::Focused(false) if window.label() == "quick" => {
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            save_export,
            set_tray_labels,
            set_content_protection,
            get_content_protection,
            copy_sensitive_text,
            wipe_legacy_web_data,
            vault::vault_item_notes,
            vault::vault_recovery_key,
            board::board_load,
            board::board_save,
            board::board_export_encrypted,
            board::board_import_encrypted,
            vault::vault_export_backup,
            vault::vault_status,
            vault::vault_init,
            vault::vault_unlock,
            vault::vault_lock,
            vault::vault_touch,
            vault::vault_set_auto_lock,
            vault::vault_list,
            vault::vault_upsert,
            vault::vault_delete,
            vault::vault_reveal,
            vault::vault_copy,
            ai::ai_generate,
        ])
        .run(tauri::generate_context!())
        .expect("Kanvault could not start");
}
