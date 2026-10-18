# Paylaşım Kiti / Launch Kit — Dağcan İş Takip v0.2.0

Görseller `marketing/images/` klasöründe. Görselleri yeniden üretmek için: `bash marketing/render.sh`.
Images live in `marketing/images/`. Regenerate with `bash marketing/render.sh`.

| Platform | Dosya / File | Boyut / Size |
|---|---|---|
| X (tek görsel) | `x-tr.png`, `x-en.png` | 1600×900 |
| X (2. görsel / thread) | `x-overview-tr.png`, `x-overview-en.png` | 1600×900 |
| LinkedIn (bağlantı kartı / yatay) | `linkedin-tr.png`, `linkedin-en.png` | 1200×627 |
| LinkedIn (kare, akışta daha büyük görünür) | `linkedin-square-tr.png`, `linkedin-square-en.png` | 1080×1080 |
| Ham ekran görüntüleri | `docs/screenshots/*-tr.png`, `*-en.png` | 3200×2000 |

> ✅ Paylaşmadan önce: GitHub deposunun herkese açık olduğundan ve Releases sayfasında kurulum dosyalarının bulunduğundan emin ol. Bağlantı: https://github.com/dagcann34/dagcan-is-takip
> ✅ Before posting: make sure the GitHub repo is public and the Releases page has installers.

---

## X — Türkçe

### Tek gönderi (görsel: `x-tr.png`)

```
İşlerimi, şifrelerimi ve rapor e-postalarımı tek yerde toplamak için bir uygulama yazdım 🛠️

Dağcan İş Takip:
- Kanban pano + PNG/PDF dışa aktarma
- AES-256 şifreli kasa
- AI ile yönetici özeti ve CV maddeleri

Ücretsiz, açık kaynak, Windows + macOS 👇
https://github.com/dagcann34/dagcan-is-takip
```

### Thread (5 gönderi)

```
1/ BT altyapısında çalışırken işler Jira'da, şifreler bir not dosyasında, PowerShell betikleri masaüstünde, haftalık rapor e-postası da kafamda dağınık duruyordu.

Hepsini tek bir masaüstü uygulamasında topladım: Dağcan İş Takip 🧵
[görsel: x-tr.png]
```

```
2/ ▦ Pano
Kartları Yapılacak → Devam Ediyor → Engellendi → Tamamlandı arasında sürükle, bağımlılık okları çiz.
Kontrol listesi, süre takibi, son tarih rozetleri ve tüm panoyu tek tıkla PNG / SVG / PDF olarak dışa aktarma.
[görsel: x-overview-tr.png]
```

```
3/ 🔒 Sıfır bilgi kasa
Parolalar, sunucu bilgileri ve PowerShell betikleri Rust tarafında Argon2id + AES-256-GCM ile şifreleniyor.
Boşta kalınca kilitleniyor, kopyaladığın şifre 30 sn sonra panodan siliniyor.
```

```
4/ AI Stüdyo (Claude)
Biten işlerden tek tıkla:
- Kesinti/ROI odaklı yönetici e-postası
- STAR yöntemiyle CV ve LinkedIn maddeleri
- CAB için değişiklik talebi (RFC)
- Suçlamasız olay sonrası rapor
IP, e-posta ve parolalar göndermeden önce cihazda maskeleniyor.
```

```
5/ ⌘K komut paleti, sistem tepsisi, Ctrl/⌘+Shift+Space ile hızlı görev, Türkçe/İngilizce arayüz.

Tamamen ücretsiz ve MIT lisanslı. Yıldız ⭐ ve geri bildirim çok değerli:
https://github.com/dagcann34/dagcan-is-takip
```

**Hashtag önerisi (en fazla 2):** `#sysadmin #açıkkaynak`

---

## X — English

### Single post (image: `x-en.png`)

```
As a sysadmin, I built the app I wanted: tasks, passwords and status emails in one place 🛠️

Dağcan İş Takip:
- Kanban board + PNG/PDF export
- AES-256 encrypted vault
- AI executive summaries & CV bullets

Free, open source, Windows + macOS 👇
https://github.com/dagcann34/dagcan-is-takip
```

### Thread (5 posts)

```
1/ Working in IT infrastructure, my tasks lived in Jira, passwords in a text file, PowerShell scripts on my desktop and the weekly status email in my head.

So I put all of it into one desktop app: Dağcan İş Takip 🧵
[image: x-en.png]
```

```
2/ ▦ Board
Drag cards across To Do → In Progress → Blocked → Done and draw dependency arrows.
Checklists, time tracking, due-date badges, and one-click PNG / SVG / PDF export of the whole board.
[image: x-overview-en.png]
```

```
3/ 🔒 Zero-knowledge vault
Passwords, servers and PowerShell scripts are encrypted in Rust with Argon2id + AES-256-GCM.
It auto-locks when idle, and copied secrets are wiped from the clipboard after 30s.
```

```
4/ AI Studio (Claude)
From finished tasks, one click gives you:
- An executive email focused on downtime & ROI
- STAR-method CV and LinkedIn bullets
- A change request (RFC) for CAB
- A blameless post-incident report
IPs, emails and passwords are masked on-device first.
```

```
5/ ⌘K command palette, tray app, Ctrl/⌘+Shift+Space quick capture, English & Turkish UI.

Completely free and MIT-licensed. Stars ⭐ and feedback are hugely appreciated:
https://github.com/dagcann34/dagcan-is-takip
```

**Suggested hashtags (max 2):** `#sysadmin #opensource`

---

## LinkedIn — Türkçe (görsel: `linkedin-square-tr.png` veya `linkedin-tr.png`)

```
Altyapı işlerimi tek bir yerde toplamak için kendi uygulamamı yazdım ve ücretsiz olarak paylaşıyorum. 🚀

Bir sistem yöneticisinin günü birçok araç arasında bölünüyor: görevler bir yerde, sunucu şifreleri başka yerde, PowerShell betikleri masaüstünde, haftalık durum e-postası ise son dakikaya kalıyor. Bu dağınıklığı çözmek için Dağcan İş Takip'i geliştirdim.

🔹 Kanban pano ve beyaz tahta
Kartları sürükle bırak, bağımlılıkları oklarla göster; kontrol listesi, süre takibi ve son tarih uyarıları. Panonun tamamı PNG, SVG veya PDF olarak tek tıkla dışa aktarılıyor; tek bir kartı görsel olarak yöneticine iletebiliyorsun.

🔹 Sıfır bilgi şifreli kasa
Parolalar, sunucu bilgileri, PowerShell betikleri ve API anahtarları cihazda Argon2id + AES-256-GCM ile şifreleniyor. Ana parola hiçbir yere gönderilmiyor; uygulama boşta kalınca kilitleniyor ve kopyalanan şifre 30 saniye sonra panodan siliniyor.

🔹 AI Stüdyo
Tamamlanan işlerden tek tıkla:
• Kesinti, risk ve ROI odaklı yönetici özeti e-postası
• STAR yöntemiyle CV ve LinkedIn maddeleri
• CAB'a sunulacak değişiklik talebi (RFC)
• Suçlamasız olay sonrası rapor
Hassas bilgiler (IP, e-posta, parola) göndermeden önce cihazda maskeleniyor; uydurma metrik yerine doldurulacak yer tutucular bırakılıyor.

🔹 Günlük kullanım
⌘K komut paleti, sistem tepsisinde çalışma, Ctrl/⌘ + Shift + Space ile hızlı görev, yerel bildirimler, Türkçe ve İngilizce arayüz.

🛠️ Teknoloji: Tauri v2 (Rust) + React + TypeScript. Windows ve macOS'ta çalışıyor, MIT lisanslı ve tamamen ücretsiz.

Kaynak kod ve indirme: https://github.com/dagcann34/dagcan-is-takip

Denersen geri bildirimini çok isterim. Hangi özellik senin işini kolaylaştırırdı? 👇

#SistemYönetimi #BTAltyapı #AçıkKaynak #SiberGüvenlik #Rust
```

---

## LinkedIn — English (image: `linkedin-square-en.png` or `linkedin-en.png`)

```
I built my own app to bring my infrastructure work into one place, and I'm sharing it for free. 🚀

A sysadmin's day is split across too many tools: tasks in one place, server passwords in another, PowerShell scripts on the desktop, and the weekly status email always left for the last minute. Dağcan İş Takip is my answer to that.

🔹 Kanban board & whiteboard
Drag-and-drop cards, dependency arrows, checklists, time tracking and due-date alerts. Export the whole board as PNG, SVG or PDF in one click, or share a single card as an image with your manager.

🔹 Zero-knowledge encrypted vault
Passwords, server details, PowerShell scripts and API keys are encrypted on-device with Argon2id + AES-256-GCM. The master password never leaves your machine; the app auto-locks when idle and copied secrets are wiped from the clipboard after 30 seconds.

🔹 AI Studio
From finished work, one click gives you:
• An executive summary email focused on downtime, risk and ROI
• STAR-method CV and LinkedIn bullets
• A change request (RFC) ready for CAB
• A blameless post-incident report
Sensitive details (IPs, emails, passwords) are masked locally before sending, and missing metrics become placeholders instead of invented numbers.

🔹 Everyday flow
⌘K command palette, system tray mode, Ctrl/⌘ + Shift + Space quick capture, native notifications, English and Turkish UI.

🛠️ Stack: Tauri v2 (Rust) + React + TypeScript. Runs on Windows and macOS, MIT-licensed and completely free.

Source & download: https://github.com/dagcann34/dagcan-is-takip

If you give it a try, I'd love your feedback. Which feature would make your day easier? 👇

#SysAdmin #ITInfrastructure #OpenSource #CyberSecurity #Rust
```

---

## İpuçları / Tips

- **X:** Bağlantılı gönderiler daha az erişim alabilir; alternatif olarak bağlantıyı ilk yanıta koy. / Posts with links may get less reach; you can put the link in the first reply instead.
- **LinkedIn:** Kare görsel akışta daha fazla yer kaplar. Bağlantıyı gönderide tut; ilk yorumda GitHub Releases bağlantısını tekrar paylaş. / The square image takes more feed space. Keep the link in the post; repeat the Releases link in the first comment.
- **Zamanlama / Timing:** Hafta içi 09:00–11:00 (TR saati) profesyonel kitle için iyi bir aralık. / Weekday mornings work well for a professional audience.
- **Demo:** 20–30 sn'lik ekran kaydı (kart sürükleme → PDF dışa aktarma → AI e-posta) etkileşimi artırır. / A 20–30s screen recording boosts engagement.
