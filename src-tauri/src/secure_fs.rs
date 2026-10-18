//! Hassas dosyalar için güvenli yazım: geçici dosyaya yaz, yalnızca sahibine okuma/yazma izni ver
//! (Unix 0600), diske zorla, sonra atomik olarak yerine taşı. Yarım kalan yazım veriyi bozmaz,
//! aynı makinedeki diğer kullanıcılar dosyayı okuyamaz.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

pub fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let tmp = path.with_extension("tmp");
    {
        let mut opts = OpenOptions::new();
        opts.write(true).create(true).truncate(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
        }
        let mut f = opts.open(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    restrict(path)
}

/// Var olan bir dosyanın izinlerini yalnızca sahibine daraltır (eski sürümlerden kalan dosyalar için).
pub fn restrict(path: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if path.exists() {
            fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
        }
    }
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}

/// Var olan bir dosyanın üzerine yazmadan yeni bir dosya oluşturur (0600, sembolik bağ izlenmez).
pub fn write_new_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut opts = OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    let mut f = opts.open(path)?;
    f.write_all(bytes)?;
    f.sync_all()
}

/// `dir/name` mevcutsa `name-1.ext`, `name-2.ext` … biçiminde boş bir ad bulur.
pub fn unique_path(dir: &Path, name: &str) -> std::path::PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let p = Path::new(name);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = p.extension().and_then(|s| s.to_str()).map(|e| format!(".{e}")).unwrap_or_default();
    for i in 1..1000 {
        let c = dir.join(format!("{stem}-{i}{ext}"));
        if !c.exists() {
            return c;
        }
    }
    dir.join(format!("{stem}-{}{ext}", std::process::id()))
}
