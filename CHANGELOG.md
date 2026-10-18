# Changelog / Sürüm Notları

All notable changes to this project are documented here in English and Turkish.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

Bu projedeki tüm önemli değişiklikler burada İngilizce ve Türkçe olarak belgelenir.

---

## [0.5.0] — 2026-10-18

### 🇬🇧 English

**Changed**
- **New "Neon Grid" cyberpunk design**: night-black surfaces, neon cyan / magenta / signal-yellow accents, notched HUD panels, subtle grid and scanline texture, Rajdhani display type and JetBrains Mono for data. Contrast is tuned for readability.
- **Fixed Kanban board**: the free-form canvas is replaced by four columns that always fit the available space. Cards can no longer be dragged; move them with the ◀ ▶ buttons on hover, `Alt + ←/→`, or the status field. Each column scrolls on its own; cards are sorted by priority, then due date.
- **Responsive layout**: on narrower windows the year calendar and the task editor open as slide-over drawers so the board keeps its full width.
- Dependencies are now set in the task editor ("Must finish first") and shown on cards as "Waiting on …".
- Board export captures every card, including those scrolled out of view.

**Removed**
- The React Flow canvas dependency (smaller app).

### 🇹🇷 Türkçe

**Değişenler**
- **Yeni "Neon Grid" cyberpunk tasarım**: gece siyahı yüzeyler; neon cyan, magenta ve sinyal sarısı vurgular; kesik köşeli HUD panelleri; hafif ızgara ve tarama çizgisi dokusu. Başlıklarda Rajdhani, veride JetBrains Mono kullanılır. Kontrast okunabilirlik için ayarlandı.
- **Sabit Kanban pano**: serbest tuval yerine her zaman mevcut alana tam oturan dört sütun var. Kartlar artık sürüklenemez; üzerine gelince çıkan ◀ ▶ düğmeleri, `Alt + ←/→` veya durum alanıyla taşınır. Her sütun kendi içinde kayar; kartlar önceliğe, sonra teslim tarihine göre sıralanır.
- **Duyarlı yerleşim**: dar pencerelerde yıllık takvim ve görev düzenleyici kayan çekmece olarak açılır, pano tam genişliğini korur.
- Bağımlılıklar artık görev düzenleyicide ("Önce bitmesi gereken işler") belirlenir ve kartlarda "… bekleniyor" olarak görünür.
- Pano dışa aktarımı, kaydırılmış olanlar dahil tüm kartları yakalar.

**Kaldırılanlar**
- React Flow tuval bağımlılığı (daha küçük uygulama).

---

## [0.4.0] — 2026-10-18

### 🇬🇧 English

**Added**
- **Recurring tasks** (daily, weekly, monthly, quarterly, yearly): completing one automatically creates the next occurrence with its checklist reset and the due date moved forward (month-end safe).
- **Task templates** for common IT work: monthly patching, SSL/TLS certificate renewal, backup restore test, onboarding, offboarding and quarterly access review — each with a ready checklist.
- **Board filter**: search by key, title, description, assignee or outcome and filter by priority; non-matching cards fade but stay in place.
- **Calendar export (.ics)**: due dates of open tasks as all-day events with reminders and repeat rules, for Apple Calendar, Outlook or Google Calendar.
- **Launch at login** option in Settings; when started this way the app opens quietly in the menu bar / tray.
- Board data is now also saved to `board.json` in the app data folder (existing data is migrated automatically), so it survives web-view cache clears.

### 🇹🇷 Türkçe

**Eklenenler**
- **Tekrarlayan görevler** (günlük, haftalık, aylık, çeyreklik, yıllık): tamamlanınca bir sonraki kopya kontrol listesi sıfırlanmış ve teslim tarihi ileri alınmış olarak otomatik oluşur (ay sonu güvenli).
- Sık yapılan BT işleri için **görev şablonları**: aylık yama, SSL/TLS sertifika yenileme, yedek geri yükleme testi, yeni çalışan hesabı, ayrılan çalışan hesabı kapatma ve çeyreklik yetki gözden geçirme; her biri hazır kontrol listesiyle.
- **Pano filtresi**: anahtar, başlık, açıklama, atanan kişi veya sonuca göre arama ve öncelik filtresi; eşleşmeyen kartlar soluklaşır ama yerinde kalır.
- **Takvime aktarma (.ics)**: açık görevlerin teslim tarihleri hatırlatıcılı ve tekrar kurallı tüm gün etkinlikleri olarak; Apple Takvim, Outlook veya Google Takvim için.
- Ayarlar'da **oturum açınca otomatik başlat** seçeneği; bu şekilde açılınca uygulama menü çubuğunda/tepside sessizce başlar.
- Pano verisi artık uygulama klasöründeki `board.json` dosyasına da kaydedilir (mevcut veri otomatik taşınır); böylece arayüz önbelleği temizlense bile korunur.

---

## [0.3.0] — 2026-10-18

### 🇬🇧 English

**Added**
- **Year calendar panel** on the right side of Overview and Board: all 12 months at a glance, today highlighted, task due dates and completions marked by priority-colored dots, overdue days in red and Turkish public holidays shaded. Click a day to list its tasks and open them on the board.
- The panel is a fixed layout element — it cannot be dragged or moved when selected — and can be hidden or shown; the choice is remembered.

**Changed**
- Overview KPI tiles adapt to the available width.
- The calendar hides automatically while a task is being edited on the board, keeping the canvas wide.

### 🇹🇷 Türkçe

**Eklenenler**
- Genel Bakış ve Pano ekranlarının sağ tarafına **yıllık takvim paneli**: 12 ay tek bakışta, bugün vurgulu, görev teslim ve tamamlanma günleri önceliğe göre renkli noktalarla, gecikmiş günler kırmızı, Türkiye resmi tatilleri renkli. Bir güne tıklayınca o günün görevleri listelenir ve panoda açılabilir.
- Panel sabit bir yerleşim öğesidir; seçildiğinde sürüklenmez veya yerinden oynamaz. Gizlenip gösterilebilir ve tercih hatırlanır.

**Değişenler**
- Genel Bakış gösterge kutuları mevcut genişliğe uyum sağlar.
- Panoda bir görev düzenlenirken takvim otomatik gizlenir, böylece tuval geniş kalır.

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

[0.5.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.5.0
[0.4.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.4.0
[0.3.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.3.0
[0.2.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.2.0
[0.1.0]: https://github.com/dagcann34/dagcan-is-takip/releases/tag/v0.1.0
