# Kanvault — Paylaşım Kiti / Launch Kit (v1.0.0)

Her şeyi yeniden üretmek için (uygulama `npm run dev` ile açıkken): `bash marketing/render.sh`
Regenerate everything (with `npm run dev` running): `bash marketing/render.sh`

## Dosyalar / Files

| Platform | Dosya / File | Boyut / Size |
|---|---|---|
| **LinkedIn — PDF karusel (belge gönderisi)** | `marketing/linkedin-carousel-tr.pdf`, `marketing/linkedin-carousel-en.pdf` | 8 slayt, 1080×1350 |
| LinkedIn — tek görsel | `marketing/images/linkedin-square-tr.png` / `-en.png` (kare), `linkedin-tr.png` / `-en.png` (yatay) | 1080×1080 · 1200×627 |
| X — ana görsel | `marketing/images/x-tr.png` / `x-en.png` | 1600×900 |
| X — thread görselleri | `x-history-tr.png` / `-en.png` (Zaman Makinesi), `x-dashboard-tr.png` / `-en.png` (Dashboard Stüdyosu) | 1600×900 |
| Ham ekran görüntüleri / raw screenshots | `docs/screenshots/*-tr.png`, `*-en.png` (overview, board, history, dashboards, dash-*, ai, settings, about) | 3200×2000 |

> ✅ Paylaşmadan önce: https://github.com/dagcann34/kanvault herkese açık olmalı ve Releases sayfasında v1.0.0 kurulum dosyaları bulunmalı.
> ✅ Before posting: the repo must be public and Releases must list the v1.0.0 installers.

**LinkedIn'de PDF karusel nasıl paylaşılır / How to post the PDF carousel:** Gönderi oluştur → `+` (Daha fazla) → **Belge ekle** → PDF'i seç → belge başlığı: *Kanvault — BT ekipleri için ücretsiz iş ve güvenlik merkezi* / *Kanvault — free task & security hub for IT teams*.

---

## LinkedIn — Türkçe (PDF karusel: `linkedin-carousel-tr.pdf`)

```
Kendi kullandığım iş takip uygulamasını herkes için ücretsiz yaptım: Kanvault 🚀

Bir sistem yöneticisinin günü beş ayrı araca bölünüyor: görevler bir yerde, sunucu şifreleri başka yerde, PowerShell betikleri masaüstünde, haftalık rapor e-postası hep son dakikada. Ve “geçen ay ne yaptık?” sorusunun cevabı genelde yok.

Kanvault bunları tek bir masaüstü uygulamasında topluyor:

🔹 Ekrana tam oturan neon Kanban pano — öncelik, son tarih, bağımlılık, kontrol listesi, süre takibi, tekrarlayan görevler ve hazır şablonlar (yama, sertifika yenileme, yedek testi…)

🔹 Zaman Makinesi — her değişiklik şifreli olarak kaydediliyor. Geçmişteki herhangi bir güne dönüp panonun o günkü hâlini ve o gün yapılan her işi görebiliyorsun.

🔹 Dashboard Stüdyosu — tarih aralığını seç, temayı seç (Neon HUD, Beyaz Tahta, Kara Tahta, Yönetici, Blueprint), PNG/PDF raporu al.

🔹 Güvenlik — kasa Argon2id + AES-256-GCM ile şifreli ve cihaza bağlı bir gizli anahtar kullanıyor: dosya ve parola birlikte çalınsa bile açılamıyor. Ekran görüntüsü koruması, kopyalama engeli, otomatik kilit ve pano geçmişine düşmeyen güvenli kopyalama da var.

🔹 AI Stüdyo — biten işleri yönetici e-postasına, STAR yöntemiyle CV maddelerine, değişiklik talebine ve olay raporuna dönüştürüyor; hassas veriler önce cihazda maskeleniyor.

Windows ve macOS'ta çalışıyor, Türkçe ve İngilizce. Tamamen ücretsiz ve açık kaynak (MIT): reklam yok, abonelik yok, veri toplama yok.

👉 İndir: github.com/dagcann34/kanvault

Denersen geri bildirimini çok isterim. Sence hangi özellik eklenmeli? 👇

#SistemYönetimi #BTAltyapı #SiberGüvenlik #AçıkKaynak #Kanban
```

## LinkedIn — English (PDF carousel: `linkedin-carousel-en.pdf`)

```
I made the work tracker I use every day free for everyone: Kanvault 🚀

A sysadmin’s day is split across five tools: tasks in one place, server passwords in another, PowerShell scripts on the desktop, and the weekly status email always left to the last minute. And there’s rarely an answer to “what did we actually do last month?”

Kanvault brings it all into one desktop app:

🔹 A neon Kanban board that fits your screen — priorities, due dates, dependencies, checklists, time tracking, recurring tasks and ready templates (patching, certificate renewal, backup tests…)

🔹 Time Machine — every change is recorded, encrypted. Go back to any past day and see the board exactly as it was, plus everything done that day.

🔹 Dashboard Studio — pick a date range, pick a theme (Neon HUD, Whiteboard, Chalkboard, Executive, Blueprint), export a PNG/PDF report.

🔹 Security — the vault uses Argon2id + AES-256-GCM plus a device-bound secret key, so even a stolen file and password together can’t open it. Screenshot protection, copy blocking, auto-lock and clipboard copies that never land in clipboard history.

🔹 AI Studio — turns finished work into executive emails, STAR-method CV bullets, change requests and incident reports, with sensitive data masked on-device first.

Runs on Windows and macOS, in English and Turkish. Completely free and open source (MIT): no ads, no subscriptions, no telemetry.

👉 Download: github.com/dagcann34/kanvault

If you try it, I’d love your feedback. What should it do next? 👇

#SysAdmin #ITInfrastructure #CyberSecurity #OpenSource #Kanban
```

---

## X — Türkçe

### Tek gönderi (görsel: `x-tr.png`)

```
Kendi iş takip uygulamamı herkes için ücretsiz yaptım: Kanvault 🛠️

- Ekrana oturan neon Kanban
- Zaman Makinesi: herhangi bir güne dön
- Beyaz/kara tahta dashboard
- Dosya çalınsa da açılmayan kasa

Windows + macOS · TR/EN · açık kaynak 👇
https://github.com/dagcann34/kanvault
```

### Thread (5 gönderi)

```
1/ Bir sistem yöneticisi, beş ayrı araç: görevler, şifreler, betikler, rapor e-postaları…

Hepsini tek bir masaüstü uygulamasında topladım ve ücretsiz yaptım: Kanvault 🧵
[görsel: x-tr.png]
```

```
2/ ⏪ Zaman Makinesi
Her değişiklik şifreli olarak kaydediliyor. Takvimden bir gün seç: panonun o günkü hâli ve o gün yapılan her iş karşında.
“Geçen ay ne yaptık?” sorusu artık 2 saniye.
[görsel: x-history-tr.png]
```

```
3/ 📊 Dashboard Stüdyosu
Tarih aralığı seç, tema seç: Neon HUD, Beyaz Tahta, Kara Tahta, Yönetici, Blueprint.
Tek tıkla PNG / PDF rapor.
[görsel: x-dashboard-tr.png]
```

```
4/ 🔒 Güvenlik
Kasa: Argon2id + AES-256-GCM + cihaza bağlı gizli anahtar. Dosya ve parola birlikte çalınsa bile açılmıyor.
Ekran görüntüsü koruması, kopyalama engeli, otomatik kilit.
```

```
5/ Windows + macOS, Türkçe/İngilizce, MIT lisanslı ve tamamen ücretsiz.
Yıldız ⭐ ve geri bildirim çok değerli:
https://github.com/dagcann34/kanvault
```

## X — English

### Single post (image: `x-en.png`)

```
I made my own work tracker free for everyone: Kanvault 🛠️

- A neon Kanban that fits the screen
- Time Machine: go back to any day
- Whiteboard/chalkboard dashboards
- A vault even a stolen file can't open

Windows + macOS · EN/TR · open source 👇
https://github.com/dagcann34/kanvault
```

### Thread (5 posts)

```
1/ One sysadmin, five tools: tasks, passwords, scripts, status emails…

I put them all into one desktop app and made it free: Kanvault 🧵
[image: x-en.png]
```

```
2/ ⏪ Time Machine
Every change is recorded, encrypted. Pick a day and see the board exactly as it was, plus everything done that day.
“What did we do last month?” now takes 2 seconds.
[image: x-history-en.png]
```

```
3/ 📊 Dashboard Studio
Pick a date range, pick a theme: Neon HUD, Whiteboard, Chalkboard, Executive, Blueprint.
One-click PNG / PDF reports.
[image: x-dashboard-en.png]
```

```
4/ 🔒 Security
Vault: Argon2id + AES-256-GCM + a device-bound secret key. Even a stolen file and password together can't open it.
Screenshot protection, copy blocking, auto-lock.
```

```
5/ Windows + macOS, English/Turkish, MIT-licensed and completely free.
Stars ⭐ and feedback mean a lot:
https://github.com/dagcann34/kanvault
```

---

## İpuçları / Tips

- **LinkedIn:** PDF karusel (belge gönderisi) akışta en çok etkileşim alan biçimdir. İlk yorumda Releases bağlantısını tekrar paylaş. / Document (PDF) posts get the most engagement; repeat the Releases link in the first comment.
- **X:** Bağlantılı gönderiler daha az erişim alabilir; alternatif olarak bağlantıyı ilk yanıta koy. / Linked posts may get less reach; you can put the link in the first reply.
- **Zamanlama / Timing:** Hafta içi 09:00–11:00 (TR). / Weekday mornings.
- **Not:** Kurulum dosyaları henüz kod imzalı değil; macOS'ta ilk açılışta sağ tık → Aç. / Builds aren’t code-signed yet; on macOS right-click → Open the first time.
