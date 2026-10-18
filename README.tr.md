<p align="center">
  <img src="public/favicon.svg" width="96" alt="Dağcan İş Takip logosu" />
</p>

<h1 align="center">Dağcan İş Takip</h1>
<p align="center"><b>BT altyapı ekipleri için kurumsal iş ve güvenlik merkezi</b><br/>
Kanban beyaz tahta · sıfır bilgi kasa · AI raporlama · Windows ve macOS</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> ·
  <a href="CHANGELOG.md">Sürüm notları</a> ·
  <a href="https://github.com/dagcann34/dagcan-is-takip/releases">İndir</a> ·
  <a href="SECURITY.md">Güvenlik</a>
</p>

<p align="center">
  <img alt="Lisans: MIT" src="https://img.shields.io/badge/lisans-MIT-0052CC" />
  <img alt="Tauri v2" src="https://img.shields.io/badge/Tauri-v2-00B8D9" />
  <img alt="Platformlar" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-172B4D" />
  <img alt="Diller" src="https://img.shields.io/badge/aray%C3%BCz-T%C3%BCrk%C3%A7e%20%7C%20English-36B37E" />
</p>

<p align="center"><img src="docs/screenshots/board.png" width="860" alt="Pano ekran görüntüsü" /></p>

## Neden?

Sistem yöneticileri iş kayıtlarını, PowerShell betiklerini, sunucu parolalarını ve durum e-postalarını beş farklı araçta yönetiyor. Dağcan İş Takip; iş panosunu, şifreli kasayı ve AI yazım asistanını hızlı, yerel öncelikli tek bir masaüstü uygulamasında birleştirir. Ücretsiz ve açık kaynaklıdır.

## Özellikler

| | |
|---|---|
| **Genel Bakış paneli** | Açık, gecikmiş, bu hafta teslim, son 7 günde biten, engellenen iş ve takip edilen süre göstergeleri; durum dağılımı; yaklaşan teslimler |
| **Kanban + beyaz tahta** | Kartları Yapılacak / Devam Ediyor / Engellendi / Tamamlandı arasında sürükle, bağımlılık okları çiz, mini harita, öncelik ve son tarih rozetleri |
| **Dışa aktarma ve paylaşım** | Panonun tamamını yüksek çözünürlüklü PNG, vektörel SVG veya PDF olarak; tek bir kartı görsel olarak (kaydedilir + panoya kopyalanır) |
| **Kontrol listesi ve süre takibi** | İlerleme çubuklu alt adımlar, görev başına başlat/durdur zamanlayıcı |
| **Sıfır bilgi kasa** | Parola, sunucu, PowerShell betiği, not ve API anahtarları Rust tarafında Argon2id + AES-256-GCM ile şifrelenir |
| **Otomatik kilit ve pano temizleme** | Hareketsizlikte (1–30 dk) veya arka planda 60 sn sonra kilitlenir; kopyalanan gizli değer 30 sn sonra silinir |
| **Parola üretici** | Sapmasız, kriptografik rastgele üretici; varsayılan 24 karakter |
| **AI Stüdyo (Claude)** | Yönetici özeti e-postası, STAR yöntemiyle CV/LinkedIn maddeleri, ITIL değişiklik talebi (RFC/CAB), suçlamasız olay sonrası rapor |
| **Yerel maskeleme** | IP, e-posta, UNC yolu ve parola benzeri ifadeler cihazdan çıkmadan maskelenir |
| **Komut paleti** | `⌘K` / `Ctrl+K` ile her yere git, görev ara, görev oluştur, kasayı kilitle, dili değiştir |
| **Sistem tepsisi / menü çubuğu** | Arka planda çalışır; `⌘⇧Space` / `Ctrl+Shift+Space` Hızlı Görev penceresini açar |
| **Yerel bildirimler** | Yaklaşan ve geciken işler için macOS ve Windows bildirim merkezi |
| **Çift dil** | Arayüz, tepsi menüsü ve hata mesajları tamamen Türkçe ve İngilizce |
| **Yedekleme** | Pano JSON dışa/içe aktarma, şifreli kasa yedeği |

## İndir

En güncel `.dmg` (macOS, Apple Silicon ve Intel) veya `.msi` / `.exe` (Windows) dosyasını **[Releases](https://github.com/dagcann34/dagcan-is-takip/releases)** sayfasından indir.

> Sürümler henüz kod imzalı değil. macOS'ta ilk açılışta sağ tık → **Aç**; Windows'ta SmartScreen'de **Ek bilgi → Yine de çalıştır**.

## Kaynaktan derleme

Gereksinimler: Node.js 20+, Rust (stable); Windows'ta ayrıca WebView2 ve MSVC derleme araçları.

```bash
git clone https://github.com/dagcann34/dagcan-is-takip.git
cd dagcan-is-takip
npm install
npm run tauri dev      # anında yenilemeli masaüstü uygulaması
npm run tauri build    # kurulum dosyaları: src-tauri/target/release/bundle
npm run dev            # yalnızca arayüz önizlemesi (kasa ve AI kapalı)
cd src-tauri && cargo test   # kripto birim testleri
```

## AI kurulumu

1. [Claude Console](https://platform.claude.com/) üzerinden bir API anahtarı al.
2. **Güvenli Kasa**'da, türü **API Anahtarı** olan ve başlığında `Anthropic` geçen bir kayıt ekle.
3. **AI Stüdyo**'yu aç, görevleri seç ve taslağı oluştur. Anahtar Rust sürecinde okunur, arayüze hiç ulaşmaz.

Model: `claude-opus-5-5` (efor `medium`), reddetme durumunda sunucu tarafı yedek model.

## Güvenlik modeli

| Konu | Uygulama |
|---|---|
| Anahtar türetme | Argon2id, m = 64 MiB, t = 3, p = 4, 16 bayt rastgele tuz |
| Şifreleme | AES-256-GCM, kayıt başına rastgele 96-bit nonce, kayıt kimliği AAD'ye bağlı |
| Anahtar hiyerarşisi | Parola → KEK → sarılı rastgele DEK. Parola ve anahtarlar diske yazılmaz |
| Sıfır bilgi | Başlık, etiket ve kullanıcı adları da şifreli; kasa dosyası eşitlenebilir |
| Bellek | Anahtarlar ve çözülmüş içerik bellekten silinirken sıfırlanır |
| Arayüz | Sıkı CSP, ağ erişimi yok; Claude çağrısı Rust'ta yapılır |

Güvenlik açığı bildirimi için [SECURITY.md](SECURITY.md).

## Yol haritası

- Uçtan uca şifreli eşitleme (iCloud Drive / OneDrive klasörü veya Supabase)
- Pano verisinin de kasa anahtarıyla şifrelendiği SQLite depolama
- Touch ID / Windows Hello ile kilit açma
- PowerShell oyun alanı: kasadaki betikleri çalıştırıp çıktıyı göreve ekleme
- Kod imzalı ve noter onaylı sürümler

## Katkı

Hata bildirimleri ve pull request'ler memnuniyetle karşılanır — bkz. [CONTRIBUTING.md](CONTRIBUTING.md). Arayüz metinlerini hem `tr` hem `en` sözlüğüne eklemeyi unutma.

## Lisans

[MIT](LICENSE) © 2026 Dağcan
