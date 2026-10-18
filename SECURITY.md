# Security Policy / Güvenlik Politikası

## 🇬🇧 Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's
[private vulnerability reporting](https://github.com/dagcann34/kanvault/security/advisories/new)
and include steps to reproduce, affected version and impact. You will get a reply within 7 days.

Scope that matters most: the vault (`src-tauri/src/crypto.rs`, `vault.rs`), the IPC surface
(`src-tauri/capabilities`, Tauri commands) and anything that could leak secrets to the web view or network.

## 🇹🇷 Güvenlik açığı bildirme

Güvenlik sorunları için lütfen **herkese açık issue açma**. GitHub'ın
[özel güvenlik açığı bildirimini](https://github.com/dagcann34/kanvault/security/advisories/new)
kullan; yeniden üretme adımlarını, etkilenen sürümü ve etkiyi ekle. 7 gün içinde yanıt verilir.

En önemli kapsam: kasa (`src-tauri/src/crypto.rs`, `vault.rs`), IPC yüzeyi
(`src-tauri/capabilities`, Tauri komutları) ve gizli bilgileri arayüze veya ağa sızdırabilecek her şey.

## Supported versions / Desteklenen sürümler

| Version | Supported |
|---|---|
| 1.x | ✅ |
| < 1.0 | ❌ |
