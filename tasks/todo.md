# Task Plan: Estimator & Reference Video Duration Fix + Status Persistence & Catalog Verification

## High-Level Summary
Fix the cost estimator and `/estimate` API integration across all models (especially Genjutsu reference-video duration detection & account discount math), persist job status transitions immediately to disk, add a manual status refresh button in the Studio Monitor, and fix out-of-sync model catalog endpoints/parameters.

## Checklist
- [x] **1. Reference Video Duration Auto-Detection & Manual Override (`static/app.js`, `static/styles.css`)**
  - [x] Probe local video file (`URL.createObjectURL(file)`) and pasted `video_url` metadata via an offscreen `<video preload="metadata">` element to auto-detect clip duration (`Math.ceil(video.duration)`, clamped `4–30s`).
  - [x] Render a compact **Reference Video Duration** control bar (`4s–30s` slider + quick chips `4s, 5s, 8s, 10s, 15s, 20s, 30s` + auto-detected badge) inside `video_url` dropzones for video-input models without an explicit `duration` field (such as Genjutsu Motion Transfer, Object Swap, and Restyle).
- [x] **2. Fix Live `/api/estimate` Response Parsing & Local Rate Table (`static/app.js`)**
  - [x] Fix inverted discount parsing bug in `runLiveApiEstimate()`: use top-level `data.usd` and `data.credits` (the actual net price charged) instead of `data.discount.usd` / `data.discount.credits` (which represent the 15% savings subtracted).
  - [x] Handle `{"type": "description", "pricing_description": "..."}` responses from `/api/estimate` (returned by Genjutsu, Seedance 2.5, Wan 3.0, Cinema Studio 4.0) so the badge updates to a verified state instead of staying stuck on `"Sincronizando /estimate..."`.
  - [x] Apply exact credit-to-USD conversion (`1 credit = $0.0625`, `16 credits = $1.00`) and account discount (`state.accountDiscountPct`) to Genjutsu (`15s` at `720p` = `$5.09` list / `$4.33` net with 15% discount, matching the `$4.32` API charge).
  - [x] Update local rate tables for Kling 3.0 Pro (`$0.0952–$0.1428/s`), LTX-2.5 Pro (`$0.12–$0.17/s`), Marketing Studio Image (`1k/2k/4k × low/medium/high`), Grok Imagine 2.0 (`$0.04–$0.08`), Recraft V4.1 Pro (`$0.21`), SOUL V2 (`$0.004–$0.006`), and AI Influencer (`$0.05` / `0.8 cr`).
- [x] **3. Fix Backend `/api/estimate` Payload Preparation & Catalog Schemas (`src/main.rs`, `src/catalog.rs`)**
  - [x] Update `prepare_estimate_payload()` in `src/main.rs` to populate placeholder `prompt`, `image_urls` (for `reference-to-video`), and `preset_id` (for `genjutsu/restyle`) when missing so `/estimate/<endpoint>` does not return `400 Bad Request` on empty forms.
  - [x] Fix 404 endpoint slugs in `src/catalog.rs`: `soul-id-creator` -> `"soul-id"` and `cinema-studio-4` -> `"higgsfield/cinema-studio/4.0"`.
  - [x] Fix parameter constraints in `src/catalog.rs`: `ltx-2.5-pro-t2v` duration (`min: 6, max: 10, step: 2`), `recraft-v4.1-pro` resolution (`["2k"]`), and `grok-imagine-2.0` quality (`["low", "medium"]`).
  - [x] Remove redundant `VERIFIED_MODEL_PATCHES` overrides in `static/app.js` so `src/catalog.rs` is the single source of truth.
- [x] **4. Status Persistence & Studio Monitor UX (`src/main.rs`, `static/app.js`, `static/styles.css`)**
  - [x] Persist `.higgsfield_history.json` immediately in `handle_poll_status()` whenever a job's status transitions (e.g. `queued` -> `in_progress`), not only on terminal states.
  - [x] Add a manual **"Atualizar Status ↻" / "Refresh Status ↻"** button in the Studio Monitor for active jobs (`queued` / `in_progress`) and avoid unnecessary DOM re-renders during background polling when status hasn't changed.
- [x] **5. Verification & Documentation**
  - [x] Run `cargo test` and `node --check static/app.js`.
  - [x] Update `README.md`, `README.pt-BR.md`, `AGENTS.md`, and `tasks/lessons.md`.
- [x] **6. Seedance 2.5 Reference Audio (`audio_urls`) & Official Schema Alignment (`src/catalog.rs`, `src/main.rs`, `static/app.js`)**
  - [x] Add `audio_urls` (`1..10` audio files) and `video_urls` (`1..10` videos) fields to `seedance-2.5-r2v`, `seedance-2.5-edit`, and `seedance-2.5-extend` in `src/catalog.rs`.
  - [x] Align all 5 Seedance 2.5 endpoints with `additionalProperties: false` (remove undocumented `output_format` from `i2v`/`r2v`/`edit`/`extend`, remove `duration` from `video-edit` so it uses the Reference Video Duration bar, and require `prompt` on `video-extend`).
  - [x] Render multi-file drag-and-drop / URL list dropzones for `audio_urls` and `video_urls` in `static/app.js` with PT-BR and EN localization.
  - [x] Add **"Seedance 2.5 Ref (+ Áudio) →" / "Seedance 2.5 Ref (+ Audio) →"** quick-action button on completed image outputs in the Studio Monitor to send generated character sheets directly into `seedance-2.5-r2v`.

