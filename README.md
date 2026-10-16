# Gerador Higgsfield · Local Rust Studio & CLI

**[🇺🇸 Read in English](#english)** · **[🇧🇷 Ler em Português (PT-BR)](#português-pt-br)** · **[📄 README.pt-BR.md](README.pt-BR.md)**

---

<a id="english"></a>

## 🇺🇸 English

An ultra-fast, zero-dependency local Rust application (`std::net::TcpListener` + native TLS) for generating videos, edits, editorial images, character sheets, and audio-driven media through the [Higgsfield API](https://docs.higgsfield.ai/docs).

Designed to run **100% locally on your machine** (`http://localhost:3000`) with a bilingual interface (**PT-BR** / **EN**). Each user simply connects their own Higgsfield API key and starts generating immediately.

### 🔒 Privacy & Local-Only Data

- **API Key (`HF_API_KEY`):** Stored strictly on your own computer in `.env.local` (with `0600` owner-only permissions) or in server RAM for the active session. It is **never** sent to the browser frontend, **never** logged, and **never** committed to Git.
- **Generation History:** Your generated videos, images, prompts, and request IDs are saved locally in `.higgsfield_history.json` on your computer (also git-ignored and restricted to `0600` permissions).
- **Zero Telemetry:** Requests go directly from your local Rust server to `https://api.higgsfield.ai`.

### Included Models & Workflows

- **Seedance 2.5 (ByteDance):**
  - `bytedance/seedance-2.5/text-to-video` (Text to Video with native audio)
  - `bytedance/seedance-2.5/image-to-video` (Image to Video + optional end frame)
  - `bytedance/seedance-2.5/reference-to-video` (Multimodal Reference to Video)
  - `bytedance/seedance-2.5/video-edit` (Natural-language Video Edit)
  - `bytedance/seedance-2.5/video-extend` (Video Continuation / Extend)
- **Higgsfield Genjutsu (Video Editing & Motion):**
  - `higgsfield/genjutsu/motion-transfer/v1.0` (Motion Transfer with 1-8 reference images)
  - `higgsfield/genjutsu/object-swap/v1.0` (Object & Product Swap in footage)
  - `higgsfield/genjutsu/restyle/v1.0` (Video Restyle)
- **Higgsfield Soul V2 & Character Creator:**
  - `higgsfield-ai/soul/v2/standard` (SOUL V2 Text-to-Image with 33 curated styles & `custom_reference_id` Soul ID lock)
  - `higgsfield-ai/soul/v2/image-to-image` (SOUL V2 Image-to-Image)
  - `higgsfield-ai/soul/cinema` (SOUL Cinema Widescreen Stills)
  - `higgsfield/ai-influencer` (AI Influencer Character Sheet Creator)
  - `higgsfield-ai/soul-id` (Soul ID Custom Character Reference)
- **Additional Video, Image & Audio Models:**
  - `higgsfield/cinema-studio/v4.0`, `kling-video/v3.0/pro/text-to-video`, `lightricks/ltx-2.5/text-to-video/pro`, `marketing-studio/image`, `recraft/v4.1/pro/text-to-image`, `xai/grok-imagine-image-2.0`, `v1/speak/higgsfield` (Speak v2 Audio-to-Video), plus a **Custom Endpoint** mode for any model path.

### 1. Configure Your Higgsfield API Key

You can either:
1. Start the app, open `http://localhost:3000`, and click **Connect API key** in the sidebar (it saves to `.env.local` on your computer automatically), **or**
2. Copy `.env.example` to `.env.local` (which is git-ignored) and paste your key from [open.higgsfield.ai/api-keys](https://open.higgsfield.ai/api-keys) in `key-id:key-secret` format:

```bash
cp .env.example .env.local
```

```dotenv
HF_API_KEY=your-key-id:your-key-secret
```

### 2. How to Start the App (Rust Cargo vs. Node/npm)

If you are used to Node.js (`npm run dev`), a `package.json` wrapper is included so both workflows work identically:

| Action | Rust (`cargo`) Command | Node-style (`npm`) Shortcut | What it does |
| :--- | :--- | :--- | :--- |
| **Start Dev Server** | `cargo run` | `npm run dev` | Compiles in debug mode (~0.5s) and starts `http://localhost:3000` |
| **Start Optimized Release Server** | `cargo run --release` | `npm start` | Runs the optimized release binary at `http://localhost:3000` |
| **Run Seedance 2.5 CLI Test** | `cargo run -- --seedance` | `npm run seedance` | Submits the Seedance 2.5 Sunset (5s, 720p, 16:9) CLI example and polls until completion |
| **Run Unit Tests** | `cargo test` | `npm test` | Runs the Rust test suite |

---

<a id="português-pt-br"></a>

## 🇧🇷 Português (PT-BR)

Uma aplicação local ultra-rápida em Rust sem dependências externas (`std::net::TcpListener` + TLS nativo) para gerar vídeos, edições, imagens editoriais, fichas de personagem e mídia guiada por áudio através da [API da Higgsfield](https://docs.higgsfield.ai/docs).

Projetado para rodar **100% localmente no seu computador** (`http://localhost:3000`) com interface bilíngue (**PT-BR** / **EN**). Cada usuário apenas conecta sua própria chave de API da Higgsfield e já pode começar a gerar imediatamente.

### 🔒 Privacidade & Dados Apenas no Seu Computador

- **Chave de API (`HF_API_KEY`):** Salva exclusivamente no seu próprio computador dentro de `.env.local` (com permissão restrita `0600`) ou apenas na memória RAM da sessão. A chave **nunca** é exposta ao navegador, **nunca** aparece em logs e **nunca** vai para o Git.
- **Histórico de Gerações:** Seus vídeos, imagens, prompts e IDs de requisição ficam salvos apenas localmente no arquivo `.higgsfield_history.json` na sua máquina (também ignorado pelo `.gitignore` e protegido com permissão `0600`).
- **Zero Telemetria:** As requisições vão diretamente do seu servidor local em Rust para `https://api.higgsfield.ai`.

### Modelos & Fluxos Incluídos

- **Seedance 2.5 (ByteDance):**
  - `bytedance/seedance-2.5/text-to-video` (Texto para Vídeo com áudio nativo)
  - `bytedance/seedance-2.5/image-to-video` (Imagem para Vídeo + frame final opcional)
  - `bytedance/seedance-2.5/reference-to-video` (Referência Multimodal para Vídeo)
  - `bytedance/seedance-2.5/video-edit` (Edição de Vídeo por linguagem natural)
  - `bytedance/seedance-2.5/video-extend` (Continuação / Extensão de Vídeo)
- **Higgsfield Genjutsu (Edição de Vídeo & Movimento):**
  - `higgsfield/genjutsu/motion-transfer/v1.0` (Transferência de Movimento com 1 a 8 imagens de referência)
  - `higgsfield/genjutsu/object-swap/v1.0` (Troca de Objeto e Produto em vídeo)
  - `higgsfield/genjutsu/restyle/v1.0` (Restyle de Vídeo)
- **Higgsfield Soul V2 & Criador de Personagens:**
  - `higgsfield-ai/soul/v2/standard` (SOUL V2 Texto-para-Imagem com 33 estilos curados e trava de personagem `custom_reference_id` Soul ID)
  - `higgsfield-ai/soul/v2/image-to-image` (SOUL V2 Imagem-para-Imagem)
  - `higgsfield-ai/soul/cinema` (SOUL Cinema Widescreen Stills)
  - `higgsfield/ai-influencer` (Criador de Character Sheet para AI Influencer)
  - `higgsfield-ai/soul-id` (Treinamento/Referência de Personagem Soul ID)
- **Modelos Adicionais de Vídeo, Imagem & Áudio:**
  - `higgsfield/cinema-studio/v4.0`, `kling-video/v3.0/pro/text-to-video`, `lightricks/ltx-2.5/text-to-video/pro`, `marketing-studio/image`, `recraft/v4.1/pro/text-to-image`, `xai/grok-imagine-image-2.0`, `v1/speak/higgsfield` (Speak v2 Áudio-para-Vídeo), além do modo **Endpoint Personalizado** para qualquer modelo da plataforma.

### 1. Configure Sua Chave de API da Higgsfield

Você pode escolher uma das opções abaixo:
1. Iniciar o app, abrir `http://localhost:3000` e clicar em **Conectar chave API** na barra lateral da interface Web (ela salva automaticamente no `.env.local` do seu computador), **ou**
2. Copiar o arquivo `.env.example` para `.env.local` (que é ignorado pelo Git) e colar sua chave completa obtida em [open.higgsfield.ai/api-keys](https://open.higgsfield.ai/api-keys) no formato `key-id:key-secret`:

```bash
cp .env.example .env.local
```

```dotenv
HF_API_KEY=seu-key-id:seu-key-secret
```

### 2. Como Iniciar o App (Rust Cargo vs. Node/npm)

Se você está acostumado com Node.js (`npm run dev`), incluímos um `package.json` com atalhos para que ambos os fluxos funcionem de forma idêntica:

| Ação | Comando Rust (`cargo`) | Atalho estilo Node (`npm`) | O que faz |
| :--- | :--- | :--- | :--- |
| **Iniciar Servidor Dev** | `cargo run` | `npm run dev` | Compila em modo debug (~0.5s) e inicia `http://localhost:3000` |
| **Iniciar Servidor Otimizado (Release)** | `cargo run --release` | `npm start` | Executa o binário otimizado em `http://localhost:3000` |
| **Rodar Teste CLI Seedance 2.5** | `cargo run -- --seedance` | `npm run seedance` | Envia o exemplo de geração Seedance 2.5 Sunset (5s, 720p, 16:9) via CLI e acompanha até concluir |
| **Rodar Testes Unitários** | `cargo test` | `npm test` | Executa a suíte de testes em Rust |
