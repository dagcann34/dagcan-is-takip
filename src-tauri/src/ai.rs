//! Claude API istemcisi. API anahtarı şifreli kasadan Rust tarafında okunur ve WebView'e hiç çıkmaz.
//! Prompt şablonları arayüzde (`src/features/ai/prompts.ts`) üretilir; buraya hazır metin gelir.

use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;

use crate::vault::VaultState;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const MODEL: &str = "claude-opus-5-5";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRequest {
    system: String,
    prompt: String,
    max_tokens: Option<u32>,
    /// "low" | "medium" | "high" — Opus 5.5'te varsayılan "medium".
    effort: Option<String>,
}

#[derive(Serialize)]
pub struct AiResult {
    text: String,
    truncated: bool,
}

#[tauri::command]
pub async fn ai_generate(state: State<'_, VaultState>, req: AiRequest) -> Result<AiResult, String> {
    // Girdi sınırları: maliyet ve kötüye kullanım koruması.
    if req.system.len() + req.prompt.len() > 400_000 {
        return Err("err.board.too_large".into());
    }
    let effort = match req.effort.as_deref() {
        Some("low") => "low",
        Some("high") => "high",
        _ => "medium",
    };
    let max_tokens = req.max_tokens.unwrap_or(16000).clamp(256, 16000);
    // Anahtar kilit altında okunur, istek öncesi kilit bırakılır.
    let key = state.anthropic_key()?;

    let body = json!({
        "model": MODEL,
        "max_tokens": max_tokens,
        "output_config": { "effort": effort },
        // Güvenlik sınıflandırıcısı reddederse sunucu tarafında önerilen modele düşer.
        "fallbacks": "default",
        "system": req.system,
        "messages": [{ "role": "user", "content": req.prompt }],
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(API_URL)
        .header("x-api-key", key.as_str())
        .header("anthropic-version", "2023-06-01")
        .header("anthropic-beta", "server-side-fallback-2026-07-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("err.ai.connect::{e}"))?;

    let status = res.status();
    let v: Value = res.json().await.map_err(|e| format!("err.ai.read::{e}"))?;

    if !status.is_success() {
        let msg = v["error"]["message"].as_str().unwrap_or("unknown error");
        return Err(format!("err.ai.api::{status} {msg}"));
    }

    if v["stop_reason"] == "refusal" {
        let category = v["stop_details"]["category"].as_str().unwrap_or("-");
        return Err(format!("err.ai.refusal::{category}"));
    }

    let text: String = v["content"]
        .as_array()
        .map(|blocks| {
            blocks
                .iter()
                .filter(|b| b["type"] == "text")
                .filter_map(|b| b["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    Ok(AiResult { truncated: v["stop_reason"] == "max_tokens", text })
}
