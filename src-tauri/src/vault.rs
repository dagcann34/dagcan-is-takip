//! Şifreli kasa: PowerShell betikleri, altyapı notları, sunucu/servis parolaları, API anahtarları.
//!
//! Disk biçimi (`vault.dgv`, JSON): açık başlık (sürüm + Argon2id parametreleri + sarılı DEK) ve
//! her biri ayrı AES-256-GCM paketi olan kayıtlar. Başlık dahil hiçbir alan düz metin içerik taşımaz.
//!
//! v2 (Kanvault 1.0): KEK = HKDF(Argon2id(parola, 256 MiB) ‖ cihaz gizli anahtarı). Gizli anahtar
//! işletim sistemi kasasında durur ve kullanıcıya bir kez "kurtarma anahtarı" olarak gösterilir.
//! Kasa dosyası ve parola birlikte çalınsa bile gizli anahtar olmadan açılamaz.

use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::crypto::{self, Key, KdfParams, Sealed};
use crate::{keychain, secure_clipboard, secure_fs};

const V1: u32 = 1;
const V2: u32 = 2;
const AAD_DEK: &[u8] = b"dagcan-vault/v1/dek";
const AAD_DEK_V2: &[u8] = b"kanvault-vault/v2/dek";
const SECRET_ACCOUNT: &str = "vault-secret-v2";
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

/// Arayüze dönen özet. Gizli değer (`vault_reveal`) ve notlar (`vault_item_notes`) yalnızca
/// açıkça istenince, tek kayıt için gönderilir.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSummary {
    id: String,
    kind: ItemKind,
    title: String,
    username: Option<String>,
    host: Option<String>,
    has_notes: bool,
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
    /// Güncellemede `None` ise mevcut not korunur; boş metin notu siler.
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
    /// v2 kasa var ama bu cihazda gizli anahtar yok: kurtarma anahtarı gerekir.
    needs_recovery: bool,
}

struct Unlocked {
    dek: Key,
    file: VaultFile,
}

#[derive(Default, Serialize, Deserialize)]
struct Throttle {
    failed: u32,
    retry_after_unix: u64,
}

struct Inner {
    unlocked: Option<Unlocked>,
    last_activity: Instant,
    auto_lock: Duration,
    in_background: bool,
    /// Kaba kuvvet koruması (uygulama yeniden başlasa da korunur).
    throttle: Throttle,
}

pub struct VaultState {
    path: PathBuf,
    throttle_path: PathBuf,
    inner: Mutex<Inner>,
}

fn unix_now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

impl VaultState {
    pub fn new(path: PathBuf) -> Self {
        let throttle_path = path.with_extension("guard");
        let throttle = fs::read(&throttle_path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        Self {
            path,
            throttle_path,
            inner: Mutex::new(Inner {
                unlocked: None,
                last_activity: Instant::now(),
                auto_lock: DEFAULT_AUTO_LOCK,
                in_background: false,
                throttle,
            }),
        }
    }

    fn guard(&self) -> CmdResult<MutexGuard<'_, Inner>> {
        self.inner.lock().map_err(|_| "err.vault.state".to_string())
    }

    pub fn exists(&self) -> bool {
        self.path.exists()
    }

    pub fn is_unlocked(&self) -> bool {
        self.inner.lock().map(|g| g.unlocked.is_some()).unwrap_or(false)
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
        // Atomik, yalnızca sahibin okuyabildiği (0600) yazım.
        secure_fs::write_private(&self.path, &bytes).map_err(|e| format!("err.vault.write::{e}"))
    }

    fn save_throttle(&self, t: &Throttle) {
        if let Ok(bytes) = serde_json::to_vec(t) {
            let _ = secure_fs::write_private(&self.throttle_path, &bytes);
        }
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

fn decrypt_item(dek: &Key, item: &StoredItem) -> CmdResult<ItemPayload> {
    let raw = crypto::open(dek, &item.sealed, &item_aad(&item.id)).map_err(|e| e.code())?;
    serde_json::from_slice(&raw).map_err(|e| format!("err.vault.item_corrupt::{e}"))
}

fn encrypt_item(dek: &Key, id: &str, payload: &ItemPayload) -> CmdResult<Sealed> {
    let raw = Zeroizing::new(serde_json::to_vec(payload).map_err(|e| e.to_string())?);
    crypto::seal(dek, &raw, &item_aad(id)).map_err(|e| e.code())
}

fn with_unlocked<T>(state: &VaultState, f: impl FnOnce(&mut Unlocked) -> CmdResult<T>) -> CmdResult<T> {
    let mut g = state.guard()?;
    g.last_activity = Instant::now();
    let u = g.unlocked.as_mut().ok_or(LOCKED)?;
    f(u)
}

/// Ana parola gücü: en az 12 karakter, en az 3 karakter sınıfı (veya 20+ karakterlik parola cümlesi),
/// yeterli çeşitlilik ve yaygın kalıp içermeme.
pub fn check_password_strength(pw: &str) -> CmdResult<()> {
    let len = pw.chars().count();
    if len < MIN_PASSWORD_LEN {
        return Err("err.vault.pw_too_short".into());
    }
    let classes = [
        pw.chars().any(|c| c.is_lowercase()),
        pw.chars().any(|c| c.is_uppercase()),
        pw.chars().any(|c| c.is_numeric()),
        pw.chars().any(|c| !c.is_alphanumeric()),
    ]
    .iter()
    .filter(|b| **b)
    .count();
    let mut unique: Vec<char> = pw.to_lowercase().chars().collect();
    unique.sort_unstable();
    unique.dedup();
    let lower = pw.to_lowercase();
    const COMMON: &[&str] = &["password", "parola", "sifre", "şifre", "123456", "qwerty", "abcdef", "kanvault", "dagcan", "admin", "letmein", "welcome"];
    if (classes < 3 && len < 20) || unique.len() < 6 || COMMON.iter().any(|w| lower.contains(w)) {
        return Err("err.vault.pw_weak".into());
    }
    Ok(())
}

// ───────────────────────────── Komutlar ─────────────────────────────

fn read_file(state: &VaultState) -> CmdResult<VaultFile> {
    let bytes = fs::read(&state.path).map_err(|_| "err.vault.no_file".to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("err.vault.corrupt::{e}"))
}

#[tauri::command]
pub fn vault_status(state: State<'_, VaultState>) -> CmdResult<VaultStatus> {
    let initialized = state.path.exists();
    let needs_recovery = initialized
        && read_file(&state).map(|f| f.version == V2).unwrap_or(false)
        && keychain::load(SECRET_ACCOUNT).map(|k| k.is_none()).unwrap_or(true);
    let g = state.guard()?;
    Ok(VaultStatus {
        initialized,
        unlocked: g.unlocked.is_some(),
        auto_lock_minutes: g.auto_lock.as_secs() / 60,
        needs_recovery,
    })
}

/// Ağır anahtar türetme (256 MiB Argon2id) arayüz iş parçacığını dondurmasın diye arka planda çalışır.
async fn blocking<T: Send + 'static>(app: AppHandle, f: impl FnOnce(&VaultState) -> CmdResult<T> + Send + 'static) -> CmdResult<T> {
    tauri::async_runtime::spawn_blocking(move || f(&app.state::<VaultState>()))
        .await
        .map_err(|_| "err.vault.state".to_string())?
}

fn get_or_create_secret() -> CmdResult<Key> {
    match keychain::load(SECRET_ACCOUNT)? {
        Some(k) => Ok(k),
        None => {
            let k = crypto::random_key();
            keychain::store(SECRET_ACCOUNT, &k)?;
            Ok(k)
        }
    }
}

/// Yeni v2 kasa oluşturur ve kurtarma anahtarını bir kez döner (arayüz kullanıcıya gösterir).
#[tauri::command]
pub async fn vault_init(app: AppHandle, password: String) -> CmdResult<String> {
    let password = Zeroizing::new(password);
    blocking(app, move |state| {
        check_password_strength(&password)?;
        if state.path.exists() {
            return Err("err.vault.exists".into());
        }
        let secret = get_or_create_secret()?;
        let kdf = KdfParams::new_strong();
        let kek = crypto::derive_kek_v2(password.as_bytes(), &kdf, &secret).map_err(|e| e.code())?;
        let dek = crypto::random_key();
        let wrapped_dek = crypto::wrap_key(&kek, &dek, AAD_DEK_V2).map_err(|e| e.code())?;
        let file = VaultFile { version: V2, kdf, wrapped_dek, items: Vec::new() };
        state.persist(&file)?;
        let mut g = state.guard()?;
        g.unlocked = Some(Unlocked { dek, file });
        g.last_activity = Instant::now();
        Ok(crypto::encode_recovery(&secret).to_string())
    })
    .await
}

/// Parolayı (ve gerekirse kurtarma anahtarını) doğrulayıp DEK'i çözer; hatalı denemeleri sayar.
fn verify(state: &VaultState, file: &VaultFile, password: &str, recovery: Option<&str>) -> CmdResult<(Key, Option<Key>)> {
    {
        let g = state.guard()?;
        let now = unix_now();
        if g.throttle.retry_after_unix > now {
            return Err(format!("err.vault.throttled::{}", g.throttle.retry_after_unix - now));
        }
    }
    let (kek, aad, recovered) = match file.version {
        V1 => (crypto::derive_kek(password.as_bytes(), &file.kdf).map_err(|e| e.code())?, AAD_DEK, None),
        V2 => {
            let (secret, recovered) = match keychain::load(SECRET_ACCOUNT)? {
                Some(k) => (k, None),
                None => {
                    let text = recovery.filter(|r| !r.trim().is_empty()).ok_or("err.vault.need_recovery")?;
                    let k = crypto::decode_recovery(text).map_err(|_| "err.vault.bad_recovery".to_string())?;
                    (Zeroizing::new(*k), Some(k))
                }
            };
            (crypto::derive_kek_v2(password.as_bytes(), &file.kdf, &secret).map_err(|e| e.code())?, AAD_DEK_V2, recovered)
        }
        v => return Err(format!("err.vault.version::{v}")),
    };
    match crypto::unwrap_key(&kek, &file.wrapped_dek, aad) {
        Ok(dek) => {
            let mut g = state.guard()?;
            g.throttle = Throttle::default();
            state.save_throttle(&g.throttle);
            Ok((dek, recovered))
        }
        Err(_) => {
            // 3 hatadan sonra üstel bekleme: 2, 4, 8 … en fazla 300 sn. Diske yazılır.
            let mut g = state.guard()?;
            g.throttle.failed += 1;
            if g.throttle.failed >= 3 {
                let secs = 2u64.saturating_pow(g.throttle.failed - 2).min(300);
                g.throttle.retry_after_unix = unix_now() + secs;
            }
            state.save_throttle(&g.throttle);
            Err("err.vault.wrong_password".into())
        }
    }
}

/// Kasa kilidini açar. v2 kasada bu cihazda gizli anahtar yoksa `recovery` gerekir ve başarılı açılışta
/// anahtar işletim sistemi kasasına kaydedilir. Eski v1 kasa açıldığında aynı DEK ile v2'ye yükseltilir
/// (256 MiB Argon2id + cihaz gizli anahtarı) ve gösterilmesi gereken kurtarma anahtarı döner.
#[tauri::command]
pub async fn vault_unlock(app: AppHandle, password: String, recovery: Option<String>) -> CmdResult<Option<String>> {
    let password = Zeroizing::new(password);
    let recovery = recovery.map(Zeroizing::new);
    blocking(app, move |state| {
        let mut file = read_file(state)?;
        let (dek, recovered) = verify(state, &file, &password, recovery.as_deref().map(|s| s.as_str()))?;
        if let Some(k) = recovered {
            keychain::store(SECRET_ACCOUNT, &k)?;
        }
        let mut migrated = None;
        if file.version == V1 {
            check_password_strength(&password).ok();
            let secret = get_or_create_secret()?;
            let kdf = KdfParams::new_strong();
            let kek = crypto::derive_kek_v2(password.as_bytes(), &kdf, &secret).map_err(|e| e.code())?;
            file.wrapped_dek = crypto::wrap_key(&kek, &dek, AAD_DEK_V2).map_err(|e| e.code())?;
            file.kdf = kdf;
            file.version = V2;
            state.persist(&file)?;
            migrated = Some(crypto::encode_recovery(&secret).to_string());
        }
        let mut g = state.guard()?;
        g.unlocked = Some(Unlocked { dek, file });
        g.last_activity = Instant::now();
        Ok(migrated)
    })
    .await
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

/// Kasa açıkken bu cihazın kurtarma anahtarını gösterir; ana parola yeniden doğrulanır.
#[tauri::command]
pub async fn vault_recovery_key(app: AppHandle, password: String) -> CmdResult<String> {
    let password = Zeroizing::new(password);
    blocking(app, move |state| {
        if !state.is_unlocked() {
            return Err(LOCKED.into());
        }
        let file = read_file(state)?;
        if file.version != V2 {
            return Err("err.vault.version::1".into());
        }
        verify(state, &file, &password, None)?;
        let k = keychain::load(SECRET_ACCOUNT)?.ok_or("err.vault.need_recovery")?;
        Ok(crypto::encode_recovery(&k).to_string())
    })
    .await
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
                has_notes: p.notes.as_deref().is_some_and(|n| !n.is_empty()),
                tags: p.tags.clone(),
                updated_at: item.updated_at,
            });
        }
        out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(out)
    })
}

#[tauri::command]
pub fn vault_item_notes(state: State<'_, VaultState>, id: String) -> CmdResult<Option<String>> {
    with_unlocked(&state, |u| {
        let item = u.file.items.iter().find(|i| i.id == id).ok_or("err.vault.item_not_found")?;
        Ok(decrypt_item(&u.dek, item)?.notes.clone())
    })
}

#[tauri::command]
pub fn vault_upsert(state: State<'_, VaultState>, input: ItemInput) -> CmdResult<String> {
    if input.title.trim().is_empty() {
        return Err("err.vault.title_empty".into());
    }
    if input.title.len() > 500 || input.secret.as_ref().is_some_and(|s| s.len() > 1 << 20) || input.notes.as_ref().is_some_and(|s| s.len() > 1 << 20) {
        return Err("err.board.too_large".into());
    }
    let id = with_unlocked(&state, |u| {
        let id = input.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let existing = u.file.items.iter().position(|i| i.id == id);
        let old = match existing {
            Some(idx) => Some(decrypt_item(&u.dek, &u.file.items[idx])?),
            None => None,
        };
        let secret = match (&input.secret, &old) {
            (Some(s), _) => s.clone(),
            (None, Some(o)) => o.secret.clone(),
            (None, None) => String::new(),
        };
        let notes = match (&input.notes, &old) {
            (Some(n), _) => Some(n.clone()).filter(|s| !s.is_empty()),
            (None, Some(o)) => o.notes.clone(),
            (None, None) => None,
        };
        let payload = ItemPayload {
            kind: input.kind,
            title: input.title.trim().to_string(),
            username: input.username.clone().filter(|s| !s.is_empty()),
            host: input.host.clone().filter(|s| !s.is_empty()),
            secret,
            notes,
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

/// Gizli değeri güvenli panoya kopyalar (geçmiş/bulut/Universal Clipboard dışı) ve 30 sn sonra,
/// pano bu arada değişmediyse temizler. Pano içeriği hiçbir zaman okunmaz.
#[tauri::command]
pub fn vault_copy(app: AppHandle, state: State<'_, VaultState>, id: String) -> CmdResult<u64> {
    let secret = Zeroizing::new(vault_reveal(state, id)?);
    secure_clipboard::write_with_expiry(app, &secret, CLIPBOARD_CLEAR_AFTER)?;
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

/// Şifreli kasa dosyasını İndirilenler klasörüne 0600 izinle kopyalar. Açmak için ana parola ve
/// (v2) kurtarma anahtarı gerekir.
#[tauri::command]
pub fn vault_export_backup(app: AppHandle, state: State<'_, VaultState>) -> CmdResult<String> {
    let bytes = fs::read(&state.path).map_err(|_| "err.vault.no_file".to_string())?;
    let dir = app.path().download_dir().map_err(|e| format!("err.export.write::{e}"))?;
    let target = secure_fs::unique_path(&dir, &format!("kanvault-vault-{}.dgv", unix_now()));
    secure_fs::write_new_private(&target, &bytes).map_err(|e| format!("err.export.write::{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::check_password_strength;

    #[test]
    fn password_policy() {
        assert!(check_password_strength("short1A!").is_err());
        assert!(check_password_strength("aaaaaaaaaaaaaaaa").is_err());
        assert!(check_password_strength("Password1234!x").is_err());
        assert!(check_password_strength("Tr0ub4dor&3-horse").is_ok());
        assert!(check_password_strength("correct horse battery staple").is_ok());
    }
}
