//! Sıfır bilgi (zero-knowledge) kriptografi çekirdeği.
//!
//! - Anahtar türetme: Argon2id (RFC 9106), varsayılan m=64 MiB, t=3, p=4.
//! - Şifreleme: AES-256-GCM, her kayıt için rastgele 96-bit nonce, kayıt kimliği AAD olarak bağlı.
//! - Zarf şifreleme: Ana paroladan türetilen KEK yalnızca rastgele DEK'i sarar. Parola değişince
//!   tüm kasa yeniden şifrelenmez; senkronize edilen dosyada parola veya anahtar asla bulunmaz.
//! - Bellekteki tüm anahtarlar `Zeroizing` ile düşürülürken sıfırlanır.

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

pub const KEY_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const SALT_LEN: usize = 16;

pub type Key = Zeroizing<[u8; KEY_LEN]>;

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("key derivation failed: {0}")]
    Kdf(String),
    #[error("encryption failed")]
    Encrypt,
    #[error("decryption failed (wrong password or tampered data)")]
    Decrypt,
    #[error("invalid encoding: {0}")]
    Encoding(String),
}

impl CryptoError {
    /// Arayüzün çevirdiği dil bağımsız hata kodu.
    pub fn code(&self) -> String {
        match self {
            CryptoError::Kdf(d) => format!("err.crypto.kdf::{d}"),
            CryptoError::Encrypt => "err.crypto.encrypt".into(),
            CryptoError::Decrypt => "err.crypto.decrypt".into(),
            CryptoError::Encoding(d) => format!("err.crypto.encoding::{d}"),
        }
    }
}

/// Argon2id parametreleri dosya başlığında açık saklanır (gizli değildir); tuz cihazlar arasında aynıdır.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KdfParams {
    pub algorithm: String,
    pub m_cost_kib: u32,
    pub t_cost: u32,
    pub p_cost: u32,
    pub salt: String,
}

impl KdfParams {
    pub fn new_random() -> Self {
        let mut salt = [0u8; SALT_LEN];
        OsRng.fill_bytes(&mut salt);
        Self {
            algorithm: "argon2id-v19".into(),
            m_cost_kib: 64 * 1024,
            t_cost: 3,
            p_cost: 4,
            salt: B64.encode(salt),
        }
    }
}

/// Şifreli paket: nonce + şifreli metin (GCM etiketi sonda).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sealed {
    pub nonce: String,
    pub ct: String,
}

pub fn derive_kek(password: &[u8], p: &KdfParams) -> Result<Key, CryptoError> {
    if p.algorithm != "argon2id-v19" {
        return Err(CryptoError::Kdf(format!("desteklenmeyen algoritma {}", p.algorithm)));
    }
    // Dosyadan gelen parametreler sınırlandırılır: aşırı bellek isteğiyle hizmet dışı bırakma engellenir.
    if !(19 * 1024..=1024 * 1024).contains(&p.m_cost_kib) || !(2..=10).contains(&p.t_cost) || !(1..=16).contains(&p.p_cost) {
        return Err(CryptoError::Kdf("params out of range".into()));
    }
    let params = Params::new(p.m_cost_kib, p.t_cost, p.p_cost, Some(KEY_LEN))
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    let salt = B64
        .decode(&p.salt)
        .map_err(|e| CryptoError::Encoding(e.to_string()))?;
    if salt.len() != SALT_LEN {
        return Err(CryptoError::Kdf("bad salt length".into()));
    }
    let mut out: Key = Zeroizing::new([0u8; KEY_LEN]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(password, &salt, out.as_mut())
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    Ok(out)
}

impl KdfParams {
    /// Yeni (v2) kasalar için güçlendirilmiş parametreler: 256 MiB, 3 geçiş.
    pub fn new_strong() -> Self {
        Self { m_cost_kib: 256 * 1024, ..Self::new_random() }
    }
}

/// v2 anahtar türetme: KEK = HKDF-SHA256(salt, Argon2id(parola) ‖ cihaz gizli anahtarı).
/// Kasa dosyası ve parola birlikte ele geçirilse bile, cihazdaki gizli anahtar (veya kullanıcının
/// sakladığı kurtarma anahtarı) olmadan KEK hesaplanamaz.
pub fn derive_kek_v2(password: &[u8], p: &KdfParams, secret_key: &Key) -> Result<Key, CryptoError> {
    use hkdf::Hkdf;
    use sha2::Sha256;
    let stretched = derive_kek(password, p)?;
    let mut ikm = Zeroizing::new([0u8; KEY_LEN * 2]);
    ikm[..KEY_LEN].copy_from_slice(stretched.as_ref());
    ikm[KEY_LEN..].copy_from_slice(secret_key.as_ref());
    let salt = B64.decode(&p.salt).map_err(|e| CryptoError::Encoding(e.to_string()))?;
    let hk = Hkdf::<Sha256>::new(Some(&salt), ikm.as_ref());
    let mut out: Key = Zeroizing::new([0u8; KEY_LEN]);
    hk.expand(b"kanvault-vault/v2/kek", out.as_mut()).map_err(|_| CryptoError::Kdf("hkdf".into()))?;
    Ok(out)
}

const B32: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// Kurtarma anahtarı biçimi: "KV2-XXXX-XXXX-…" (karışması kolay I/O/0/1 harfleri yok).
pub fn encode_recovery(key: &Key) -> Zeroizing<String> {
    let mut bits: u32 = 0;
    let mut n = 0;
    let mut chars = Zeroizing::new(String::new());
    for &b in key.iter() {
        bits = (bits << 8) | b as u32;
        n += 8;
        while n >= 5 {
            n -= 5;
            chars.push(B32[((bits >> n) & 31) as usize] as char);
        }
    }
    if n > 0 {
        chars.push(B32[((bits << (5 - n)) & 31) as usize] as char);
    }
    let mut out = Zeroizing::new(String::from("KV2"));
    for (i, c) in chars.chars().enumerate() {
        if i % 4 == 0 {
            out.push('-');
        }
        out.push(c);
    }
    out
}

pub fn decode_recovery(text: &str) -> Result<Key, CryptoError> {
    let cleaned: Zeroizing<String> = Zeroizing::new(
        text.trim().to_uppercase().trim_start_matches("KV2").chars().filter(|c| c.is_ascii_alphanumeric()).collect(),
    );
    let mut bits: u32 = 0;
    let mut n = 0;
    let mut out = Zeroizing::new(Vec::with_capacity(KEY_LEN));
    for c in cleaned.bytes() {
        let v = B32.iter().position(|&x| x == c).ok_or_else(|| CryptoError::Encoding("recovery".into()))? as u32;
        bits = (bits << 5) | v;
        n += 5;
        if n >= 8 {
            n -= 8;
            out.push(((bits >> n) & 0xff) as u8);
        }
    }
    if out.len() < KEY_LEN {
        return Err(CryptoError::Encoding("recovery".into()));
    }
    let mut k: Key = Zeroizing::new([0u8; KEY_LEN]);
    k.copy_from_slice(&out[..KEY_LEN]);
    Ok(k)
}

pub fn random_key() -> Key {
    let mut k: Key = Zeroizing::new([0u8; KEY_LEN]);
    OsRng.fill_bytes(k.as_mut());
    k
}

pub fn seal(key: &Key, plaintext: &[u8], aad: &[u8]) -> Result<Sealed, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key.as_ref()).map_err(|_| CryptoError::Encrypt)?;
    let mut nonce = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);
    let ct = cipher
        .encrypt(Nonce::from_slice(&nonce), Payload { msg: plaintext, aad })
        .map_err(|_| CryptoError::Encrypt)?;
    Ok(Sealed {
        nonce: B64.encode(nonce),
        ct: B64.encode(ct),
    })
}

pub fn open(key: &Key, sealed: &Sealed, aad: &[u8]) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key.as_ref()).map_err(|_| CryptoError::Decrypt)?;
    let nonce = B64
        .decode(&sealed.nonce)
        .map_err(|e| CryptoError::Encoding(e.to_string()))?;
    if nonce.len() != NONCE_LEN {
        return Err(CryptoError::Encoding("bad nonce length".into()));
    }
    let ct = B64
        .decode(&sealed.ct)
        .map_err(|e| CryptoError::Encoding(e.to_string()))?;
    let pt = cipher
        .decrypt(Nonce::from_slice(&nonce), Payload { msg: &ct, aad })
        .map_err(|_| CryptoError::Decrypt)?;
    Ok(Zeroizing::new(pt))
}

/// DEK'i KEK ile sarar.
pub fn wrap_key(kek: &Key, dek: &Key, aad: &[u8]) -> Result<Sealed, CryptoError> {
    seal(kek, dek.as_ref(), aad)
}

/// Sarılı DEK'i açar. Yanlış parola burada GCM doğrulama hatasıyla yakalanır.
pub fn unwrap_key(kek: &Key, wrapped: &Sealed, aad: &[u8]) -> Result<Key, CryptoError> {
    let raw = open(kek, wrapped, aad)?;
    if raw.len() != KEY_LEN {
        return Err(CryptoError::Decrypt);
    }
    let mut k: Key = Zeroizing::new([0u8; KEY_LEN]);
    k.copy_from_slice(&raw);
    Ok(k)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fast_params() -> KdfParams {
        KdfParams { m_cost_kib: 19 * 1024, t_cost: 2, p_cost: 1, ..KdfParams::new_random() }
    }

    #[test]
    fn roundtrip() {
        let key = random_key();
        let s = seal(&key, b"Get-ADUser -Filter *", b"item/1").unwrap();
        assert_eq!(&open(&key, &s, b"item/1").unwrap()[..], b"Get-ADUser -Filter *");
    }

    #[test]
    fn aad_is_bound() {
        let key = random_key();
        let s = seal(&key, b"secret", b"item/1").unwrap();
        assert!(open(&key, &s, b"item/2").is_err());
    }

    #[test]
    fn kdf_params_are_bounded() {
        let mut p = fast_params();
        p.m_cost_kib = 4 * 1024 * 1024; // 4 GiB
        assert!(derive_kek(b"x", &p).is_err());
        let mut p = fast_params();
        p.salt = B64.encode([0u8; 4]);
        assert!(derive_kek(b"x", &p).is_err());
    }

    #[test]
    fn recovery_roundtrip() {
        let k = random_key();
        let text = encode_recovery(&k);
        assert!(text.starts_with("KV2-"));
        let back = decode_recovery(&text.to_lowercase().replace('-', " ")).unwrap();
        assert_eq!(back.as_ref(), k.as_ref());
    }

    #[test]
    fn v2_needs_secret_key() {
        let p = fast_params();
        let s1 = random_key();
        let s2 = random_key();
        let dek = random_key();
        let wrapped = wrap_key(&derive_kek_v2(b"weak-password-1", &p, &s1).unwrap(), &dek, b"dek").unwrap();
        // Doğru parola ama farklı cihaz anahtarı: açılmaz.
        assert!(unwrap_key(&derive_kek_v2(b"weak-password-1", &p, &s2).unwrap(), &wrapped, b"dek").is_err());
        assert!(unwrap_key(&derive_kek_v2(b"weak-password-1", &p, &s1).unwrap(), &wrapped, b"dek").is_ok());
    }

    #[test]
    fn wrong_password_fails() {
        let p = fast_params();
        let dek = random_key();
        let wrapped = wrap_key(&derive_kek(b"dogru-parola-123", &p).unwrap(), &dek, b"dek").unwrap();
        assert!(unwrap_key(&derive_kek(b"yanlis-parola-123", &p).unwrap(), &wrapped, b"dek").is_err());
        let ok = unwrap_key(&derive_kek(b"dogru-parola-123", &p).unwrap(), &wrapped, b"dek").unwrap();
        assert_eq!(ok.as_ref(), dek.as_ref());
    }
}
