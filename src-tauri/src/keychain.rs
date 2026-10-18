//! İşletim sistemi güvenli kasası (macOS Anahtar Zinciri / Windows Kimlik Bilgisi Yöneticisi)
//! üzerinden 32 baytlık anahtar saklama. Anahtarlar base64 olarak yazılır, okunduktan sonra
//! bellekte `Zeroizing` ile tutulur.

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use zeroize::Zeroizing;

use crate::crypto::{Key, KEY_LEN};

pub const SERVICE: &str = "com.dagcan.istakip";

fn entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, account).map_err(|e| format!("err.board.keychain::{e}"))
}

/// Anahtarı okur; kayıt yoksa `Ok(None)`.
pub fn load(account: &str) -> Result<Option<Key>, String> {
    match entry(account)?.get_password() {
        Ok(encoded) => {
            let encoded = Zeroizing::new(encoded);
            let raw = Zeroizing::new(B64.decode(encoded.as_bytes()).map_err(|e| format!("err.board.keychain::{e}"))?);
            if raw.len() != KEY_LEN {
                return Err("err.board.keychain::bad key length".into());
            }
            let mut k: Key = Zeroizing::new([0u8; KEY_LEN]);
            k.copy_from_slice(&raw);
            Ok(Some(k))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("err.board.keychain::{e}")),
    }
}

pub fn store(account: &str, key: &Key) -> Result<(), String> {
    let encoded = Zeroizing::new(B64.encode(key.as_ref()));
    entry(account)?.set_password(&encoded).map_err(|e| format!("err.board.keychain::{e}"))
}
