//! Gizli değerler için güvenli pano.
//!
//! - macOS: `NSPasteboardContentsCurrentHostOnly` ile Universal Clipboard'a (iPhone/iPad) aktarılmaz;
//!   `org.nspasteboard.ConcealedType` / `TransientType` ile pano geçmişi uygulamalarına (Raycast, Paste…)
//!   kaydedilmez. Temizleme kararı pano içeriği okunarak değil `changeCount` ile verilir
//!   (yeni macOS sürümlerindeki pano erişim uyarısını tetiklemez).
//! - Windows: pano geçmişi (Win+V), bulut panosu ve pano izleyicileri dışında tutulur;
//!   temizleme kararı `GetClipboardSequenceNumber` ile verilir.
//! - Diğer: arboard ile geçmiş dışı yazım.

/// Yazım anındaki pano sürümü; yalnızca değişmemişse temizlenir.
pub type ClipToken = i64;

#[cfg(target_os = "macos")]
mod imp {
    use super::ClipToken;
    use objc2_app_kit::{NSPasteboard, NSPasteboardContentsOptions, NSPasteboardTypeString};
    use objc2_foundation::NSString;

    pub fn write(text: &str) -> Result<ClipToken, String> {
        let pb = NSPasteboard::generalPasteboard();
        pb.prepareForNewContentsWithOptions(NSPasteboardContentsOptions::CurrentHostOnly);
        let value = NSString::from_str(text);
        let ok = pb.setString_forType(&value, unsafe { NSPasteboardTypeString });
        let empty = NSString::from_str("");
        pb.setString_forType(&empty, &NSString::from_str("org.nspasteboard.ConcealedType"));
        pb.setString_forType(&empty, &NSString::from_str("org.nspasteboard.TransientType"));
        if !ok {
            return Err("err.clipboard".into());
        }
        Ok(pb.changeCount() as ClipToken)
    }

    pub fn clear_if_unchanged(token: ClipToken) -> bool {
        let pb = NSPasteboard::generalPasteboard();
        if pb.changeCount() as ClipToken == token {
            pb.clearContents();
            return true;
        }
        false
    }
}

#[cfg(windows)]
mod imp {
    use super::ClipToken;
    use arboard::{Clipboard, SetExtWindows};

    fn seq() -> ClipToken {
        clipboard_win::raw::seq_num().map(|n| n.get() as ClipToken).unwrap_or(0)
    }

    pub fn write(text: &str) -> Result<ClipToken, String> {
        let mut c = Clipboard::new().map_err(|_| "err.clipboard".to_string())?;
        c.set()
            .exclude_from_history()
            .exclude_from_cloud()
            .exclude_from_monitoring()
            .text(text.to_owned())
            .map_err(|_| "err.clipboard".to_string())?;
        Ok(seq())
    }

    pub fn clear_if_unchanged(token: ClipToken) -> bool {
        if seq() == token {
            if let Ok(mut c) = Clipboard::new() {
                return c.clear().is_ok();
            }
        }
        false
    }
}

#[cfg(not(any(target_os = "macos", windows)))]
mod imp {
    use super::ClipToken;
    use arboard::{Clipboard, SetExtLinux};
    use std::sync::atomic::{AtomicI64, Ordering};

    static GEN: AtomicI64 = AtomicI64::new(0);

    pub fn write(text: &str) -> Result<ClipToken, String> {
        let mut c = Clipboard::new().map_err(|_| "err.clipboard".to_string())?;
        c.set().exclude_from_history().text(text.to_owned()).map_err(|_| "err.clipboard".to_string())?;
        Ok(GEN.fetch_add(1, Ordering::SeqCst) + 1)
    }

    pub fn clear_if_unchanged(token: ClipToken) -> bool {
        if GEN.load(Ordering::SeqCst) == token {
            if let Ok(mut c) = Clipboard::new() {
                return c.clear().is_ok();
            }
        }
        false
    }
}

pub use imp::{clear_if_unchanged, write};

/// Değeri güvenli panoya yazar ve `after` süre sonra, pano bu arada değişmediyse temizler.
pub fn write_with_expiry(app: tauri::AppHandle, text: &str, after: std::time::Duration) -> Result<(), String> {
    use tauri::Emitter;
    let token = write(text)?;
    std::thread::spawn(move || {
        std::thread::sleep(after);
        if clear_if_unchanged(token) {
            let _ = app.emit("clipboard-cleared", ());
        }
    });
    Ok(())
}
