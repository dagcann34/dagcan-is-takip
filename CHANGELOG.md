# Changelog / Sürüm Notları

All notable changes to this project are documented here in English and Turkish.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

Bu projedeki tüm önemli değişiklikler burada İngilizce ve Türkçe olarak belgelenir.

---

## [0.2.0] — 2026-10-18

### 🇬🇧 English

**Added**
- Full bilingual interface (English / Turkish) including tray menu, notifications and Rust error messages; language follows the system on first launch and can be switched in Settings or the command palette.
- **Overview** dashboard with KPIs (open, overdue, due this week, done in 7 days, blocked, tracked time), status distribution and upcoming deadlines.
- **Command palette** (`⌘K` / `Ctrl+K`) to navigate, search and open tasks, create tasks, lock the vault and switch language.
- Task **checklists** with progress bar and per-task **time tracking**.
- Vault **password generator** (unbiased CSPRNG, 24 characters).
- AI Studio modes: **Change Request (RFC/CAB)** and **Post-Incident Report** (blameless, 5 Whys).
- **Settings**: board JSON export/import, encrypted vault backup, shortcuts, version and license info.
- Open-source project files: MIT license, contributing guide, security policy, issue templates and a GitHub Actions workflow that builds macOS and Windows installers.

**Changed**
- Rust commands now return language-neutral error codes translated by the UI.
- AI responses report truncation as a flag instead of embedding text.
- Smaller development builds (no debug symbols) to save disk space.
- React Flow attribution is shown as required by its MIT terms.

### 🇹🇷 Türkçe

**Eklenenler**
- Tepsi menüsü, bildirimler ve Rust hata mesajları dahil tam çift dilli arayüz (Türkçe / İngilizce); ilk açılışta sistem dilini izler, Ayarlar'dan veya komut paletinden değiştirilebilir.
- Göstergeli **Genel Bakış** paneli (açık, gecikmiş, bu hafta teslim, 7 günde biten, engellenen, takip edilen süre), durum dağılımı ve yaklaşan teslimler.
- Görünümler arası geçiş, görev arama/açma, görev oluşturma, kasayı kilitleme ve dil değiştirme için **komut paleti** (`⌘K` / `Ctrl+K`).
- İlerleme çubuklu görev **kontrol listeleri** ve görev başına **süre takibi**.
- Kasa için **parola üretici** (sapmasız kriptografik rastgele, 24 karakter).
- AI Stüdyo'ya yeni modlar: **Değişiklik Talebi (RFC/CAB)** ve **Olay Sonrası Rapor** (suçlamasız, 5 Neden).
- **Ayarlar**: pano JSON dışa/içe aktarma, şifreli kasa yedeği, kısayollar, sürüm ve lisans bilgisi.
- Açık kaynak proje dosyaları: MIT lisansı, katkı rehberi, güvenlik politikası, hata şablonları ve macOS/Windows kurulum dosyalarını derleyen GitHub Actions iş akışı.

**Değişenler**
- Rust komutları artık arayüzün çevirdiği dil bağımsız hata kodları döndürür.
- AI yanıtındaki kesilme durumu metne gömülmek yerine ayrı bir bayrakla bildirilir.
- Disk alanı için daha küçük geliştirme derlemeleri (debug sembolleri kapalı).
- React Flow atfı, MIT lisans koşulları gereği görünür hale getirildi.

---

## [0.1.0] — 2026-10-18

### 🇬🇧 English

**Added**
- Tauri v2 + React desktop app for Windows and macOS with Jira/ITSM-inspired dark glass design system and logo.
- Kanban whiteboard (React Flow) with drag-and-drop lanes, dependency arrows, priorities and due-date badges.
- Board export to PNG (2×), SVG and PDF; single-card image sharing.
- Zero-knowledge vault: Argon2id + AES-256-GCM envelope encryption in Rust, auto-lock, 30-second clipboard clearing.
- AI Studio: executive summary email and STAR-method CV/LinkedIn converter via the Claude API, with local redaction.
- System tray / menu bar, global Quick Task shortcut, native due-date notifications.

### 🇹🇷 Türkçe

**Eklenenler**
- Jira/ITSM esintili koyu cam tasarım sistemi ve logoyla Windows ve macOS için Tauri v2 + React masaüstü uygulaması.
- Sürükle-bırak şeritli, bağımlılık oklu, öncelik ve son tarih rozetli Kanban beyaz tahta (React Flow).
- Panoyu PNG (2×), SVG ve PDF olarak dışa aktarma; tek kartı görsel olarak paylaşma.
- Sıfır bilgi kasa: Rust'ta Argon2id + AES-256-GCM zarf şifreleme, otomatik kilit, 30 saniyelik pano temizleme.
- AI Stüdyo: Claude API ile yönetici özeti e-postası ve STAR yöntemli CV/LinkedIn dönüştürücü, yerel maskeleme.
- Sistem tepsisi / menü çubuğu, global Hızlı Görev kısayolu, son tarih için yerel bildirimler.

[0.2.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.2.0
[0.1.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.1.0
