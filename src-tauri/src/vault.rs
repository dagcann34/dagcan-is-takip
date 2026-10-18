//! Şifreli kasa: PowerShell betikleri, altyapı notları, sunucu/servis parolaları, API anahtarları.
//!
//! Disk biçimi (`vault.dgv`, JSON): açık başlık (sürüm + Argon2id parametreleri + sarılı DEK) ve
//! her biri ayrı AES-256-GCM paketi olan kayıtlar. Başlık dahil hiçbir alan düz metin içerik taşımaz;
//! dosya iCloud Drive / OneDrive / Supabase gibi bir eşitleme katmanına olduğu gibi gönderilebilir.

use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::crypto::{self, Key, KdfParams, Sealed};

const FILE_VERSION: u32 = 1;
const AAD_DEK: &[u8] = b"dagcan-vault/v1/dek";
const CLIPBOARD_CLEAR_AFTER: Duration = Duration::from_secs(30);
const DEFAULT_AUTO_LOCK: Duration = Duration::from_secs(5 * 60);
/// Pencere arka plandayken (odak kaybı / tepsiye gizlenme) kasa en geç bu sürede kilitlenir.
const BACKGROUND_AUTO_LOCK: Duration = Duration::from_secs(60);
const MIN_PASSWORD_LEN: usize = 12;
/// Hata mesajları dil bağımsız kodlardır ("err.x" veya "err.x::ayrıntı"); arayüz TR/EN çevirir.
const LOCKED: &str = "err.vault.locked";

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemKind {
    Password,
    Server,
    Script,
    Note,
    ApiKey,
}

/// Bir kaydın şifrelenen tüm içeriği. Başlık ve etiketler dahil her şey şifrelidir.
#[derive(Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
struct ItemPayload {
    #[zeroize(skip)]
    kind: ItemKind,
    title: String,
    username: Option<String>,
    host: Option<String>,
    secret: String,
    notes: Option<String>,
    tags: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct StoredItem {
    id: String,
    updated_at: u64,
    sealed: Sealed,
}

#[derive(Serialize, Deserialize)]
struct VaultFile {
    version: u32,
    kdf: KdfParams,
    wrapped_dek: Sealed,
    items: Vec<StoredItem>,
}

/// Arayüze dönen özet; `secret` alanı yalnızca açıkça istenince (`vault_reveal`) gönderilir.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSummary {
    id: String,
    kind: ItemKind,
    title: String,
    username: Option<String>,
    host: Option<String>,
    notes: Option<String>,
    tags: Vec<String>,
    updated_at: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemInput {
    id: Option<String>,
    kind: ItemKind,
    title: String,
    username: Option<String>,
    host: Option<String>,
    /// Güncellemede `None` ise mevcut gizli değer korunur.
    secret: Option<String>,
    notes: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    initialized: bool,
    unlocked: bool,
    auto_lock_minutes: u64,
}

struct Unlocked {
    dek: Key,
    file: VaultFile,
}

struct Inner {
    unlocked: Option<Unlocked>,
    last_activity: Instant,
    auto_lock: Duration,
    in_background: bool,
    /// Her kopyalamada artar; eski zamanlayıcılar yeni kopyalamayı silmesin diye.
    clipboard_generation: u64,
}

pub struct VaultState {
    path: PathBuf,
    inner: Mutex<Inner>,
}

impl VaultState {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            inner: Mutex::new(Inner {
                unlocked: None,
                last_activity: Instant::now(),
                auto_lock: DEFAULT_AUTO_LOCK,
                in_background: false,
                clipboard_generation: 0,
            }),
        }
    }

    fn guard(&self) -> CmdResult<MutexGuard<'_, Inner>> {
        self.inner.lock().map_err(|_| "err.vault.state".to_string())
    }

    pub fn set_background(&self, background: bool) {
        if let Ok(mut g) = self.inner.lock() {
            g.in_background = background;
            g.last_activity = Instant::now();
        }
    }

    pub fn lock_now(&self) {
        if let Ok(mut g) = self.inner.lock() {
            g.unlocked = None;
        }
    }

    fn persist(&self, file: &VaultFile) -> CmdResult<()> {
        let bytes = serde_json::to_vec_pretty(file).map_err(|e| e.to_string())?;
        // Atomik yazım: yarım kalmış bir yazma kasayı bozmasın.
        let tmp = self.path.with_extension("dgv.tmp");
        fs::write(&tmp, bytes).map_err(|e| format!("err.vault.write::{e}"))?;
        fs::rename(&tmp, &self.path).map_err(|e| format!("err.vault.write::{e}"))
    }

    /// AI modülü için: başlığında "anthropic" geçen API Anahtarı kaydını döner.
    pub fn anthropic_key(&self) -> CmdResult<Zeroizing<String>> {
        let g = self.guard()?;
        let u = g.unlocked.as_ref().ok_or(LOCKED)?;
        for item in &u.file.items {
            let p = decrypt_item(&u.dek, item)?;
            if p.kind == ItemKind::ApiKey && p.title.to_lowercase().contains("anthropic") {
                return Ok(Zeroizing::new(p.secret.clone()));
            }
        }
        Err("err.vault.no_api_key".into())
    }
}

fn item_aad(id: &str) -> Vec<u8> {
    format!("dagcan-vault/v1/item/{id}").into_bytes()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn decrypt_item(dek: &Key, item: &StoredItem) -> CmdResult<ItemPayload> {
    let raw = crypto::open(dek, &item.sealed, &item_aad(&item.id)).map_err(|e| e.code())?;
    serde_json::from_slice(&raw).map_err(|e| format!("err.vault.item_corrupt::{e}"))
}

fn encrypt_item(dek: &Key, id: &str, payload: &ItemPayload) -> CmdResult<Sealed> {
    let raw = Zeroizing::new(serde_json::to_vec(payload).map_err(|e| e.to_string())?);
    crypto::seal(dek, &raw, &item_aad(id)).map_err(|e| e.code())
}

fn with_unlocked<T>(
    state: &VaultState,
    f: impl FnOnce(&mut Unlocked) -> CmdResult<T>,
) -> CmdResult<T> {
    let mut g = state.guard()?;
    g.last_activity = Instant::now();
    let u = g.unlocked.as_mut().ok_or(LOCKED)?;
    f(u)
}

// ───────────────────────────── Komutlar ─────────────────────────────

#[tauri::command]
pub fn vault_status(state: State<'_, VaultState>) -> CmdResult<VaultStatus> {
    let g = state.guard()?;
    Ok(VaultStatus {
        initialized: state.path.exists(),
        unlocked: g.unlocked.is_some(),
        auto_lock_minutes: g.auto_lock.as_secs() / 60,
    })
}

#[tauri::command]
pub fn vault_init(state: State<'_, VaultState>, password: String) -> CmdResult<()> {
    let password = Zeroizing::new(password);
    if password.chars().count() < MIN_PASSWORD_LEN {
        return Err("err.vault.pw_too_short".into());
    }
    if state.path.exists() {
        return Err("err.vault.exists".into());
    }
    let kdf = KdfParams::new_random();
    let kek = crypto::derive_kek(password.as_bytes(), &kdf).map_err(|e| e.code())?;
    let dek = crypto::random_key();
    let wrapped_dek = crypto::wrap_key(&kek, &dek, AAD_DEK).map_err(|e| e.code())?;
    let file = VaultFile { version: FILE_VERSION, kdf, wrapped_dek, items: Vec::new() };
    state.persist(&file)?;
    let mut g = state.guard()?;
    g.unlocked = Some(Unlocked { dek, file });
    g.last_activity = Instant::now();
    Ok(())
}

#[tauri::command]
pub fn vault_unlock(state: State<'_, VaultState>, password: String) -> CmdResult<()> {
    let password = Zeroizing::new(password);
    let bytes = fs::read(&state.path).map_err(|_| "err.vault.no_file".to_string())?;
    let file: VaultFile = serde_json::from_slice(&bytes).map_err(|e| format!("err.vault.corrupt::{e}"))?;
    if file.version != FILE_VERSION {
        return Err(format!("err.vault.version::{}", file.version));
    }
    let kek = crypto::derive_kek(password.as_bytes(), &file.kdf).map_err(|e| e.code())?;
    let dek = crypto::unwrap_key(&kek, &file.wrapped_dek, AAD_DEK)
        .map_err(|_| "err.vault.wrong_password".to_string())?;
    let mut g = state.guard()?;
    g.unlocked = Some(Unlocked { dek, file });
    g.last_activity = Instant::now();
    Ok(())
}

#[tauri::command]
pub fn vault_lock(state: State<'_, VaultState>) {
    state.lock_now();
}

#[tauri::command]
pub fn vault_touch(state: State<'_, VaultState>) {
    if let Ok(mut g) = state.inner.lock() {
        g.last_activity = Instant::now();
    }
}

#[tauri::command]
pub fn vault_set_auto_lock(state: State<'_, VaultState>, minutes: u64) -> CmdResult<()> {
    let mut g = state.guard()?;
    g.auto_lock = Duration::from_secs(minutes.clamp(1, 120) * 60);
    Ok(())
}

#[tauri::command]
pub fn vault_list(state: State<'_, VaultState>) -> CmdResult<Vec<ItemSummary>> {
    with_unlocked(&state, |u| {
        let mut out = Vec::with_capacity(u.file.items.len());
        for item in &u.file.items {
            let p = decrypt_item(&u.dek, item)?;
            out.push(ItemSummary {
                id: item.id.clone(),
                kind: p.kind,
                title: p.title.clone(),
                username: p.username.clone(),
                host: p.host.clone(),
                notes: p.notes.clone(),
                tags: p.tags.clone(),
                updated_at: item.updated_at,
            });
        }
        out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(out)
    })
}

#[tauri::command]
pub fn vault_upsert(state: State<'_, VaultState>, input: ItemInput) -> CmdResult<String> {
    if input.title.trim().is_empty() {
        return Err("err.vault.title_empty".into());
    }
    let id = with_unlocked(&state, |u| {
        let id = input.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let existing = u.file.items.iter().position(|i| i.id == id);
        let secret = match (&input.secret, existing) {
            (Some(s), _) => s.clone(),
            (None, Some(idx)) => decrypt_item(&u.dek, &u.file.items[idx])?.secret.clone(),
            (None, None) => String::new(),
        };
        let payload = ItemPayload {
            kind: input.kind,
            title: input.title.trim().to_string(),
            username: input.username.clone().filter(|s| !s.is_empty()),
            host: input.host.clone().filter(|s| !s.is_empty()),
            secret,
            notes: input.notes.clone().filter(|s| !s.is_empty()),
            tags: input.tags.clone(),
        };
        let stored = StoredItem { id: id.clone(), updated_at: now_ms(), sealed: encrypt_item(&u.dek, &id, &payload)? };
        match existing {
            Some(idx) => u.file.items[idx] = stored,
            None => u.file.items.push(stored),
        }
        Ok(id)
    })?;
    let g = state.guard()?;
    if let Some(u) = g.unlocked.as_ref() {
        state.persist(&u.file)?;
    }
    Ok(id)
}

#[tauri::command]
pub fn vault_delete(state: State<'_, VaultState>, id: String) -> CmdResult<()> {
    with_unlocked(&state, |u| {
        u.file.items.retain(|i| i.id != id);
        Ok(())
    })?;
    let g = state.guard()?;
    if let Some(u) = g.unlocked.as_ref() {
        state.persist(&u.file)?;
    }
    Ok(())
}

#[tauri::command]
pub fn vault_reveal(state: State<'_, VaultState>, id: String) -> CmdResult<String> {
    with_unlocked(&state, |u| {
        let item = u.file.items.iter().find(|i| i.id == id).ok_or("err.vault.item_not_found")?;
        Ok(decrypt_item(&u.dek, item)?.secret.clone())
    })
}

/// Gizli değeri panoya kopyalar ve 30 sn sonra, pano hâlâ aynı değeri tutuyorsa temizler.
#[tauri::command]
pub fn vault_copy(app: AppHandle, state: State<'_, VaultState>, id: String) -> CmdResult<u64> {
    let secret = Zeroizing::new(vault_reveal(state.clone(), id)?);
    app.clipboard().write_text(secret.to_string()).map_err(|e| e.to_string())?;
    let generation = {
        let mut g = state.guard()?;
        g.clipboard_generation += 1;
        g.clipboard_generation
    };
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(CLIPBOARD_CLEAR_AFTER);
        let state = handle.state::<VaultState>();
        let current = state.inner.lock().map(|g| g.clipboard_generation).unwrap_or(0);
        if current != generation {
            return;
        }
        let still_ours = handle
            .clipboard()
            .read_text()
            .map(|t| Zeroizing::new(t).as_str() == secret.as_str())
            .unwrap_or(false);
        if still_ours {
            let _ = handle.clipboard().write_text(String::new());
            let _ = handle.emit("clipboard-cleared", ());
        }
    });
    Ok(CLIPBOARD_CLEAR_AFTER.as_secs())
}

/// Boşta kalma / arka plan kilidi. Kilitlenince arayüze `vault-locked` olayı gönderir.
pub fn spawn_auto_lock(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(5));
        let state = app.state::<VaultState>();
        let locked_now = match state.inner.lock() {
            Ok(mut g) => {
                let limit = if g.in_background { BACKGROUND_AUTO_LOCK.min(g.auto_lock) } else { g.auto_lock };
                if g.unlocked.is_some() && g.last_activity.elapsed() >= limit {
                    g.unlocked = None;
                    true
                } else {
                    false
                }
            }
            Err(_) => false,
        };
        if locked_now {
            let _ = app.emit("vault-locked", ());
        }
    });
}

/// Şifreli kasa dosyasını olduğu gibi İndirilenler klasörüne kopyalar (açmak için ana parola gerekir).
#[tauri::command]
pub fn vault_export_backup(app: AppHandle, state: State<'_, VaultState>) -> CmdResult<String> {
    if !state.path.exists() {
        return Err("err.vault.no_file".into());
    }
    let stamp = now_ms() / 1000;
    let dir = app.path().download_dir().map_err(|e| format!("err.export.write::{e}"))?;
    let target = dir.join(format!("dagcan-vault-{stamp}.dgv"));
    fs::copy(&state.path, &target).map_err(|e| format!("err.export.write::{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}
