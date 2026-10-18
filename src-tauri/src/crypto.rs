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
    let params = Params::new(p.m_cost_kib, p.t_cost, p.p_cost, Some(KEY_LEN))
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    let salt = B64
        .decode(&p.salt)
        .map_err(|e| CryptoError::Encoding(e.to_string()))?;
    let mut out: Key = Zeroizing::new([0u8; KEY_LEN]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(password, &salt, out.as_mut())
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    Ok(out)
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
        KdfParams { m_cost_kib: 8 * 1024, t_cost: 1, p_cost: 1, ..KdfParams::new_random() }
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
    fn wrong_password_fails() {
        let p = fast_params();
        let dek = random_key();
        let wrapped = wrap_key(&derive_kek(b"dogru-parola-123", &p).unwrap(), &dek, b"dek").unwrap();
        assert!(unwrap_key(&derive_kek(b"yanlis-parola-123", &p).unwrap(), &wrapped, b"dek").is_err());
        let ok = unwrap_key(&derive_kek(b"dogru-parola-123", &p).unwrap(), &wrapped, b"dek").unwrap();
        assert_eq!(ok.as_ref(), dek.as_ref());
    }
}
