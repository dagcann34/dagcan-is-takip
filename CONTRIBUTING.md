# Contributing / Katkıda Bulunma

## 🇬🇧 English

1. Fork the repo and create a branch: `git checkout -b feature/my-change`.
2. `npm install`, then `npm run tauri dev` to run the app.
3. Before opening a PR run `npm run build` and `cd src-tauri && cargo test`.
4. **Every UI string goes into both dictionaries** in `src/i18n/dictionaries.ts` (`tr` and `en`). TypeScript fails the build if a key is missing in English.
5. Rust commands return error codes (`err.something::detail`), never user-facing text — add the code to both dictionaries.
6. Never log, print or send vault contents. Crypto changes need tests in `crypto.rs`.
7. Add a line to `CHANGELOG.md` in both languages.

## 🇹🇷 Türkçe

1. Depoyu fork'la ve dal oluştur: `git checkout -b feature/degisikligim`.
2. `npm install`, ardından uygulamayı çalıştırmak için `npm run tauri dev`.
3. PR açmadan önce `npm run build` ve `cd src-tauri && cargo test` çalıştır.
4. **Her arayüz metni iki sözlüğe de eklenir**: `src/i18n/dictionaries.ts` içindeki `tr` ve `en`. İngilizcede eksik anahtar varsa TypeScript derlemesi başarısız olur.
5. Rust komutları kullanıcıya metin değil hata kodu (`err.bir_sey::ayrinti`) döndürür; kodu iki sözlüğe de ekle.
6. Kasa içeriğini asla loglama, yazdırma veya gönderme. Kripto değişiklikleri `crypto.rs` içinde test gerektirir.
7. `CHANGELOG.md` dosyasına iki dilde bir satır ekle.
