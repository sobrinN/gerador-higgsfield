# Lessons Learned (`tasks/lessons.md`)

## 1. Higgsfield `/estimate/<endpoint>` Response Contract
- **Two Distinct Response Types:**
  1. **`"type": "estimate"`** (returned by Kling 3.0 Pro, LTX-2.5 Pro, SOUL V2, SOUL Cinema, AI Influencer, Recraft V4.1 Pro, Grok Imagine 2.0, Marketing Studio Image):
     ```json
     {
       "type": "estimate",
       "credits": "11.424",
       "usd": "0.714",
       "discount": {
         "percentage": "15.00",
         "credits": "2.016",
         "usd": "0.126"
       }
     }
     ```
     - **Critical Invariant:** Top-level `data.usd` and `data.credits` are **already the net discounted price charged** to the account. `data.discount.usd` and `data.discount.credits` are the **savings subtracted** (`15%`), NOT the final price.
  2. **`"type": "description"`** (returned by Genjutsu `motion-transfer/v1.0`, `object-swap/v1.0`, `restyle/v1.0`, Seedance 2.5, Wan 3.0, and Cinema Studio 4.0):
     ```json
     {
       "type": "description",
       "pricing_description": "Costs from 2.16 to 11.1 credits per second of video depending on resolution."
     }
     ```
     - These endpoints do not return numeric `usd` or `credits` from `/estimate` because their billing depends on dynamic media inspection (such as the duration of the uploaded reference video `video_url`). The frontend must handle `data.type === "description"` explicitly so the cost badge does not remain stuck on `"Syncing /estimate..."`.

## 2. Reference Video Duration in Video-to-Video Models (Genjutsu)
- Models like `higgsfield/genjutsu/motion-transfer/v1.0`, `object-swap/v1.0`, and `restyle/v1.0` have no `duration` parameter in their API request schema; they bill per whole second of the input `video_url` (`Math.ceil(video.duration)`, clamped to `4–30s`).
- Hardcoding a fallback of `5s` when `v.duration` is absent causes a `15s` reference clip at `720p` (`$5.09` list / `$4.32` with 15% discount) to be underestimated by 3× (`$1.70`).
- **Solution:** Probe local files immediately via `URL.createObjectURL(file)` and remote URLs via an offscreen `<video preload="metadata">` element, and provide a visible **Source Video Duration (`4s–30s`)** slider/chip bar inside `video_url` dropzones.

## 3. Single Source of Truth for Model Schemas
- Keeping a large client-side `VERIFIED_MODEL_PATCHES` object in `static/app.js` alongside `src/catalog.rs` causes silent schema drift (for example, `static/app.js` overwriting `ltx-2.5-pro-t2v` duration back to `5s` when the API only accepts `[6, 8, 10]`). Keep all model schemas consolidated in `src/catalog.rs`.

## 4. Seedance 2.5 API Schemas (`additionalProperties: false` & Reference Audio)
- All 5 Seedance 2.5 endpoints (`text-to-video`, `image-to-video`, `reference-to-video`, `video-edit`, `video-extend`) enforce `"additionalProperties": false` in their official JSON schemas:
  - `bytedance/seedance-2.5/image-to-video` **only** accepts `image_url`, `end_image_url`, `prompt`, `duration`, `resolution`, `bitrate_mode`, and `generate_audio` (no `audio_urls`, no `output_format`).
  - To combine **Reference Image(s) + Reference Audio** (or Reference Video), use `bytedance/seedance-2.5/reference-to-video`, which accepts `image_urls` (`1..30`), `audio_urls` (`1..10`, normalized up to 30s total), and `video_urls` (`1..10`, normalized up to 30s total).
  - `bytedance/seedance-2.5/video-edit` and `video-extend` also accept `image_urls`, `audio_urls`, and `video_urls` alongside the required `video_url` and `prompt`. Furthermore, `video-edit` derives its duration from the source `video_url` and must **not** send `duration`.

## 5. Wan 3.0 & Wan 3.0 Prime `reference-to-video` Schema (`video_urls` vs `video_url` & `aspect_ratio`)
- **Plural `video_urls` Required:** `alibaba/wan-3.0-prime/reference-to-video` and `alibaba/wan-3.0/reference-to-video` expect **`video_urls`** (an array of 1–5 video URLs, 1–30s each, 30s total, referenced in prompts as `@Video1`, `@Video2`, etc.) — **NOT** singular `"video_url"`. Because Wan 3.0's JSON schema does not enforce `additionalProperties: false`, sending `"video_url": "https://..."` does not return HTTP 422; instead, the API **silently ignores `"video_url"`** and renders from `image_urls` + `prompt` alone.
- **Supported `aspect_ratio` Enum & `adaptive` Default:** All 6 Wan 3.0 / Wan 3.0 Prime endpoints accept `["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"]` (default `"adaptive"`; `"21:9"` is not supported). When referencing or editing a video (`@Video1`), keeping `aspect_ratio: "adaptive"` automatically preserves the reference media's framing.
- **Additional Multimodal References:** `reference-to-video` also accepts `audio_urls` (up to 5 WAV/MP3 files, 30s total), `file_url` (1 document `docx/xlsx/pptx/pdf/md`, forces deep thinking), and `link_url` (1 web page, not combinable with `file_url`), while `image-to-video` accepts both `image_url` (First Frame) and optional `end_image_url` (Last Frame).

## 6. Avoid Full `renderFormFields()` Inside Async Media Upload / Metadata Probing Callbacks
- **Root Cause:** When uploading local files in `video_urls` (`handleMultipleFiles`), `probeVideoDuration(files[0])` reads local `Blob` metadata in ~5–15ms while `await uploadReferenceFile(f)` is still uploading to `/api/upload` + S3/R2 (~1–3s). Calling `renderFormFields()` inside `probeVideoDuration`'s callback wipes `dynamicFieldsContainer.innerHTML = ""` mid-upload. When `uploadReferenceFile` resolves afterward, `state.formValues.video_urls.push(publicUrl)` succeeds (and the toast fires), but `renderChips()` mutates the **detached `listContainer` DOM node** from before `renderFormFields()`, leaving the visible dropzone empty on screen.
- **Solution:** Never call `renderFormFields()` from async metadata probes; update the duration slider/badge/preset chips in-place via `syncDurationFieldInDOM(billedSec)`, and render visual `@Video1` / `@Image1` / `@Audio1` chips with media thumbnails and duration badges inside `listContainer`.



