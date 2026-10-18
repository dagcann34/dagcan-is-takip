// Uygulama komutlarını izin sistemine bağlar: her pencere yalnızca capabilities/*.json içinde
// açıkça izin verilen komutları çağırabilir (ör. Hızlı Görev penceresi kasaya erişemez).
const COMMANDS: &[&str] = &[
    "save_export",
    "set_tray_labels",
    "set_content_protection",
    "get_content_protection",
    "copy_sensitive_text",
    "wipe_legacy_web_data",
    "vault_item_notes",
    "vault_recovery_key",
    "board_load",
    "board_save",
    "board_export_encrypted",
    "board_import_encrypted",
    "vault_status",
    "vault_init",
    "vault_unlock",
    "vault_lock",
    "vault_touch",
    "vault_set_auto_lock",
    "vault_list",
    "vault_upsert",
    "vault_delete",
    "vault_reveal",
    "vault_copy",
    "vault_export_backup",
    "ai_generate",
];

fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)))
        .expect("tauri build failed");
}
