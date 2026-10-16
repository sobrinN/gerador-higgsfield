# AGENTS.md — Gerador Higgsfield (Local Rust Studio & CLI)

Concise architectural and operational guide for AI coding agents working on this repository.

---

## 1. Project Overview & Core Philosophy

**Gerador Higgsfield** is a **100% local, zero-external-crate Rust application** (`edition = "2021"`) paired with a vanilla HTML/CSS/JS bilingual (**PT-BR** / **EN**) Web Studio and CLI for the [Higgsfield API](https://docs.higgsfield.ai/docs).

- **Zero External Cargo Dependencies:** Compiles in `<0.5s` using pure `std` (`std::net::TcpListener`, `Arc<RwLock<...>>`) + native OS `/usr/bin/curl` over `stdin` (`--config -`) for TLS. Do **not** add bloated crates (`tokio`, `reqwest`, `serde`, etc.) unless explicitly requested by the user.
- **Local-First & Multi-User Ready (Clone & Run):** Every user runs the server on `http://127.0.0.1:3000` on their own machine, connects their own Higgsfield API key (`key-id:key-secret`), and keeps their credentials and generation history strictly on their local disk.

---

## 2. Project Structure & File Responsibilities

```text
gerador-higgsfield/
├── Cargo.toml                 # Zero-dependency Rust package manifest
├── package.json               # Convenience npm scripts wrapping cargo commands
├── .env.example               # Template for local environment variables (safe to commit)
├── .gitignore                 # Blocks secrets (.env*), history (.higgsfield_history*), target/, & media
├── README.md                  # Bilingual (EN + PT-BR) documentation
├── README.pt-BR.md            # Standalone Portuguese (PT-BR) documentation
├── AGENTS.md                  # Agent context, architecture & invariants (this file)
│
├── src/                       # Rust Backend & CLI (Pure std)
│   ├── main.rs                # Entry point, CLI (--seedance), HTTP server/router, AppState & job persistence
│   ├── client.rs              # HiggsfieldClient: HTTPS via `curl --config -` (stdin), presign, poll, cancel
│   ├── catalog.rs             # Bundled catalog of 22+ Higgsfield models, field schemas & options
│   └── json.rs                # Custom zero-dependency recursive JSON parser & serializer (JsonValue)
│
├── static/                    # Vanilla Web UI (No bundler/build step required)
│   ├── index.html             # App shell, sidebar, form workspace, job monitor & API key modal
│   ├── styles.css             # Dark-mode Studio styling & responsive layout
│   └── app.js                 # Frontend state, i18n (PT-BR/EN), dynamic form renderer, polling & code snippets
│
└── [Local-Only / Git-Ignored Runtime Files]
    ├── .env.local             # User's local HF_API_KEY (chmod 0600, NEVER committed)
    └── .higgsfield_history.json # User's local generation history (chmod 0600, NEVER committed)
```

---

## 3. Request & Data Flow

```text
┌──────────────────────────────┐        HTTP (127.0.0.1:3000)        ┌──────────────────────────────┐
│   Browser UI (static/app.js) │ ──────────────────────────────────► │  Rust Server (src/main.rs)   │
│  - Bilingual (PT-BR / EN)    │ ◄────────────────────────────────── │  - Resolves key in RAM/.env  │
│  - Never receives raw API key│    JSON status, models, job URLs    │  - Sanitizes model payloads  │
└──────────────────────────────┘                                     └──────────────┬───────────────┘
                                                                                    │
                                                    spawns /usr/bin/curl --config - │ (stdin pipes Auth header)
                                                                                    ▼
┌──────────────────────────────┐                                     ┌──────────────────────────────┐
│ Local Disk (chmod 0600)      │ ◄─── Persists jobs & API key ────── │  HiggsfieldClient (client.rs)│
│  - .env.local                │                                     │  - POST /<endpoint>          │
│  - .higgsfield_history.json  │                                     │  - GET  /requests/<id>/status│
└──────────────────────────────┘                                     └──────────────┬───────────────┘
                                                                                    │ HTTPS
                                                                                    ▼
                                                                     ┌──────────────────────────────┐
                                                                     │  https://api.higgsfield.ai   │
                                                                     └──────────────────────────────┘
```

---

## 4. Backend HTTP API Endpoints (`src/main.rs`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/config` | Returns `{ has_key, key_source, base_url }` (never returns the key value). |
| `POST` | `/api/key` | Saves API key to session RAM and (optionally) `.env.local` with `0600` permissions. |
| `DELETE` | `/api/key` | Clears API key from session RAM, environment, and `.env.local`. |
| `GET` | `/api/models` | Returns the bundled catalog from `src/catalog.rs`. |
| `GET` | `/api/account-models` | Proxies `GET /models` on Higgsfield API using server-side key. |
| `GET` | `/api/soul-styles` | Proxies `GET /v1/text2image/soul-styles/v2` for SOUL V2 style presets. |
| `POST` | `/api/estimate` | Fills missing required fields via `prepare_estimate_payload()` and calls `POST /estimate/<endpoint>`. |
| `POST` | `/api/generate` | Validates required fields, sanitizes payload (`sanitize_input_payload()`), submits job, and persists to `.higgsfield_history.json`. |
| `POST` | `/api/upload` | Requests a presigned upload URL (`POST /files/generate-upload-url`) for reference media. |
| `GET` | `/api/jobs` | Returns local generation history ordered newest-first. |
| `GET` | `/api/requests/<id>/status` | Polls Higgsfield status (`queued`, `in_progress`, `completed`, `failed`, `nsfw`, `canceled`) and updates history. |
| `POST` | `/api/requests/<id>/cancel` | Cancels an active/queued request (`POST /requests/<id>/cancel`). |

---

## 5. Strict Security & Privacy Invariants

1. **Never Expose or Commit Secrets:**
   - Never log, print, or return `HF_API_KEY`, `HF_CREDENTIALS`, `HF_KEY`, or presigned `upload_url` values in stdout, stderr, or HTTP responses.
   - Keep `curl --config -` over `stdin` in `src/client.rs` so the `Authorization: Key <id:secret>` header never appears in OS process arguments (`ps`).
   - `.env.local` and `.higgsfield_history.json` must remain in `.gitignore` and use `0600` permissions (`set_owner_only_permissions` in `src/main.rs`).
2. **Pre-Commit Verification:**
   - Before any `git commit`, always verify `git status --ignored -s` to ensure `.env.local`, `.higgsfield_history.json`, and any local media files remain untracked/ignored.

---

## 6. How to Add or Modify Models & UI Text

1. **Adding/Updating a Model (`src/catalog.rs`):**
   - Add or update a `ModelEntry` inside `get_bundled_catalog()` with its `id`, `endpoint`, `category` (`video`, `edit`, `image`, `character`, `audio`), and `fields` (`ModelField`).
   - If the model has conditional payload rules (e.g., fields that should be stripped unless another field is set), update `sanitize_input_payload()` in `src/main.rs`.
2. **Bilingual UI (`static/app.js` & `static/index.html`):**
   - The UI supports **Português (`pt-br`)** and **English (`en`)** via the `I18N` dictionary, `FIELD_LABELS_PT`, `FIELD_DESC_PT`, and `MODEL_DESC_PT` maps in `static/app.js`.
   - When adding new UI strings, models, or fields, provide translations in both `pt-br` and `en`.

---

## 7. Build, Run & Test Commands

| Task | Cargo Command | npm Shortcut |
| :--- | :--- | :--- |
| **Run Dev Server (`:3000`)** | `cargo run` | `npm run dev` |
| **Run Release Server** | `cargo run --release` | `npm start` |
| **Run Unit Tests** | `cargo test` | `npm test` |
| **Run CLI E2E Example** | `cargo run -- --seedance` | `npm run seedance` |
