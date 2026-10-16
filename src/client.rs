use crate::json::JsonValue;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

pub const DEFAULT_API_BASE_URL: &str = "https://api.higgsfield.ai";
pub const TERMINAL_STATUSES: &[&str] = &["completed", "failed", "nsfw", "canceled"];

/// Generate a RFC-4122 UUID v4 using `/dev/urandom` with zero external dependencies.
pub fn generate_uuid_v4() -> String {
    let mut bytes = [0u8; 16];
    if let Ok(mut f) = File::open("/dev/urandom") {
        let _ = f.read_exact(&mut bytes);
    } else {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        for (i, b) in bytes.iter_mut().enumerate() {
            *b = ((nanos >> ((i % 8) * 8)) & 0xFF) as u8 ^ (i as u8 * 37);
        }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

/// Parse `.env` / `.env.local` files into a HashMap without logging or printing secrets.
pub fn parse_env_file(path: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let Ok(content) = fs::read_to_string(path) else {
        return map;
    };
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line.strip_prefix("export ").unwrap_or(line).trim();
        if let Some((k, v)) = line.split_once('=') {
            let key = k.trim().to_string();
            let mut val = v.trim().to_string();
            if (val.starts_with('"') && val.ends_with('"'))
                || (val.starts_with('\'') && val.ends_with('\''))
            {
                if val.len() >= 2 {
                    val = val[1..val.len() - 1].to_string();
                }
            }
            if !key.is_empty() {
                map.insert(key, val);
            }
        }
    }
    map
}

#[derive(Debug, Clone)]
pub struct PresignUploadResponse {
    pub upload_url: String,
    pub upload_headers: JsonValue,
    pub public_url: String,
}

#[derive(Debug, Clone)]
pub struct HiggsfieldClient {
    pub base_url: String,
}

impl HiggsfieldClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url
            .unwrap_or_else(|| DEFAULT_API_BASE_URL.to_string())
            .trim_end_matches('/')
            .to_string();
        Self { base_url }
    }

    /// Normalize the API key so `Authorization: Key <key-id:key-secret>` never duplicates `Key `.
    pub fn format_auth_header(raw_key: &str) -> Result<String, String> {
        let trimmed = raw_key.trim();
        if trimmed.is_empty() {
            return Err(
                "Missing Higgsfield API key. Set HF_API_KEY / HF_CREDENTIALS / HF_KEY in .env.local or click 'Connect API key' in the Studio UI."
                    .to_string(),
            );
        }
        let clean = trimmed
            .strip_prefix("Key ")
            .or_else(|| trimmed.strip_prefix("key "))
            .unwrap_or(trimmed)
            .trim();
        if clean.is_empty() {
            return Err("API key is empty.".to_string());
        }
        Ok(format!("Key {}", clean))
    }

    /// Execute an HTTPS request via `/usr/bin/curl -K -` passing headers and payload over `stdin`
    /// so credentials never appear in process arguments (`ps`) or logs.
    fn execute_https(
        &self,
        method: &str,
        url: &str,
        auth_header: &str,
        extra_headers: &[(&str, &str)],
        json_body: Option<&JsonValue>,
    ) -> Result<(u16, JsonValue), String> {
        let mut child = Command::new("/usr/bin/curl")
            .args([
                "-sS",
                "--max-time",
                "120",
                "-X",
                method,
                "-w",
                "\n__HTTP_STATUS__:%{http_code}",
                "--config",
                "-",
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn system curl: {}", e))?;

        let escape_curl_cfg = |s: &str| -> String {
            s.replace('\\', "\\\\")
                .replace('"', "\\\"")
                .replace('\n', "\\n")
                .replace('\r', "\\r")
        };

        let mut cfg = String::new();
        cfg.push_str(&format!("url = \"{}\"\n", escape_curl_cfg(url)));
        cfg.push_str(&format!(
            "header = \"Authorization: {}\"\n",
            escape_curl_cfg(auth_header)
        ));
        cfg.push_str("header = \"User-Agent: gerador-higgsfield-rust/0.1.0\"\n");

        for (hk, hv) in extra_headers {
            cfg.push_str(&format!(
                "header = \"{}: {}\"\n",
                escape_curl_cfg(hk),
                escape_curl_cfg(hv)
            ));
        }

        if let Some(body) = json_body {
            let body_str = body.to_json_string();
            cfg.push_str("header = \"Content-Type: application/json\"\n");
            cfg.push_str(&format!("data-raw = \"{}\"\n", escape_curl_cfg(&body_str)));
        }

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(cfg.as_bytes())
                .map_err(|e| format!("Failed writing curl config to stdin: {}", e))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed waiting for curl response: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(format!("Network error contacting Higgsfield API: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let (body_part, status_code) = if let Some((b, s)) = stdout.rsplit_once("\n__HTTP_STATUS__:")
        {
            let code = s.trim().parse::<u16>().unwrap_or(502);
            (b.trim(), code)
        } else {
            (stdout.trim(), 200)
        };

        if body_part.is_empty() {
            return Ok((status_code, JsonValue::obj()));
        }

        let parsed = JsonValue::parse(body_part).unwrap_or_else(|_| {
            let mut fallback = JsonValue::obj();
            fallback.insert("detail", JsonValue::Str(body_part.to_string()));
            fallback
        });

        Ok((status_code, parsed))
    }

    /// Submit a generation request to `POST https://api.higgsfield.ai/<model-path>`
    pub fn submit(
        &self,
        api_key: &str,
        endpoint: &str,
        payload: &JsonValue,
        idempotency_key: Option<String>,
    ) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let clean_endpoint = endpoint.trim().trim_start_matches('/');
        if clean_endpoint.is_empty() {
            return Err("Model endpoint path cannot be empty.".to_string());
        }
        let url = format!("{}/{}", self.base_url, clean_endpoint);
        let idem_key = idempotency_key.unwrap_or_else(generate_uuid_v4);

        self.execute_https(
            "POST",
            &url,
            &auth,
            &[("Idempotency-Key", &idem_key)],
            Some(payload),
        )
    }

    /// Poll status via `GET https://api.higgsfield.ai/requests/<request_id>/status`
    pub fn get_status(&self, api_key: &str, request_id: &str) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let url = format!("{}/requests/{}/status", self.base_url, request_id.trim());
        self.execute_https("GET", &url, &auth, &[], None)
    }

    /// Cancel a queued request via `POST https://api.higgsfield.ai/requests/<request_id>/cancel`
    pub fn cancel(&self, api_key: &str, request_id: &str) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let url = format!("{}/requests/{}/cancel", self.base_url, request_id.trim());
        let (code, mut body) = self.execute_https("POST", &url, &auth, &[], None)?;
        if body.as_object().map(|m| m.is_empty()).unwrap_or(false) {
            body.insert(
                "status",
                JsonValue::Str(if code == 202 { "canceled" } else { "unknown" }.to_string()),
            );
            body.insert("request_id", JsonValue::Str(request_id.to_string()));
        }
        Ok((code, body))
    }

    /// Estimate cost via `POST https://api.higgsfield.ai/estimate/<model-path>`
    pub fn estimate(
        &self,
        api_key: &str,
        endpoint: &str,
        payload: &JsonValue,
    ) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let clean_endpoint = endpoint.trim().trim_start_matches('/');
        let url = format!("{}/estimate/{}", self.base_url, clean_endpoint);
        self.execute_https("POST", &url, &auth, &[], Some(payload))
    }

    /// Request a presigned upload URL from `POST https://api.higgsfield.ai/files/generate-upload-url`
    /// Never logs `upload_url`.
    pub fn generate_upload_url(
        &self,
        api_key: &str,
        content_type: &str,
    ) -> Result<PresignUploadResponse, String> {
        let auth = Self::format_auth_header(api_key)?;
        let url = format!("{}/files/generate-upload-url", self.base_url);
        let mut req_body = JsonValue::obj();
        req_body.insert("content_type", JsonValue::Str(content_type.to_string()));

        let (code, body) = self.execute_https("POST", &url, &auth, &[], Some(&req_body))?;
        if !(200..300).contains(&code) {
            return Err(format!(
                "Upload URL generation failed (HTTP {}): {}",
                code, body
            ));
        }

        let upload_url = body
            .get("upload_url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing upload_url in response".to_string())?
            .to_string();

        let public_url = body
            .get("public_url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing public_url in response".to_string())?
            .to_string();

        let upload_headers = body
            .get("upload_headers")
            .cloned()
            .unwrap_or_else(JsonValue::obj);

        Ok(PresignUploadResponse {
            upload_url,
            upload_headers,
            public_url,
        })
    }

    /// Fetch account-enabled models via `GET https://api.higgsfield.ai/models`
    pub fn list_account_models(&self, api_key: &str) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let url = format!("{}/models", self.base_url);
        self.execute_https("GET", &url, &auth, &[], None)
    }

    /// Fetch Soul V2 curated styles via `GET https://api.higgsfield.ai/v1/text2image/soul-styles/v2`
    pub fn list_soul_styles(&self, api_key: &str) -> Result<(u16, JsonValue), String> {
        let auth = Self::format_auth_header(api_key)?;
        let url = format!("{}/v1/text2image/soul-styles/v2", self.base_url);
        self.execute_https("GET", &url, &auth, &[], None)
    }

    /// Synchronous `subscribe` workflow (equivalent to SDK `higgsfield.subscribe`)
    /// Submits a generation request and polls with 2s -> 10s exponential backoff until terminal status.
    pub fn subscribe(
        &self,
        api_key: &str,
        endpoint: &str,
        payload: &JsonValue,
        timeout: Duration,
    ) -> Result<JsonValue, String> {
        let idem_key = generate_uuid_v4();
        let (status_code, submit_body) =
            self.submit(api_key, endpoint, payload, Some(idem_key))?;

        if status_code >= 300 {
            let detail = submit_body
                .get("detail")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| submit_body.to_string());
            return Err(format!(
                "Submission rejected (HTTP {}): {}",
                status_code, detail
            ));
        }

        let request_id = submit_body
            .get("request_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| format!("Missing request_id in response: {}", submit_body))?
            .to_string();

        println!(
            "Request accepted -> request_id: {} (status: {})",
            request_id,
            submit_body
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("queued")
        );

        let started = Instant::now();
        let mut delay_secs = 2.0_f64;

        loop {
            if started.elapsed() > timeout {
                return Err(format!(
                    "Polling timed out after {}s for request_id={}",
                    timeout.as_secs(),
                    request_id
                ));
            }

            thread::sleep(Duration::from_secs_f64(delay_secs));

            match self.get_status(api_key, &request_id) {
                Ok((code, status_body)) if code < 300 => {
                    let st = status_body
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");

                    println!("[{:>5.1}s] status: {}", started.elapsed().as_secs_f64(), st);

                    if TERMINAL_STATUSES.contains(&st) {
                        return Ok(status_body);
                    }
                }
                Ok((code, status_body)) if code >= 500 => {
                    eprintln!(
                        "Transient HTTP {} while polling request {}; retrying...",
                        code, status_body
                    );
                }
                Ok((code, status_body)) => {
                    return Err(format!("Polling failed with HTTP {}: {}", code, status_body));
                }
                Err(net_err) => {
                    eprintln!("Network glitch while polling ({}); retrying...", net_err);
                }
            }

            delay_secs = (delay_secs * 1.5).min(10.0);
        }
    }
}
