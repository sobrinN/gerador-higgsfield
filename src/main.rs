mod catalog;
mod client;
mod json;

use catalog::{get_bundled_catalog, ModelEntry};
use client::{parse_env_file, HiggsfieldClient, DEFAULT_API_BASE_URL, TERMINAL_STATUSES};
use json::JsonValue;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct JobRecord {
    pub request_id: String,
    pub owner_id: String,
    pub model_id: String,
    pub endpoint: String,
    pub model_name: String,
    pub category: String,
    pub status: String,
    pub prompt_summary: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub status_url: Option<String>,
    pub cancel_url: Option<String>,
    pub video_url: Option<String>,
    pub image_urls: Vec<String>,
    pub audio_url: Option<String>,
    pub error_detail: Option<String>,
    pub raw_response: Option<JsonValue>,
}

impl JobRecord {
    pub fn to_json(&self) -> JsonValue {
        let mut obj = JsonValue::obj();
        obj.insert("request_id", JsonValue::Str(self.request_id.clone()));
        obj.insert("owner_id", JsonValue::Str(self.owner_id.clone()));
        obj.insert("model_id", JsonValue::Str(self.model_id.clone()));
        obj.insert("endpoint", JsonValue::Str(self.endpoint.clone()));
        obj.insert("model_name", JsonValue::Str(self.model_name.clone()));
        obj.insert("category", JsonValue::Str(self.category.clone()));
        obj.insert("status", JsonValue::Str(self.status.clone()));
        obj.insert("prompt_summary", JsonValue::Str(self.prompt_summary.clone()));
        obj.insert("created_at", JsonValue::Number(self.created_at as f64));
        obj.insert("updated_at", JsonValue::Number(self.updated_at as f64));

        obj.insert(
            "status_url",
            self.status_url
                .as_ref()
                .map(|s| JsonValue::Str(s.clone()))
                .unwrap_or(JsonValue::Null),
        );
        obj.insert(
            "cancel_url",
            self.cancel_url
                .as_ref()
                .map(|s| JsonValue::Str(s.clone()))
                .unwrap_or(JsonValue::Null),
        );
        obj.insert(
            "video_url",
            self.video_url
                .as_ref()
                .map(|s| JsonValue::Str(s.clone()))
                .unwrap_or(JsonValue::Null),
        );

        let mut imgs = JsonValue::arr();
        for u in &self.image_urls {
            imgs.push(JsonValue::Str(u.clone()));
        }
        obj.insert("image_urls", imgs);

        obj.insert(
            "audio_url",
            self.audio_url
                .as_ref()
                .map(|s| JsonValue::Str(s.clone()))
                .unwrap_or(JsonValue::Null),
        );
        obj.insert(
            "error_detail",
            self.error_detail
                .as_ref()
                .map(|s| JsonValue::Str(s.clone()))
                .unwrap_or(JsonValue::Null),
        );
        obj.insert(
            "raw_response",
            self.raw_response.clone().unwrap_or(JsonValue::Null),
        );
        obj
    }

    pub fn from_json(v: &JsonValue) -> Option<Self> {
        let request_id = v.get("request_id")?.as_str()?.to_string();
        let owner_id = v
            .get("owner_id")
            .and_then(|x| x.as_str())
            .unwrap_or("local-studio")
            .to_string();
        let model_id = v
            .get("model_id")
            .and_then(|x| x.as_str())
            .unwrap_or("custom")
            .to_string();
        let endpoint = v
            .get("endpoint")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let model_name = v
            .get("model_name")
            .and_then(|x| x.as_str())
            .unwrap_or(&endpoint)
            .to_string();
        let category = v
            .get("category")
            .and_then(|x| x.as_str())
            .unwrap_or("video")
            .to_string();
        let status = v
            .get("status")
            .and_then(|x| x.as_str())
            .unwrap_or("queued")
            .to_string();
        let prompt_summary = v
            .get("prompt_summary")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let created_at = v
            .get("created_at")
            .and_then(|x| x.as_f64())
            .unwrap_or(0.0) as u64;
        let updated_at = v
            .get("updated_at")
            .and_then(|x| x.as_f64())
            .unwrap_or(0.0) as u64;
        let status_url = v
            .get("status_url")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());
        let cancel_url = v
            .get("cancel_url")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());
        let video_url = v
            .get("video_url")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());

        let mut image_urls = Vec::new();
        if let Some(arr) = v.get("image_urls").and_then(|x| x.as_array()) {
            for item in arr {
                if let Some(s) = item.as_str() {
                    image_urls.push(s.to_string());
                }
            }
        }
        let audio_url = v
            .get("audio_url")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());
        let error_detail = v
            .get("error_detail")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());
        let raw_response = v.get("raw_response").cloned().filter(|x| !x.is_null());

        Some(Self {
            request_id,
            owner_id,
            model_id,
            endpoint,
            model_name,
            category,
            status,
            prompt_summary,
            created_at,
            updated_at,
            status_url,
            cancel_url,
            video_url,
            image_urls,
            audio_url,
            error_detail,
            raw_response,
        })
    }
}

pub struct AppState {
    pub hf_client: HiggsfieldClient,
    pub session_api_key: RwLock<Option<String>>,
    pub jobs: RwLock<HashMap<String, JobRecord>>,
    pub job_order: RwLock<Vec<String>>,
    pub catalog: Vec<ModelEntry>,
    pub history_path: PathBuf,
}

impl AppState {
    /// Resolve active API key from session memory first, then `.env.local` / `.env` / environment variables
    /// (`HF_API_KEY`, `HF_CREDENTIALS`, `HF_KEY`). Never prints or logs the key.
    pub fn resolve_api_key(&self) -> Option<(String, &'static str)> {
        if let Ok(guard) = self.session_api_key.read() {
            if let Some(ref k) = *guard {
                if !k.trim().is_empty() {
                    return Some((k.trim().to_string(), "session"));
                }
            }
        }

        let env_local = parse_env_file(".env.local");
        let env_default = parse_env_file(".env");

        for var_name in ["HF_API_KEY", "HF_CREDENTIALS", "HF_KEY"] {
            if let Some(val) = env_local.get(var_name) {
                if !val.trim().is_empty() {
                    return Some((val.trim().to_string(), "env"));
                }
            }
            if let Some(val) = env_default.get(var_name) {
                if !val.trim().is_empty() {
                    return Some((val.trim().to_string(), "env"));
                }
            }
            if let Ok(val) = env::var(var_name) {
                if !val.trim().is_empty() {
                    return Some((val.trim().to_string(), "env"));
                }
            }
        }
        None
    }

    pub fn persist_jobs(&self) {
        let Ok(jobs_map) = self.jobs.read() else {
            return;
        };
        let Ok(order) = self.job_order.read() else {
            return;
        };
        let mut arr = JsonValue::arr();
        for id in order.iter() {
            if let Some(rec) = jobs_map.get(id) {
                arr.push(rec.to_json());
            }
        }
        if fs::write(&self.history_path, arr.to_json_string()).is_ok() {
            set_owner_only_permissions(&self.history_path);
        }
    }
}

#[cfg(unix)]
fn set_owner_only_permissions(path: & std::path::Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn set_owner_only_permissions(_path: &std::path::Path) {}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn write_key_to_env_local(new_key: &str) -> Result<(), String> {
    let env_path = PathBuf::from(".env.local");
    let clean_key = new_key
        .trim()
        .strip_prefix("Key ")
        .or_else(|| new_key.trim().strip_prefix("key "))
        .unwrap_or(new_key.trim());

    let content = format!(
        "# Paste your Higgsfield API key below in key-id:key-secret format (from https://open.higgsfield.ai/api-keys)\n\
         # You can set any one of HF_API_KEY, HF_CREDENTIALS, or HF_KEY (or use \"Connect API key\" in the Web UI).\n\
         HF_API_KEY={key}\n\
         HF_CREDENTIALS={key}\n\
         HF_KEY={key}\n\n\
         # Optional server configuration\n\
         HF_API_BASE_URL=https://api.higgsfield.ai\n\
         PORT=3000\n",
        key = clean_key
    );

    fs::write(&env_path, content).map_err(|e| format!("Failed to update .env.local: {}", e))?;
    set_owner_only_permissions(&env_path);
    Ok(())
}

fn sanitize_input_payload(raw: &JsonValue) -> JsonValue {
    let Some(obj) = raw.as_object() else {
        return raw.clone();
    };
    let has_custom_ref = obj
        .get("custom_reference_id")
        .and_then(|v| v.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let tier_str = obj
        .get("tier")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let is_human_tier = matches!(tier_str, "normal" | "freak" | "total");
    let is_animal_tier = matches!(
        tier_str,
        "cats" | "dogs" | "capybaras" | "birds" | "frogs" | "insects"
    );

    let mut cleaned = JsonValue::obj();
    for (k, v) in obj {
        if k.starts_with("__") {
            continue;
        }
        if k == "custom_reference_strength" && !has_custom_ref {
            continue;
        }
        if is_human_tier && (k == "body_color" || k == "pinned_species") {
            continue;
        }
        if is_animal_tier && (k == "image_url" || k == "item_image_urls") {
            continue;
        }
        if !tier_str.is_empty() && tier_str != "insects" && k == "pinned_species" {
            continue;
        }
        if is_human_tier && k == "variation_index" {
            cleaned.insert(k, JsonValue::Number(0.0));
            continue;
        }

        match v {
            JsonValue::Null => {}
            JsonValue::Str(s) if s.trim().is_empty() && k != "prompt" && k != "brief" => {}
            JsonValue::Array(arr) if arr.is_empty() => {}
            JsonValue::Str(s) if k == "batch_size" => {
                if let Ok(n) = s.parse::<f64>() {
                    cleaned.insert(k, JsonValue::Number(n));
                } else {
                    cleaned.insert(k, v.clone());
                }
            }
            _ => {
                cleaned.insert(k, v.clone());
            }
        }
    }
    cleaned
}

/// Prepare a payload specifically for `POST /estimate/<endpoint>` so that live cost calculation
/// succeeds as soon as the user adjusts `resolution`, `duration`, `aspect_ratio`, `generate_audio`,
/// or `batch_size`, even before they have typed a prompt or uploaded a reference file.
fn prepare_estimate_payload(
    raw: &JsonValue,
    endpoint: &str,
    catalog: &[ModelEntry],
) -> JsonValue {
    let mut cleaned = sanitize_input_payload(raw);
    let clean_ep = endpoint.trim().trim_start_matches('/');

    if let Some(entry) = catalog.iter().find(|m| m.endpoint == clean_ep) {
        for field in &entry.fields {
            if !field.required {
                continue;
            }
            let is_missing = match cleaned.get(field.name) {
                None | Some(JsonValue::Null) => true,
                Some(JsonValue::Str(s)) => s.trim().is_empty(),
                Some(JsonValue::Array(a)) => a.is_empty(),
                _ => false,
            };
            if is_missing {
                let placeholder = match field.field_type {
                    "image_url" => JsonValue::Str("https://example.com/input.jpg".to_string()),
                    "video_url" => JsonValue::Str("https://example.com/input.mp4".to_string()),
                    "audio_url" => JsonValue::Str("https://example.com/input.wav".to_string()),
                    "image_urls" => {
                        let mut arr = JsonValue::arr();
                        arr.push(JsonValue::Str("https://example.com/input.jpg".to_string()));
                        arr
                    }
                    _ => JsonValue::Str("cost estimate preview".to_string()),
                };
                cleaned.insert(field.name, placeholder);
            }
        }
    } else {
        // Fallback for custom endpoints if prompt is blank
        if let Some(JsonValue::Str(s)) = cleaned.get("prompt") {
            if s.trim().is_empty() {
                cleaned.insert(
                    "prompt",
                    JsonValue::Str("cost estimate preview".to_string()),
                );
            }
        }
    }
    cleaned
}

fn extract_media_urls(body: &JsonValue) -> (Option<String>, Vec<String>, Option<String>) {
    let video_url = body
        .get("video")
        .and_then(|v| v.get("url"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string());

    let mut image_urls = Vec::new();
    if let Some(imgs) = body.get("images").and_then(|v| v.as_array()) {
        for item in imgs {
            if let Some(u) = item.get("url").and_then(|u| u.as_str()) {
                image_urls.push(u.to_string());
            } else if let Some(u) = item.as_str() {
                image_urls.push(u.to_string());
            }
        }
    }
    if let Some(single_img) = body
        .get("image")
        .and_then(|v| v.get("url"))
        .and_then(|u| u.as_str())
    {
        if !image_urls.contains(&single_img.to_string()) {
            image_urls.push(single_img.to_string());
        }
    }

    let audio_url = body
        .get("audio")
        .and_then(|v| v.get("url"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            body.get("audios")
                .and_then(|a| a.as_array())
                .and_then(|arr| arr.first())
                .and_then(|item| item.get("url"))
                .and_then(|u| u.as_str())
                .map(|s| s.to_string())
        });

    (video_url, image_urls, audio_url)
}

/// Run the standalone CLI Seedance 2.5 Text-to-Video verification example (`cargo run -- --seedance`).
fn run_seedance_cli_example(state: Arc<AppState>) -> i32 {
    println!("=== Higgsfield Seedance 2.5 Text-to-Video CLI Example ===");
    println!("Model: bytedance/seedance-2.5/text-to-video");
    println!(
        "Parameters: prompt=\"A cinematic scene at sunset\", duration=5, resolution=\"720p\", aspect_ratio=\"16:9\""
    );

    let Some((api_key, source)) = state.resolve_api_key() else {
        eprintln!(
            "\n[BLOCKED] No Higgsfield API key configured in .env.local (HF_API_KEY / HF_CREDENTIALS / HF_KEY).\n\
             Please add your key in key-id:key-secret format to .env.local and re-run:\n\
             cargo run -- --seedance"
        );
        return 2;
    };

    println!("Loaded credentials from {} (server-side only).", source);

    let mut payload = JsonValue::obj();
    payload.insert("prompt", JsonValue::Str("A cinematic scene at sunset".to_string()));
    payload.insert("duration", JsonValue::Number(5.0));
    payload.insert("resolution", JsonValue::Str("720p".to_string()));
    payload.insert("aspect_ratio", JsonValue::Str("16:9".to_string()));
    payload.insert("output_format", JsonValue::Str("mp4".to_string()));
    payload.insert("generate_audio", JsonValue::Bool(true));

    match state.hf_client.subscribe(
        &api_key,
        "bytedance/seedance-2.5/text-to-video",
        &payload,
        Duration::from_secs(600),
    ) {
        Ok(result) => {
            let status = result
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            match status {
                "completed" => {
                    if let Some(video_url) = result
                        .get("video")
                        .and_then(|v| v.get("url"))
                        .and_then(|u| u.as_str())
                    {
                        println!("\n[COMPLETED] Video URL: {}", video_url);
                        0
                    } else {
                        eprintln!(
                            "\n[ERROR] Request marked completed but no video.url found in response: {}",
                            result
                        );
                        1
                    }
                }
                "failed" => {
                    let err_msg = result
                        .get("error")
                        .or_else(|| result.get("detail"))
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "Unknown generation failure".to_string());
                    eprintln!("\n[FAILED] Generation failed: {}", err_msg);
                    1
                }
                "nsfw" => {
                    eprintln!(
                        "\n[MODERATED / NSFW] Request was rejected by content moderation. No credits charged."
                    );
                    1
                }
                "canceled" => {
                    eprintln!("\n[CANCELED] Request was canceled before completion.");
                    1
                }
                other => {
                    eprintln!("\n[UNEXPECTED STATUS] Terminal status: {}", other);
                    1
                }
            }
        }
        Err(err) => {
            eprintln!("\n[ERROR] {}", err);
            1
        }
    }
}

// ==========================================
// HTTP SERVER & ROUTER
// ==========================================

#[derive(Debug)]
struct HttpRequest {
    method: String,
    path: String,
    body: String,
}

fn url_decode(input: &str) -> String {
    let mut bytes = Vec::with_capacity(input.len());
    let raw = input.as_bytes();
    let mut i = 0;
    while i < raw.len() {
        if raw[i] == b'%' && i + 2 < raw.len() {
            if let Ok(hex_str) = std::str::from_utf8(&raw[i + 1..i + 3]) {
                if let Ok(val) = u8::from_str_radix(hex_str, 16) {
                    bytes.push(val);
                    i += 3;
                    continue;
                }
            }
        }
        bytes.push(raw[i]);
        i += 1;
    }
    String::from_utf8_lossy(&bytes).to_string()
}

fn parse_http_request(stream: &mut TcpStream) -> Option<HttpRequest> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(30)));
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).ok()? == 0 {
        return None;
    }
    let parts: Vec<&str> = request_line.trim().split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }
    let method = parts[0].to_uppercase();
    let full_path = parts[1];
    let path = full_path.split('?').next().unwrap_or("/").to_string();

    let mut content_length: usize = 0;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).ok()? == 0 {
            break;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            break;
        }
        if let Some((hk, hv)) = trimmed.split_once(':') {
            if hk.trim().eq_ignore_ascii_case("content-length") {
                content_length = hv.trim().parse::<usize>().unwrap_or(0);
            }
        }
    }

    let mut body_bytes = vec![0u8; content_length];
    if content_length > 0 {
        reader.read_exact(&mut body_bytes).ok()?;
    }
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    Some(HttpRequest { method, path, body })
}

fn status_reason(code: u16) -> &'static str {
    match code {
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        400 => "Bad Request",
        401 => "Unauthorized",
        402 => "Payment Required",
        403 => "Forbidden",
        404 => "Not Found",
        409 => "Conflict",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        _ => "OK",
    }
}

fn send_json_response(stream: &mut TcpStream, code: u16, payload: &JsonValue) {
    let body = payload.to_json_string();
    let header = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        code,
        status_reason(code),
        body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(body.as_bytes());
    let _ = stream.flush();
}

fn send_static_file(stream: &mut TcpStream, req_path: &str) {
    let clean = match req_path {
        "/" | "/index.html" => "static/index.html",
        "/styles.css" => "static/styles.css",
        "/app.js" => "static/app.js",
        _ => {
            let mut err = JsonValue::obj();
            err.insert("error", JsonValue::Str("Not found".to_string()));
            send_json_response(stream, 404, &err);
            return;
        }
    };

    let content_type = if clean.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if clean.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if clean.ends_with(".js") {
        "application/javascript; charset=utf-8"
    } else {
        "application/octet-stream"
    };

    match fs::read(clean) {
        Ok(bytes) => {
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
                content_type,
                bytes.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(&bytes);
            let _ = stream.flush();
        }
        Err(_) => {
            let mut err = JsonValue::obj();
            err.insert("error", JsonValue::Str("Static file not found".to_string()));
            send_json_response(stream, 404, &err);
        }
    }
}

fn json_err(msg: &str) -> JsonValue {
    let mut obj = JsonValue::obj();
    obj.insert("error", JsonValue::Str(msg.to_string()));
    obj
}

fn handle_client(mut stream: TcpStream, state: Arc<AppState>) {
    let Some(req) = parse_http_request(&mut stream) else {
        return;
    };

    match (req.method.as_str(), req.path.as_str()) {
        ("GET", "/api/config") => {
            let (has_key, key_source) = match state.resolve_api_key() {
                Some((_, src)) => (true, src),
                None => (false, "none"),
            };
            let mut res = JsonValue::obj();
            res.insert("has_key", JsonValue::Bool(has_key));
            res.insert("key_source", JsonValue::Str(key_source.to_string()));
            res.insert("base_url", JsonValue::Str(state.hf_client.base_url.clone()));
            send_json_response(&mut stream, 200, &res);
        }

        ("POST", "/api/key") => {
            let Ok(parsed) = JsonValue::parse(&req.body) else {
                send_json_response(&mut stream, 400, &json_err("Invalid JSON body."));
                return;
            };
            let raw_key = parsed
                .get("api_key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if raw_key.is_empty() {
                send_json_response(&mut stream, 400, &json_err("API key cannot be empty."));
                return;
            }
            let persist = parsed
                .get("persist_env_local")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            let clean = raw_key
                .strip_prefix("Key ")
                .or_else(|| raw_key.strip_prefix("key "))
                .unwrap_or(raw_key)
                .trim()
                .to_string();

            if let Ok(mut guard) = state.session_api_key.write() {
                *guard = Some(clean.clone());
            }

            if persist {
                if let Err(e) = write_key_to_env_local(&clean) {
                    send_json_response(&mut stream, 500, &json_err(&e));
                    return;
                }
            }

            let mut res = JsonValue::obj();
            res.insert("ok", JsonValue::Bool(true));
            res.insert("has_key", JsonValue::Bool(true));
            res.insert(
                "key_source",
                JsonValue::Str(if persist { "env" } else { "session" }.to_string()),
            );
            send_json_response(&mut stream, 200, &res);
        }

        ("DELETE", "/api/key") => {
            if let Ok(mut guard) = state.session_api_key.write() {
                *guard = None;
            }
            let _ = write_key_to_env_local("");
            env::remove_var("HF_API_KEY");
            env::remove_var("HF_CREDENTIALS");
            env::remove_var("HF_KEY");

            let mut res = JsonValue::obj();
            res.insert("ok", JsonValue::Bool(true));
            res.insert("has_key", JsonValue::Bool(false));
            res.insert("key_source", JsonValue::Str("none".to_string()));
            send_json_response(&mut stream, 200, &res);
        }

        ("GET", "/api/models") => {
            let mut arr = JsonValue::arr();
            for m in &state.catalog {
                arr.push(m.to_json());
            }
            let mut res = JsonValue::obj();
            res.insert("models", arr);
            res.insert("base_url", JsonValue::Str(state.hf_client.base_url.clone()));
            send_json_response(&mut stream, 200, &res);
        }

        ("GET", "/api/account-models") => {
            let Some((api_key, _)) = state.resolve_api_key() else {
                send_json_response(
                    &mut stream,
                    401,
                    &json_err("Connect your Higgsfield API key first."),
                );
                return;
            };
            match state.hf_client.list_account_models(&api_key) {
                Ok((code, body)) => send_json_response(&mut stream, code, &body),
                Err(e) => send_json_response(&mut stream, 502, &json_err(&e)),
            }
        }

        ("GET", "/api/soul-styles") => {
            let Some((api_key, _)) = state.resolve_api_key() else {
                send_json_response(
                    &mut stream,
                    401,
                    &json_err("Connect your Higgsfield API key first."),
                );
                return;
            };
            match state.hf_client.list_soul_styles(&api_key) {
                Ok((code, body)) => send_json_response(&mut stream, code, &body),
                Err(e) => send_json_response(&mut stream, 502, &json_err(&e)),
            }
        }

        ("POST", "/api/estimate") => {
            let Some((api_key, _)) = state.resolve_api_key() else {
                send_json_response(
                    &mut stream,
                    401,
                    &json_err("Connect your Higgsfield API key first to fetch live account estimates."),
                );
                return;
            };
            let Ok(parsed) = JsonValue::parse(&req.body) else {
                send_json_response(&mut stream, 400, &json_err("Invalid JSON body."));
                return;
            };
            let endpoint = parsed
                .get("endpoint")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let input = parsed.get("input").cloned().unwrap_or_else(JsonValue::obj);
            let prepared = prepare_estimate_payload(&input, endpoint, &state.catalog);

            match state.hf_client.estimate(&api_key, endpoint, &prepared) {
                Ok((code, body)) => send_json_response(&mut stream, code, &body),
                Err(e) => send_json_response(&mut stream, 502, &json_err(&e)),
            }
        }

        ("POST", "/api/generate") => {
            let Some((api_key, _)) = state.resolve_api_key() else {
                send_json_response(
                    &mut stream,
                    401,
                    &json_err("No Higgsfield API key configured. Click 'Connect API key' or set HF_API_KEY in .env.local."),
                );
                return;
            };
            let Ok(parsed) = JsonValue::parse(&req.body) else {
                send_json_response(&mut stream, 400, &json_err("Invalid JSON body."));
                return;
            };

            let endpoint = parsed
                .get("endpoint")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .trim_start_matches('/')
                .to_string();
            if endpoint.is_empty() {
                send_json_response(
                    &mut stream,
                    400,
                    &json_err("Model endpoint cannot be empty."),
                );
                return;
            }

            let model_id = parsed
                .get("model_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let input = parsed.get("input").cloned().unwrap_or_else(JsonValue::obj);

            if let Some(ref mid) = model_id {
                if let Some(entry) = state.catalog.iter().find(|m| m.id == mid) {
                    for field in &entry.fields {
                        if field.required {
                            let val = input.get(field.name);
                            let missing = match val {
                                None | Some(JsonValue::Null) => true,
                                Some(JsonValue::Str(s)) => s.trim().is_empty(),
                                Some(JsonValue::Array(a)) => a.is_empty(),
                                _ => false,
                            };
                            if missing {
                                send_json_response(
                                    &mut stream,
                                    400,
                                    &json_err(&format!(
                                        "Required field '{}' ({}) is missing or empty.",
                                        field.label, field.name
                                    )),
                                );
                                return;
                            }
                        }
                    }
                }
            }

            let cleaned_input = sanitize_input_payload(&input);
            let idem_key = parsed
                .get("idempotency_key")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match state
                .hf_client
                .submit(&api_key, &endpoint, &cleaned_input, idem_key)
            {
                Ok((code, body)) if code < 300 => {
                    let Some(request_id) = body
                        .get("request_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                    else {
                        let mut err = json_err("Higgsfield API response did not include a request_id.");
                        err.insert("raw", body);
                        send_json_response(&mut stream, 502, &err);
                        return;
                    };

                    let status = body
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("queued")
                        .to_string();

                    let prompt_summary = cleaned_input
                        .get("prompt")
                        .or_else(|| cleaned_input.get("brief"))
                        .or_else(|| cleaned_input.get("name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Media generation")
                        .chars()
                        .take(140)
                        .collect::<String>();

                    let now = unix_now();
                    let (video_url, image_urls, audio_url) = extract_media_urls(&body);

                    let record = JobRecord {
                        request_id: request_id.clone(),
                        owner_id: "local-studio".to_string(),
                        model_id: model_id.unwrap_or_else(|| "custom".to_string()),
                        endpoint: endpoint.clone(),
                        model_name: parsed
                            .get("model_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or(&endpoint)
                            .to_string(),
                        category: parsed
                            .get("category")
                            .and_then(|v| v.as_str())
                            .unwrap_or("video")
                            .to_string(),
                        status,
                        prompt_summary,
                        created_at: now,
                        updated_at: now,
                        status_url: body
                            .get("status_url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        cancel_url: body
                            .get("cancel_url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        video_url,
                        image_urls,
                        audio_url,
                        error_detail: None,
                        raw_response: Some(body),
                    };

                    if let (Ok(mut jobs), Ok(mut order)) =
                        (state.jobs.write(), state.job_order.write())
                    {
                        if !jobs.contains_key(&request_id) {
                            order.insert(0, request_id.clone());
                        }
                        jobs.insert(request_id, record.clone());
                    }
                    state.persist_jobs();
                    send_json_response(&mut stream, 200, &record.to_json());
                }
                Ok((code, body)) => {
                    let detail = body
                        .get("detail")
                        .or_else(|| body.get("error"))
                        .map(|v| {
                            if let Some(s) = v.as_str() {
                                s.to_string()
                            } else {
                                v.to_string()
                            }
                        })
                        .unwrap_or_else(|| body.to_string());

                    let mut err = json_err(&detail);
                    err.insert("status_code", JsonValue::Number(code as f64));
                    err.insert("raw", body);
                    send_json_response(&mut stream, code, &err);
                }
                Err(e) => send_json_response(&mut stream, 502, &json_err(&e)),
            }
        }

        ("POST", "/api/upload") => {
            let Some((api_key, _)) = state.resolve_api_key() else {
                send_json_response(
                    &mut stream,
                    401,
                    &json_err("Connect your Higgsfield API key before uploading reference files."),
                );
                return;
            };
            let Ok(parsed) = JsonValue::parse(&req.body) else {
                send_json_response(&mut stream, 400, &json_err("Invalid JSON body."));
                return;
            };
            let content_type = parsed
                .get("content_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if content_type.is_empty() {
                send_json_response(
                    &mut stream,
                    400,
                    &json_err("content_type is required (e.g. image/png, image/jpeg, video/mp4, audio/wav)."),
                );
                return;
            }

            match state.hf_client.generate_upload_url(&api_key, content_type) {
                Ok(presigned) => {
                    let mut res = JsonValue::obj();
                    res.insert("upload_url", JsonValue::Str(presigned.upload_url));
                    res.insert("upload_headers", presigned.upload_headers);
                    res.insert("public_url", JsonValue::Str(presigned.public_url));
                    send_json_response(&mut stream, 200, &res);
                }
                Err(e) => send_json_response(&mut stream, 502, &json_err(&e)),
            }
        }

        ("GET", "/api/jobs") => {
            let mut arr = JsonValue::arr();
            if let (Ok(jobs_map), Ok(order)) = (state.jobs.read(), state.job_order.read()) {
                for id in order.iter() {
                    if let Some(rec) = jobs_map.get(id) {
                        arr.push(rec.to_json());
                    }
                }
            }
            let mut res = JsonValue::obj();
            res.insert("jobs", arr);
            send_json_response(&mut stream, 200, &res);
        }

        _ => {
            if let Some(rest) = req.path.strip_prefix("/api/requests/") {
                if req.method == "GET" && rest.ends_with("/status") {
                    let raw_id = rest.trim_end_matches("/status");
                    let request_id = url_decode(raw_id);
                    handle_poll_status(&mut stream, &state, &request_id);
                    return;
                }
                if req.method == "POST" && rest.ends_with("/cancel") {
                    let raw_id = rest.trim_end_matches("/cancel");
                    let request_id = url_decode(raw_id);
                    handle_cancel_request(&mut stream, &state, &request_id);
                    return;
                }
            }

            if req.method == "GET" {
                send_static_file(&mut stream, &req.path);
            } else {
                send_json_response(&mut stream, 404, &json_err("Endpoint not found."));
            }
        }
    }
}

fn handle_poll_status(stream: &mut TcpStream, state: &Arc<AppState>, request_id: &str) {
    if let Ok(jobs) = state.jobs.read() {
        if let Some(existing) = jobs.get(request_id) {
            if existing.owner_id != "local-studio" {
                send_json_response(
                    stream,
                    403,
                    &json_err("Not authorized to access this request_id."),
                );
                return;
            }
            if TERMINAL_STATUSES.contains(&existing.status.as_str())
                && (existing.video_url.is_some()
                    || !existing.image_urls.is_empty()
                    || existing.audio_url.is_some()
                    || existing.status != "completed")
            {
                send_json_response(stream, 200, &existing.to_json());
                return;
            }
        }
    }

    let Some((api_key, _)) = state.resolve_api_key() else {
        send_json_response(stream, 401, &json_err("Missing Higgsfield API key."));
        return;
    };

    match state.hf_client.get_status(&api_key, request_id) {
        Ok((code, body)) if code < 300 => {
            let status = body
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("in_progress")
                .to_string();

            let (video_url, image_urls, audio_url) = extract_media_urls(&body);
            let error_detail = if status == "failed" || status == "nsfw" {
                body.get("error")
                    .or_else(|| body.get("detail"))
                    .map(|v| {
                        if let Some(s) = v.as_str() {
                            s.to_string()
                        } else {
                            v.to_string()
                        }
                    })
                    .or_else(|| {
                        if status == "nsfw" {
                            Some(
                                "Rejected by content moderation (NSFW). Credits are not charged."
                                    .to_string(),
                            )
                        } else {
                            Some("Generation failed on provider.".to_string())
                        }
                    })
            } else {
                None
            };

            let now = unix_now();
            let mut updated_json = JsonValue::Null;

            if let Ok(mut jobs) = state.jobs.write() {
                let entry = jobs.entry(request_id.to_string()).or_insert_with(|| JobRecord {
                    request_id: request_id.to_string(),
                    owner_id: "local-studio".to_string(),
                    model_id: "custom".to_string(),
                    endpoint: "unknown".to_string(),
                    model_name: "External Request".to_string(),
                    category: "video".to_string(),
                    status: status.clone(),
                    prompt_summary: request_id.to_string(),
                    created_at: now,
                    updated_at: now,
                    status_url: None,
                    cancel_url: None,
                    video_url: None,
                    image_urls: Vec::new(),
                    audio_url: None,
                    error_detail: None,
                    raw_response: None,
                });

                entry.status = status.clone();
                entry.updated_at = now;
                if video_url.is_some() {
                    entry.video_url = video_url;
                }
                if !image_urls.is_empty() {
                    entry.image_urls = image_urls;
                }
                if audio_url.is_some() {
                    entry.audio_url = audio_url;
                }
                if error_detail.is_some() {
                    entry.error_detail = error_detail;
                }
                entry.raw_response = Some(body);
                updated_json = entry.to_json();
            }

            if TERMINAL_STATUSES.contains(&status.as_str()) {
                state.persist_jobs();
            }

            send_json_response(stream, 200, &updated_json);
        }
        Ok((code, body)) => {
            let mut err = json_err(
                body.get("detail")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Status check error"),
            );
            err.insert("status_code", JsonValue::Number(code as f64));
            send_json_response(stream, code, &err);
        }
        Err(e) => send_json_response(stream, 502, &json_err(&e)),
    }
}

fn handle_cancel_request(stream: &mut TcpStream, state: &Arc<AppState>, request_id: &str) {
    if let Ok(jobs) = state.jobs.read() {
        if let Some(existing) = jobs.get(request_id) {
            if existing.owner_id != "local-studio" {
                send_json_response(
                    stream,
                    403,
                    &json_err("Not authorized to cancel this request_id."),
                );
                return;
            }
        }
    }

    let Some((api_key, _)) = state.resolve_api_key() else {
        send_json_response(stream, 401, &json_err("Missing Higgsfield API key."));
        return;
    };

    match state.hf_client.cancel(&api_key, request_id) {
        Ok((code, body)) => {
            if code == 202 || code == 200 {
                if let Ok(mut jobs) = state.jobs.write() {
                    if let Some(job) = jobs.get_mut(request_id) {
                        job.status = "canceled".to_string();
                        job.updated_at = unix_now();
                    }
                }
                state.persist_jobs();
            }
            send_json_response(stream, code, &body);
        }
        Err(e) => send_json_response(stream, 502, &json_err(&e)),
    }
}

fn main() {
    let env_local = parse_env_file(".env.local");
    let env_default = parse_env_file(".env");

    let base_url = env_local
        .get("HF_API_BASE_URL")
        .or_else(|| env_default.get("HF_API_BASE_URL"))
        .cloned()
        .or_else(|| env::var("HF_API_BASE_URL").ok())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_API_BASE_URL.to_string());

    let port: u16 = env_local
        .get("PORT")
        .or_else(|| env_default.get("PORT"))
        .cloned()
        .or_else(|| env::var("PORT").ok())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(3000);

    let history_path = PathBuf::from(".higgsfield_history.json");
    let mut initial_jobs = HashMap::new();
    let mut initial_order = Vec::new();

    if let Ok(raw) = fs::read_to_string(&history_path) {
        if let Ok(parsed) = JsonValue::parse(&raw) {
            if let Some(arr) = parsed.as_array() {
                for item in arr {
                    if let Some(rec) = JobRecord::from_json(item) {
                        initial_order.push(rec.request_id.clone());
                        initial_jobs.insert(rec.request_id.clone(), rec);
                    }
                }
            }
        }
    }

    let state = Arc::new(AppState {
        hf_client: HiggsfieldClient::new(Some(base_url)),
        session_api_key: RwLock::new(None),
        jobs: RwLock::new(initial_jobs),
        job_order: RwLock::new(initial_order),
        catalog: get_bundled_catalog(),
        history_path,
    });

    let args: Vec<String> = env::args().collect();
    if args
        .iter()
        .any(|a| a == "--seedance" || a == "--example" || a == "--cli")
    {
        let code = run_seedance_cli_example(state);
        std::process::exit(code);
    }

    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).unwrap_or_else(|e| {
        eprintln!("Failed to bind local port {}: {}", addr, e);
        std::process::exit(1);
    });

    println!("┌──────────────────────────────────────────────────────────┐");
    println!("│  Higgsfield Rust Studio running at http://localhost:{} │", port);
    println!("│  CLI Seedance 2.5 test: cargo run -- --seedance          │");
    println!("└──────────────────────────────────────────────────────────┘");

    for stream in listener.incoming().flatten() {
        let st = Arc::clone(&state);
        thread::spawn(move || {
            handle_client(stream, st);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_parser_and_serializer_roundtrip() {
        let raw = r#"{"prompt":"Custom video","duration":5,"resolution":"720p","generate_audio":true,"image_urls":["https://example.com/a.png"]}"#;
        let parsed = JsonValue::parse(raw).expect("Should parse valid JSON");
        assert_eq!(
            parsed.get("prompt").and_then(|v| v.as_str()),
            Some("Custom video")
        );
        assert_eq!(parsed.get("duration").and_then(|v| v.as_f64()), Some(5.0));
        assert_eq!(
            parsed.get("generate_audio").and_then(|v| v.as_bool()),
            Some(true)
        );
        let serialized = parsed.to_json_string();
        let reparsed = JsonValue::parse(&serialized).expect("Should re-parse serialized JSON");
        assert_eq!(parsed, reparsed);
    }

    #[test]
    fn test_catalog_contains_required_models() {
        let catalog = get_bundled_catalog();
        assert!(!catalog.is_empty());
        let endpoints: Vec<&str> = catalog.iter().map(|m| m.endpoint).collect();
        assert!(endpoints.contains(&"bytedance/seedance-2.5/text-to-video"));
        assert!(endpoints.contains(&"bytedance/seedance-2.5/image-to-video"));
        assert!(endpoints.contains(&"bytedance/seedance-2.5/reference-to-video"));
        assert!(endpoints.contains(&"bytedance/seedance-2.5/video-edit"));
        assert!(endpoints.contains(&"higgsfield/genjutsu/motion-transfer/v1.0"));
        assert!(endpoints.contains(&"higgsfield/genjutsu/object-swap/v1.0"));
        assert!(endpoints.contains(&"higgsfield/genjutsu/restyle/v1.0"));
        assert!(endpoints.contains(&"higgsfield-ai/soul/v2/standard"));
        assert!(endpoints.contains(&"higgsfield/ai-influencer"));
        assert!(endpoints.contains(&"higgsfield-ai/soul-id"));
    }

    #[test]
    fn test_prepare_estimate_payload_fills_missing_required_fields() {
        let catalog = get_bundled_catalog();
        let raw = JsonValue::parse(r#"{"prompt":"","duration":10,"resolution":"1080p"}"#).unwrap();
        let prepared =
            prepare_estimate_payload(&raw, "bytedance/seedance-2.5/text-to-video", &catalog);
        assert_eq!(
            prepared.get("prompt").and_then(|v| v.as_str()),
            Some("cost estimate preview")
        );
        assert_eq!(
            prepared.get("duration").and_then(|v| v.as_f64()),
            Some(10.0)
        );
        assert_eq!(
            prepared.get("resolution").and_then(|v| v.as_str()),
            Some("1080p")
        );
    }

    #[test]
    fn test_auth_header_normalization() {
        let h1 = HiggsfieldClient::format_auth_header("my-id:my-secret").unwrap();
        assert_eq!(h1, "Key my-id:my-secret");
        let h2 = HiggsfieldClient::format_auth_header("Key my-id:my-secret").unwrap();
        assert_eq!(h2, "Key my-id:my-secret");
    }
}
