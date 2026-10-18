//! Şifreli pano deposu.
//!
//! Pano verisi diske yalnızca AES-256-GCM ile şifrelenmiş olarak yazılır. Anahtar rastgele üretilir
//! ve işletim sisteminin güvenli kasasında tutulur (macOS Anahtar Zinciri / Windows Kimlik Bilgisi
//! Yöneticisi). Dosya kopyalansa ve şifreleme yöntemi bilinse bile, anahtar o kullanıcı oturumunun
//! kasasından çıkmadan veri okunamaz (Kerckhoffs ilkesi: güvenlik algoritmaya değil anahtara dayanır).

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, Window};
use zeroize::Zeroizing;

use crate::crypto::{self, Key, Sealed};
use crate::keychain;
use crate::secure_fs;

const KEYCHAIN_ACCOUNT: &str = "board-key-v1";
const AAD: &[u8] = b"dagcan-board/v1";
const FILE_VERSION: u32 = 1;
/// Kötü niyetli veya hatalı çok büyük yazımlara karşı üst sınır.
const MAX_BOARD_BYTES: usize = 25 * 1024 * 1024;

#[derive(Serialize, Deserialize)]
struct BoardFile {
    v: u32,
    sealed: Sealed,
}

#[derive(Default)]
pub struct BoardState {
    key: Mutex<Option<Key>>,
}

fn board_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("board.json"))
}

/// Cihaz anahtarını işletim sistemi kasasından okur; yoksa üretip kaydeder.
fn device_key(state: &BoardState) -> Result<Key, String> {
    let mut guard = state.key.lock().map_err(|_| "err.vault.state".to_string())?;
    if let Some(k) = guard.as_ref() {
        return Ok(Zeroizing::new(**k));
    }
    let key = match keychain::load(KEYCHAIN_ACCOUNT)? {
        Some(k) => k,
        None => {
            let k = crypto::random_key();
            keychain::store(KEYCHAIN_ACCOUNT, &k)?;
            k
        }
    };
    *guard = Some(Zeroizing::new(*key));
    Ok(key)
}

fn encrypt_and_write(app: &AppHandle, state: &BoardState, json: &str) -> Result<(), String> {
    let key = device_key(state)?;
    let sealed = crypto::seal(&key, json.as_bytes(), AAD).map_err(|e| e.code())?;
    let bytes = serde_json::to_vec(&BoardFile { v: FILE_VERSION, sealed }).map_err(|e| e.to_string())?;
    secure_fs::write_private(&board_path(app)?, &bytes).map_err(|e| format!("err.export.write::{e}"))
}

/// Panoyu çözer ve JSON metni olarak döner (yoksa None). Eski sürümlerin düz metin dosyası
/// bulunursa aynı anda şifrelenmiş biçime taşınır.
#[tauri::command]
pub fn board_load(app: AppHandle, state: State<'_, BoardState>) -> Result<Option<String>, String> {
    let path = board_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(&path).map_err(|e| format!("err.export.write::{e}"))?;
    if let Ok(file) = serde_json::from_slice::<BoardFile>(&bytes) {
        if file.v != FILE_VERSION {
            return Err(format!("err.vault.version::{}", file.v));
        }
        let key = device_key(&state)?;
        let plain = crypto::open(&key, &file.sealed, AAD).map_err(|e| e.code())?;
        return String::from_utf8(plain.to_vec()).map(Some).map_err(|e| format!("err.vault.corrupt::{e}"));
    }
    // Eski (v0.4.x) düz metin pano: doğrula, şifrele, üzerine yaz.
    let legacy = String::from_utf8(bytes).map_err(|e| format!("err.vault.corrupt::{e}"))?;
    serde_json::from_str::<serde_json::Value>(&legacy).map_err(|e| format!("err.vault.corrupt::{e}"))?;
    encrypt_and_write(&app, &state, &legacy)?;
    Ok(Some(legacy))
}

/// Panoyu şifreleyip atomik olarak yazar ve diğer pencerelere değişikliği bildirir.
#[tauri::command]
pub fn board_save(app: AppHandle, window: Window, state: State<'_, BoardState>, data: String) -> Result<(), String> {
    if data.len() > MAX_BOARD_BYTES {
        return Err("err.board.too_large".into());
    }
    serde_json::from_str::<serde_json::Value>(&data).map_err(|e| format!("err.vault.corrupt::{e}"))?;
    encrypt_and_write(&app, &state, &data)?;
    let _ = app.emit("board-changed", window.label().to_string());
    Ok(())
}

const EXPORT_AAD: &[u8] = b"kanvault-board-export/v1";

#[derive(Serialize, Deserialize)]
struct BoardExport {
    kanvault_board_export: u32,
    kdf: crypto::KdfParams,
    sealed: Sealed,
}

/// Panoyu (geçmiş dahil) yedek parolasıyla şifreleyip İndirilenler'e `.kvb` olarak yazar.
/// Yedek, bu cihazın anahtarından bağımsızdır: başka bir bilgisayarda aynı parolayla açılır.
#[tauri::command]
pub fn board_export_encrypted(app: AppHandle, password: String, data: String) -> Result<String, String> {
    let password = Zeroizing::new(password);
    let data = Zeroizing::new(data);
    if password.chars().count() < 12 {
        return Err("err.vault.pw_too_short".into());
    }
    if data.len() > MAX_BOARD_BYTES {
        return Err("err.board.too_large".into());
    }
    serde_json::from_str::<serde_json::Value>(&data).map_err(|e| format!("err.vault.corrupt::{e}"))?;
    let kdf = crypto::KdfParams::new_random();
    let kek = crypto::derive_kek(password.as_bytes(), &kdf).map_err(|e| e.code())?;
    let sealed = crypto::seal(&kek, data.as_bytes(), EXPORT_AAD).map_err(|e| e.code())?;
    let bytes = serde_json::to_vec(&BoardExport { kanvault_board_export: 1, kdf, sealed }).map_err(|e| e.to_string())?;
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let target = secure_fs::unique_path(&dir, &format!("kanvault-board-{stamp}.kvb"));
    secure_fs::write_new_private(&target, &bytes).map_err(|e| format!("err.export.write::{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}

/// Şifreli `.kvb` yedeğini çözer ve pano JSON'unu döner (arayüz doğrular ve kaydeder).
#[tauri::command]
pub fn board_import_encrypted(password: String, file: String) -> Result<String, String> {
    let password = Zeroizing::new(password);
    if file.len() > MAX_BOARD_BYTES * 2 {
        return Err("err.board.too_large".into());
    }
    let export: BoardExport = serde_json::from_str(&file).map_err(|_| "err.settings.import_invalid".to_string())?;
    if export.kanvault_board_export != 1 {
        return Err("err.settings.import_invalid".into());
    }
    let kek = crypto::derive_kek(password.as_bytes(), &export.kdf).map_err(|e| e.code())?;
    let plain = crypto::open(&kek, &export.sealed, EXPORT_AAD).map_err(|_| "err.vault.wrong_password".to_string())?;
    String::from_utf8(plain.to_vec()).map_err(|_| "err.settings.import_invalid".to_string())
}
