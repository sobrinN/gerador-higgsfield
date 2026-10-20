(() => {
  const TERMINAL_STATUSES = new Set(["completed", "failed", "nsfw", "canceled"]);

  const state = {
    lang: localStorage.getItem("hf_studio_lang") || "pt-br",
    hasKey: false,
    keySource: "none",
    baseUrl: "https://api.higgsfield.ai",
    models: [],
    selectedCategory: "all",
    searchQuery: "",
    activeModel: null,
    formValues: {},
    refVideoDuration: 5,
    refVideoRawDuration: null,
    accountDiscountPct: 15,
    activeCodeTab: "json",
    jobs: [],
    activeStageJobId: null,
    pollingTimers: new Map(),
    elapsedTimerId: null,
    estimateDebounceTimer: null,
    estimateRequestSeq: 0,
    isSubmitting: false,
  };

  // ==========================================
  // BILINGUAL LOCALIZATION DICTIONARIES (PT-BR default + EN)
  // ==========================================
  const UI_I18N = {
    "pt-br": {
      pageTitle: "Higgsfield Studio · Motor Nativo em Rust",
      checkingKey: "Verificando chave...",
      serverUnreachable: "Servidor inacessível",
      apiKeySaved: "Chave API salva",
      apiKeyEnvSub:
        "Carregada do <code>.env.local</code> no servidor. Salvar não comprova validade.",
      apiKeySessionSub: "Salva na memória da sessão do servidor.",
      noApiKey: "Nenhuma chave API configurada",
      noApiKeySub:
        "Conecte sua chave ou defina <code>HF_API_KEY</code> no <code>.env.local</code>.",
      connectApiKey: "Conectar chave API",
      manageApiKey: "Gerenciar chave API",
      replaceApiKey: "Substituir chave API",
      saveApiKey: "Salvar chave API",
      removeApiKey: "Remover chave API",
      cancel: "Cancelar",
      searchPlaceholder: "Buscar Seedance, Wan 3.0, Genjutsu, Soul...",
      catAll: "Todos",
      catVideo: "Vídeo",
      catEdit: "Genjutsu & Edição",
      catImage: "Soul & Imagem",
      catCharacter: "Personagem",
      catAudio: "Áudio",
      exploreAccountCatalog: "Explorar Catálogo da Conta",
      rateTier: "FAIXA DE PREÇO",
      apiDocs: "Docs da API ↗",
      directorControls: "Controles de Direção",
      soulStylesBtn: "Estilos Soul V2 (33)",
      requestCodeBtn: "Código da Requisição",
      soulStylesDrawerTitle: "Selecione um Estilo Curado do Soul V2",
      codeTabJson: "Payload JSON",
      customOverrideLabel: "Editar JSON Manualmente",
      copyBtn: "Copiar",
      estimatedCostEyebrow: "CUSTO ESTIMADO",
      instantTierCalc: "Cálculo Instantâneo",
      syncingEstimate: "Sincronizando /estimate...",
      verifiedAccountQuote: "Cotação Verificada da Conta",
      verifiedRateTable: "Tabela Verificada /estimate",
      accountQuoteDiscount: (pct) => `Cotação da Conta (${pct}% off)`,
      creditsUnit: "créditos",
      billingFootnote:
        "Apenas execuções <code>completed</code> consomem créditos · <code>failed</code>, <code>nsfw</code> e <code>canceled</code> na fila são estornados · retenção de 7+ dias na CDN",
      generateMedia: "Gerar Mídia",
      submitting: "Enviando...",
      studioMonitor: "Monitor do Estúdio",
      idle: "Ocioso",
      activeCount: (n) => `${n} ativo(s)`,
      renderQueueTitle: "Fila de Renderização & Histórico",
      historyRetentionHint: "Arquivos retidos por 7+ dias na CDN",
      keyModalInstruction:
        'Cole a chave de API copiada de <a href="https://open.higgsfield.ai/api-keys" target="_blank" rel="noopener noreferrer">open.higgsfield.ai</a> exatamente como está.',
      apiKeyFieldLabel: "Chave de API da Higgsfield",
      apiKeyFieldHint:
        "Mantida estritamente no servidor. Enviada como <code>Authorization: Key &lt;api-key&gt;</code>.",
      persistEnvLocalLabel:
        "Salvar no arquivo local <code>.env.local</code> (ignorado pelo Git)",
      accountModelsTitle: "Catálogo de Modelos da Conta (GET /models)",
      accountModelsInstruction:
        "Clique em qualquer endpoint habilitado na sua conta Higgsfield para carregá-lo diretamente no estúdio.",
      requiredTag: "OBRIGATÓRIO",
      verifyAccessSuffix: "Verificar Acesso",
      dropSingleMedia: (fmt) =>
        `Arraste e solte mídia local (${fmt}) ou cole uma URL pública`,
      dropMultiImages:
        "Arraste e solte múltiplas imagens de referência (PNG · JPG · WEBP) ou adicione URLs",
      dropMultiAudios:
        "Arraste e solte arquivos de áudio de referência (WAV · MP3 · M4A) ou adicione URLs",
      dropMultiVideos:
        "Arraste e solte vídeos de referência (MP4 · MOV · WEBM) ou adicione URLs",
      browseFile: "Escolher Arquivo",
      browseFiles: "Escolher Arquivos",
      addUrl: "Adicionar URL",
      uploading: "Enviando...",
      uploadedSingleToast: "Arquivo de referência enviado para o armazenamento Higgsfield.",
      uploadedMultiToast: (n) => `${n} arquivo(s) de referência enviado(s).`,
      framePreviewTag: (r) => `PREVIEW DO QUADRO ${r}`,
      viewfinderIdleSub:
        "Configure os parâmetros à esquerda e pressione Gerar Mídia.",
      estPrefix: "EST:",
      animateSeedance: "Animar no Seedance 2.5 I2V →",
      animateSeedanceR2v: "Seedance 2.5 Ref (+ Áudio) →",
      animateWan: "Animar no Wan 3.0 Prime I2V →",
      useGenjutsu: "Usar no Genjutsu Motion →",
      elapsedSuffix: "s decorridos",
      statusPrefix: "Status:",
      pollingSub: (id) =>
        `Consultando <code>/requests/${id}/status</code> automaticamente...`,
      cancelQueuedBtn: "Cancelar Requisição na Fila",
      refreshStatusBtn: "Atualizar Status ↻",
      refreshingStatus: "Consultando...",
      statusRefreshedToast: (st) => `Status na Higgsfield: ${st}`,
      terminalStatePrefix: "Estado Final:",
      terminalErrorFallback:
        "A requisição terminou sem gerar mídia. Requisições com falha, NSFW ou canceladas não são cobradas.",
      framePreviewBtn: "Preview do Quadro",
      openDownloadBtn: "Abrir / Baixar Arquivo ↗",
      emptyQueueHint: "Nenhuma requisição enviada neste estúdio ainda.",
      inspectBtn: "Inspecionar",
      cancelShortBtn: "Cancelar",
      connectKeyForEstimateToast:
        "Conecte sua chave de API para consultar a cotação exata em /estimate.",
      copiedSnippetToast: "Código copiado para a área de transferência.",
      loadingSoulStyles: "Carregando estilos de GET /v1/text2image/soul-styles/v2...",
      connectKeyForStyles: "Conecte sua chave de API para carregar os estilos ao vivo.",
      selectedSoulStyleToast: (name) => `Estilo Soul V2 selecionado: ${name}`,
      pasteApiKeyError: "Por favor, cole sua chave de API de open.higgsfield.ai.",
      failedSaveKeyError: "Falha ao salvar a chave de API.",
      savedKeyToast: "Chave de API salva no servidor.",
      removedKeyToast: "Chave de API removida do servidor.",
      fetchingAccountModels: "Consultando GET https://api.higgsfield.ai/models...",
      connectKeyForModels:
        "Conecte uma chave de API válida para consultar os modelos da conta.",
      loadedEndpointToast: (slug) => `Endpoint carregado: ${slug}`,
      loadedImageIntoToast: (name) => `Imagem carregada em ${name}`,
      submittedToast: (id) => `Requisição enviada (${id}...)`,
      completedToast: (id) => `Geração concluída (${id}...)`,
      endedStatusToast: (st) => `Requisição finalizada com status: ${st}`,
      canceledRefundToast: "Requisição na fila cancelada. Créditos estornados.",
      cancelWindowClosedToast:
        "Janela de cancelamento encerrada (a geração já está em andamento).",
      missingRequiredError: (label, name) =>
        `O campo obrigatório '${label}' (${name}) está vazio.`,
      missingR2vRefError:
        "Informe pelo menos uma mídia de referência em URLs de Imagens (image_urls), Áudio (audio_urls) ou Vídeo (video_urls).",
      invalidJsonError: (msg) => `JSON personalizado inválido: ${msg}`,
      statusLabels: {
        queued: "NA FILA",
        in_progress: "PROCESSANDO",
        completed: "CONCLUÍDO",
        failed: "FALHOU",
        nsfw: "NSFW",
        canceled: "CANCELADO",
      },
      breakdownAudioOn: "áudio ligado",
      breakdownAudioOff: "sem áudio",
      breakdownThinkingOn: "raciocínio ativo",
      breakdownSoundOn: "som ligado",
      breakdownSoundOff: "sem som",
      breakdownCharLock: "trava de personagem",
      breakdownSheet: "folha 2K · 16:9",
      refVideoDurationLabel: "Duração do Vídeo Fonte (p/ cálculo de custo)",
      refVideoDetectedBadge: (rawSec, billedSec) =>
        `Detectado do vídeo: ${rawSec.toFixed(1)}s → ${billedSec}s cobrados`,
      refVideoManualBadge: (sec) =>
        `${sec}s (prévia · envie um vídeo local para detectar automaticamente)`,
      beforeDiscountList: (usdStr) => `${usdStr} s/ desc.`,
    },
    en: {
      pageTitle: "Higgsfield Studio · Local Rust Media Engine",
      checkingKey: "Checking key...",
      serverUnreachable: "Server unreachable",
      apiKeySaved: "API key saved",
      apiKeyEnvSub:
        "Loaded from server <code>.env.local</code>. Saving alone does not prove validity.",
      apiKeySessionSub: "Stored in server session memory.",
      noApiKey: "No API key configured",
      noApiKeySub:
        "Connect key or set <code>HF_API_KEY</code> in <code>.env.local</code>.",
      connectApiKey: "Connect API key",
      manageApiKey: "Manage API key",
      replaceApiKey: "Replace API key",
      saveApiKey: "Save API key",
      removeApiKey: "Remove API key",
      cancel: "Cancel",
      searchPlaceholder: "Search Seedance, Wan 3.0, Genjutsu, Soul...",
      catAll: "All",
      catVideo: "Video",
      catEdit: "Genjutsu & Edit",
      catImage: "Soul & Image",
      catCharacter: "Character",
      catAudio: "Audio",
      exploreAccountCatalog: "Explore Account Catalog",
      rateTier: "RATE TIER",
      apiDocs: "API Docs ↗",
      directorControls: "Director Controls",
      soulStylesBtn: "Soul V2 Styles (33)",
      requestCodeBtn: "Request Code",
      soulStylesDrawerTitle: "Select a Curated Soul V2 Style",
      codeTabJson: "JSON Payload",
      customOverrideLabel: "Custom Override",
      copyBtn: "Copy",
      estimatedCostEyebrow: "ESTIMATED COST",
      instantTierCalc: "Instant Tier Calc",
      syncingEstimate: "Syncing /estimate...",
      verifiedAccountQuote: "Verified Account Quote",
      verifiedRateTable: "Verified /estimate Rate",
      accountQuoteDiscount: (pct) => `Account Quote (${pct}% off)`,
      creditsUnit: "credits",
      billingFootnote:
        "Only <code>completed</code> runs spend credits · <code>failed</code>, <code>nsfw</code> &amp; queued <code>canceled</code> runs auto-refund · 7-day CDN retention",
      generateMedia: "Generate Media",
      submitting: "Submitting...",
      studioMonitor: "Studio Monitor",
      idle: "Idle",
      activeCount: (n) => `${n} active`,
      renderQueueTitle: "Render Queue & History",
      historyRetentionHint: "Outputs retained 7+ days on CDN",
      keyModalInstruction:
        'Paste the API key copied from <a href="https://open.higgsfield.ai/api-keys" target="_blank" rel="noopener noreferrer">open.higgsfield.ai</a>. Paste it as-is.',
      apiKeyFieldLabel: "Higgsfield API Key",
      apiKeyFieldHint:
        "Kept strictly server-side. Sent as <code>Authorization: Key &lt;api-key&gt;</code>.",
      persistEnvLocalLabel:
        "Save to local <code>.env.local</code> (git-ignored)",
      accountModelsTitle: "Account Model Catalog (GET /models)",
      accountModelsInstruction:
        "Click any live endpoint enabled on your Higgsfield account to load it directly into the studio.",
      requiredTag: "REQUIRED",
      verifyAccessSuffix: "Verify Access",
      dropSingleMedia: (fmt) =>
        `Drag & drop local media (${fmt}) or paste public URL`,
      dropMultiImages:
        "Drag & drop multiple reference images (PNG · JPG · WEBP) or add URLs",
      dropMultiAudios:
        "Drag & drop reference audio files (WAV · MP3 · M4A) or add URLs",
      dropMultiVideos:
        "Drag & drop reference videos (MP4 · MOV · WEBM) or add URLs",
      browseFile: "Browse File",
      browseFiles: "Browse Files",
      addUrl: "Add URL",
      uploading: "Uploading...",
      uploadedSingleToast: "Reference file uploaded to Higgsfield storage.",
      uploadedMultiToast: (n) => `Uploaded ${n} reference file(s).`,
      framePreviewTag: (r) => `${r} FRAME PREVIEW`,
      viewfinderIdleSub:
        "Configure parameters on the left and press Generate Media.",
      estPrefix: "EST:",
      animateSeedance: "Animate in Seedance 2.5 I2V →",
      animateSeedanceR2v: "Seedance 2.5 Ref (+ Audio) →",
      animateWan: "Animate in Wan 3.0 Prime I2V →",
      useGenjutsu: "Use in Genjutsu Motion →",
      elapsedSuffix: "s elapsed",
      statusPrefix: "Status:",
      pollingSub: (id) =>
        `Polling <code>/requests/${id}/status</code> with 2s-to-10s backoff...`,
      cancelQueuedBtn: "Cancel Queued Request",
      refreshStatusBtn: "Refresh Status ↻",
      refreshingStatus: "Checking...",
      statusRefreshedToast: (st) => `Higgsfield status: ${st}`,
      terminalStatePrefix: "Terminal State:",
      terminalErrorFallback:
        "Request ended without generating media. Failed, NSFW, and canceled requests are not charged.",
      framePreviewBtn: "Frame Preview",
      openDownloadBtn: "Open / Download Output ↗",
      emptyQueueHint: "No requests submitted in this workspace yet.",
      inspectBtn: "Inspect",
      cancelShortBtn: "Cancel",
      connectKeyForEstimateToast:
        "Connect your API key to fetch an account-specific /estimate quote.",
      copiedSnippetToast: "Copied snippet to clipboard.",
      loadingSoulStyles: "Loading styles from GET /v1/text2image/soul-styles/v2...",
      connectKeyForStyles: "Connect your API key to load live styles.",
      selectedSoulStyleToast: (name) => `Selected Soul V2 style: ${name}`,
      pasteApiKeyError: "Please paste your API key from open.higgsfield.ai.",
      failedSaveKeyError: "Failed to save API key.",
      savedKeyToast: "API key saved on server.",
      removedKeyToast: "API key removed from server.",
      fetchingAccountModels: "Fetching GET https://api.higgsfield.ai/models...",
      connectKeyForModels:
        "Connect a valid API key to query account models.",
      loadedEndpointToast: (slug) => `Loaded endpoint: ${slug}`,
      loadedImageIntoToast: (name) => `Loaded image into ${name}`,
      submittedToast: (id) => `Request submitted (${id}...)`,
      completedToast: (id) => `Generation completed (${id}...)`,
      endedStatusToast: (st) => `Request ended with status: ${st}`,
      canceledRefundToast: "Queued request canceled. Credits refunded.",
      cancelWindowClosedToast:
        "Cancellation window closed (request is already in progress).",
      missingRequiredError: (label, name) =>
        `Required field '${label}' (${name}) is missing or empty.`,
      missingR2vRefError:
        "Provide at least one reference item in Reference Image URLs (image_urls), Audio URLs (audio_urls), or Video URLs (video_urls).",
      invalidJsonError: (msg) => `Invalid custom JSON body: ${msg}`,
      statusLabels: {
        queued: "QUEUED",
        in_progress: "IN_PROGRESS",
        completed: "COMPLETED",
        failed: "FAILED",
        nsfw: "NSFW",
        canceled: "CANCELED",
      },
      breakdownAudioOn: "audio on",
      breakdownAudioOff: "audio off",
      breakdownThinkingOn: "thinking on",
      breakdownSoundOn: "sound on",
      breakdownSoundOff: "sound off",
      breakdownCharLock: "character lock",
      breakdownSheet: "2K · 16:9 sheet",
      refVideoDurationLabel: "Source Video Duration (for cost estimate)",
      refVideoDetectedBadge: (rawSec, billedSec) =>
        `Detected from video: ${rawSec.toFixed(1)}s → ${billedSec}s billed`,
      refVideoManualBadge: (sec) =>
        `${sec}s (preview · upload a local video to auto-detect)`,
      beforeDiscountList: (usdStr) => `${usdStr} list`,
    },
  };

  const MODEL_PT_BR = {
    "seedance-2.5-t2v": {
      name: "Seedance 2.5 · Texto para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.144 - $0.796 / seg",
      description:
        "Gera vídeos cinematográficos com física realista de até 30s a partir de texto com áudio nativo sincronizado.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Seedance 2.5 Texto para Vídeo.",
    },
    "seedance-2.5-i2v": {
      name: "Seedance 2.5 · Imagem para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.144 - $0.796 / seg",
      description:
        "Anima uma imagem inicial (com quadro final e prompt opcionais) em um vídeo de 4 a 30s com áudio nativo. (Para usar áudio de referência + imagem, use Seedance 2.5 · Referência para Vídeo).",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Seedance 2.5 Imagem para Vídeo (additionalProperties: false).",
    },
    "seedance-2.5-r2v": {
      name: "Seedance 2.5 · Referência para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.173 - $0.955 / seg",
      description:
        "Gera vídeos consistentes de personagem, cenário e estilo guiados por imagens, vídeos e/ou áudio de referência (até 30 imagens, 10 vídeos, 10 áudios).",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Seedance 2.5 Reference-to-Video (suporta image_urls, audio_urls e video_urls).",
    },
    "seedance-2.5-edit": {
      name: "Seedance 2.5 · Edição de Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.173 - $0.955 / seg",
      description:
        "Edita um vídeo fonte usando instruções em linguagem natural e imagens, áudios ou vídeos de referência opcionais mantendo o movimento (duração segue o vídeo fonte).",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Seedance 2.5 Video Edit (duração derivada do video_url fonte).",
    },
    "seedance-2.5-extend": {
      name: "Seedance 2.5 · Estender Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.173 - $0.955 / seg",
      description:
        "Continua e estende um clipe de vídeo existente por 4 a 30 segundos com movimento coerente, mídias de referência opcionais e áudio.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Seedance 2.5 Video Extend.",
    },
    "wan-3.0-t2v": {
      name: "Wan 3.0 · Texto para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.020 - $0.080 / seg",
      description:
        "Gera vídeos cinematográficos de 2 a 30s a partir de texto em 480p–1080p com áudio opcional e modo raciocínio.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Wan 3.0 ($0.02-$0.08/s, 2-30s).",
    },
    "wan-3.0-i2v": {
      name: "Wan 3.0 · Imagem para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.020 - $0.080 / seg",
      description:
        "Anima uma imagem inicial (com quadro final opcional) em um clipe de vídeo de 2 a 30s em 480p–1080p com áudio sincronizado.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Wan 3.0 Image-to-Video ($0.02-$0.08/s, 2-30s).",
    },
    "wan-3.0-r2v": {
      name: "Wan 3.0 · Referência para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.020 - $0.080 / seg",
      description:
        "Gera vídeos de 2 a 30s guiados por imagens (@Image1..10), vídeos (@Video1..5), áudios ou documentos de referência em 480p–1080p.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Wan 3.0 Reference-to-Video (suporta image_urls, video_urls, audio_urls, file_url, link_url).",
    },
    "wan-3.0-prime-t2v": {
      name: "Wan 3.0 Prime · Texto para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.0272 - $0.112 / seg",
      description:
        "Modelo principal Wan 3.0 Prime de texto para vídeo de até 30s e 1080p com áudio nativo e modo raciocínio.",
      verification_note:
        "Esquema exato verificado via referência oficial da API Wan 3.0 Prime ($0.0272/s 480p, $0.056/s 720p, $0.112/s 1080p).",
    },
    "wan-3.0-prime-i2v": {
      name: "Wan 3.0 Prime · Imagem para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.0272 - $0.112 / seg",
      description:
        "Anima uma imagem inicial (com quadro final opcional) em até 30s e 1080p usando o modelo Wan 3.0 Prime.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Wan 3.0 Prime Image-to-Video ($0.0272-$0.112/s, 2-30s).",
    },
    "wan-3.0-prime-r2v": {
      name: "Wan 3.0 Prime · Referência para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.0272 - $0.112 / seg",
      description:
        "Gera vídeos de 2 a 30s guiados por imagens (@Image1..10), vídeos (@Video1..5), áudios ou documentos de referência usando o Wan 3.0 Prime.",
      verification_note:
        "Contrato documentado verificado via referência oficial da API Wan 3.0 Prime Reference-to-Video (suporta image_urls, video_urls, audio_urls, file_url, link_url).",
    },
    "genjutsu-motion-transfer": {
      name: "Genjutsu · Transferência de Movimento",
      badge: "Esquema Verificado",
      pricing_hint: "$0.159 - $0.816 / seg",
      description:
        "Transfere o movimento de câmera e performance de um vídeo fonte (4–30s) para 1 a 8 imagens de referência.",
      verification_note:
        "Esquema JSON completo verificado via docs.higgsfield.ai/docs/models/genjutsu/motion-transfer.",
    },
    "genjutsu-object-swap": {
      name: "Genjutsu · Troca de Objeto / Roupa",
      badge: "Esquema Verificado",
      pricing_hint: "$0.159 - $0.816 / seg",
      description:
        "Substitui um produto, roupa ou objeto em um vídeo existente usando 1 a 8 imagens de referência preservando câmera e movimento.",
      verification_note:
        "Endpoint higgsfield/genjutsu/object-swap/v1.0 verificado via playground oficial.",
    },
    "genjutsu-restyle": {
      name: "Genjutsu · Reestilizar Vídeo (Restyle)",
      badge: "Esquema Verificado",
      pricing_hint: "$0.318 - $1.632 / seg",
      description:
        "Reestiliza um vídeo com um preset visual e imagens de referência opcionais mantendo movimento e áudio original.",
      verification_note:
        "Verificado via Playground oficial do Genjutsu Restyle ($0.318/s 480p, $0.681/s 720p, $1.632/s 1080p).",
    },
    "soul-v2-standard": {
      name: "SOUL V2 · Texto para Imagem (+ Soul ID)",
      badge: "Esquema Verificado",
      pricing_hint: "$0.0032 - $0.0057 / img",
      description:
        "Modelo editorial e de retratos ultrarrealistas com textura natural de pele, 33 estilos curados e trava de personagem Soul ID.",
      verification_note:
        "Verificado via playground do Soul 2 e medições ao vivo na API.",
    },
    "ai-influencer": {
      name: "AI Influencer · Folha de Personagem 2K",
      badge: "Esquema Verificado",
      pricing_hint: "$0.05 / folha 2K",
      description:
        "Cria uma folha de referência de personagem 2K 16:9 (retrato close-up + corpo inteiro) em 9 modos humanos e animais ($0.05 / folha).",
      verification_note:
        "Verificado via referência oficial da API AI Influencer: 9 tipos de personagem (normal, freak, total, cats, dogs, capybaras, birds, frogs, insects) a $0.05 por folha 2K 16:9.",
    },
    "soul-v2-i2i": {
      name: "SOUL V2 · Imagem para Imagem",
      badge: "Soul 2 I2I",
      pricing_hint: "$0.0032 - $0.0057 / img",
      description:
        "Transforma uma imagem de referência com iluminação, atmosfera e textura editorial do SOUL V2.",
      verification_note:
        "Listado no catálogo de modelos Higgsfield como Soul 2 Image to Image.",
    },
    "soul-cinema": {
      name: "SOUL Cinema · Stills de Cinema Widescreen",
      badge: "Esquema Verificado",
      pricing_hint: "$0.006 / img",
      description:
        "Quadros cinematográficos anamórficos com iluminação dramática e granulação orgânica de filme.",
      verification_note:
        "Endpoint higgsfield-ai/soul/cinema verificado em medições ao vivo na API.",
    },
    "soul-id-creator": {
      name: "Soul ID · Criador de Identidade Fixa",
      badge: "Trava de Personagem",
      pricing_hint: "$2.50 / personagem",
      description:
        "Cria uma identidade persistente Soul ID a partir de múltiplas fotos da mesma pessoa para uso contínuo no SOUL V2.",
      verification_note:
        "Listado no catálogo Higgsfield ($2.50/requisição) e SDK V1 (createSoulId).",
    },
    "cinema-studio-4": {
      name: "Cinema Studio 4.0",
      badge: "Vídeo Cinema",
      pricing_hint: "$0.206 - $0.462 / seg",
      description:
        "Modelo nativo de direção cinematográfica e controle de câmera da Higgsfield (4–30s, 480p–720p).",
      verification_note:
        "Confirmado no catálogo de open.higgsfield.ai ($0.2057-$0.4623/s, 480p-720p, 4-30s).",
    },
    "kling-3.0-pro-t2v": {
      name: "Kling 3.0 Pro · Texto para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.095 - $0.168 / seg",
      description:
        "Gera vídeos cinematográficos multi-corte a partir de texto com áudio nativo e duração de 3 a 15 segundos.",
      verification_note:
        "Verificado via API /estimate do Kling 3.0 Pro ($0.095-$0.168/s, 3-15s, sound, cfg_scale, multi_shots).",
    },
    "ltx-2.5-pro-t2v": {
      name: "LTX-2.5 Pro · Texto para Vídeo",
      badge: "Esquema Verificado",
      pricing_hint: "$0.120 - $0.170 / seg",
      description:
        "Geração de vídeo cinematográfico de alta velocidade via LTX-2.5 Pro (6, 8 ou 10 segundos em 720p ou 1080p).",
      verification_note:
        "Endpoint POST /lightricks/ltx-2.5/text-to-video/pro verificado via API (durações aceitas: 6, 8 ou 10s).",
    },
    "marketing-studio-image": {
      name: "Marketing Studio Image · Campanhas 4K",
      badge: "Esquema Verificado",
      pricing_hint: "$0.0138 - $0.6136 / img",
      description:
        "Cria e edita imagens publicitárias e de produtos em até 4K a partir de texto e até 16 imagens de referência.",
      verification_note:
        "Esquema completo verificado via Playground do Marketing Studio Image ($0.0138 em 1k low a $0.6136 em 4k high).",
    },
    "recraft-v4.1-pro": {
      name: "Recraft V4.1 Pro · Imagem de Estúdio 2K",
      badge: "Esquema Verificado",
      pricing_hint: "$0.210 / img",
      description:
        "Fotografia comercial de alta definição (2K) e design tipográfico preciso.",
      verification_note:
        "Endpoint recraft/v4.1/pro/text-to-image verificado via medições na API (resolução suportada: 2k).",
    },
    "grok-imagine-2.0": {
      name: "Grok Imagine 2.0 · Imagem & Edição por Ref",
      badge: "Esquema Verificado",
      pricing_hint: "$0.040 - $0.080 / img",
      description:
        "Gera ou edita imagens com até 10 imagens de referência preservando identidade e enquadramento.",
      verification_note:
        "Endpoint xai/grok-imagine-image-2.0 verificado com edição guiada por referências (quality: low ou medium).",
    },
    "speak-v2-audio-video": {
      name: "Higgsfield Speak v2 · Áudio / Voz para Vídeo",
      badge: "Voz + Avatar",
      pricing_hint: "Guiado por Áudio",
      description:
        "Anima o retrato de um personagem com um arquivo de áudio de fala (.wav) e direção de atuação.",
      verification_note:
        "Documentado no SDK oficial higgsfield-js; utiliza áudio WAV + retrato do personagem.",
    },
    "custom-endpoint": {
      name: "Endpoint Personalizado · Qualquer Caminho",
      badge: "REST Livre",
      pricing_hint: "Dinâmico / Estimate",
      description:
        "Execute qualquer endpoint da API Higgsfield informando o caminho do modelo e parâmetros JSON.",
      verification_note:
        "Envio REST direto para https://api.higgsfield.ai/<endpoint>.",
    },
  };

  const FIELD_PT_BR = {
    __custom_endpoint: {
      label: "Caminho do Endpoint do Modelo",
      description:
        "Caminho após https://api.higgsfield.ai/ (ex: bytedance/seedance-2.5/text-to-video).",
    },
    prompt: {
      label: "Prompt de Direção / Cena",
      description:
        "Descreva sua cena, movimento de câmera, iluminação, estilo e direção visual/sonora.",
    },
    brief: {
      label: "Direção do Personagem / Brief (Opcional)",
      description:
        "Descrição opcional do personagem (até 4.000 caracteres): traços faciais, cabelo, estilo e personalidade.",
    },
    tier: {
      label: "Tipo de Personagem (tier)",
      description:
        "Selecione um dos 9 tipos de personagem da API: Humano (Médio / Marcante / Extremo) ou modos Animais.",
    },
    __sel_gender: {
      label: "Gênero (selection.gender)",
      description: "Traço opcional de gênero do catálogo oficial de opções do AI Influencer.",
    },
    __sel_body_type: {
      label: "Tipo Físico / Porte (selection.body_type)",
      description: "Porte físico opcional do catálogo oficial de opções do AI Influencer.",
    },
    __sel_aesthetic: {
      label: "Estilo de Roupa / Estética (selection.aesthetic)",
      description: "Preset opcional de roupa/estética do catálogo oficial do AI Influencer.",
    },
    duration: {
      label: "Duração (segundos)",
      description: "Duração do clipe gerado em segundos.",
    },
    resolution: {
      label: "Resolução",
      description: "Nível de resolução de saída do arquivo gerado.",
    },
    aspect_ratio: {
      label: "Proporção da Tela (Aspect Ratio)",
      description: "Proporção do enquadramento de saída.",
    },
    bitrate_mode: {
      label: "Modo de Bitrate",
      description: "Qualidade da taxa de bits da codificação de vídeo.",
    },
    output_format: {
      label: "Formato de Saída",
      description: "Formato do contêiner de vídeo gerado (MP4 ou MOV).",
    },
    generate_audio: {
      label: "Gerar Áudio Sincronizado",
      description: "Sintetizar áudio ambiente e efeitos sonoros na mesma passagem.",
    },
    enable_thinking: {
      label: "Ativar Modo Raciocínio (Thinking Mode)",
      description: "Executa uma etapa de refinamento lógico do prompt antes de renderizar.",
    },
    image_url: {
      label: "URL da Imagem / Foto de Referência",
      description:
        "URL pública HTTPS da imagem ou arraste e solte um arquivo local. (No AI Influencer: apenas modos Humanos).",
    },
    end_image_url: {
      label: "URL da Imagem Final (Opcional)",
      description: "Quadro-chave final opcional para interpolação de movimento.",
    },
    image_urls: {
      label: "URLs das Imagens de Referência",
      description:
        "URLs públicas de imagens de personagem, figurino, produto ou cenário (referencie no prompt como @Image1, @Image2, etc.).",
    },
    audio_urls: {
      label: "URLs de Áudio de Referência (Opcional)",
      description:
        "URLs públicas de arquivos de áudio (WAV/MP3, até 30s totais) para guiar voz, fala, música ou ritmo.",
    },
    video_urls: {
      label: "URLs de Vídeo de Referência (Opcional)",
      description:
        "URLs públicas de vídeos de referência (MP4/MOV, até 30s totais; referencie no prompt como @Video1, @Video2, etc.).",
    },
    file_url: {
      label: "URL de Documento de Referência (Opcional)",
      description:
        "URL pública de um documento (docx/xlsx/pptx/pdf/md). Ativa automaticamente o Modo Raciocínio.",
    },
    link_url: {
      label: "URL de Página Web de Referência (Opcional)",
      description:
        "URL pública de uma página web (não combinável com file_url). Ativa automaticamente o Modo Raciocínio.",
    },
    item_image_urls: {
      label: "URLs de Roupas / Itens (Apenas Humanos, até 3)",
      description:
        "Apenas para modos Humanos: até 3 imagens de roupas, calçados ou acessórios. Omitido automaticamente para animais.",
    },
    video_url: {
      label: "URL do Vídeo Fonte / Referência",
      description: "URL pública HTTPS do vídeo (envie um MP4/MOV local ou cole a URL).",
    },
    audio_url: {
      label: "URL do Áudio de Voz (.wav)",
      description: "URL pública do arquivo de áudio WAV (use o botão Escolher Arquivo).",
    },
    preset_id: {
      label: "ID do Preset de Estilo Visual (preset_id)",
      description:
        "ID do preset visual para reestilização (opcional se prompt ou imagens de estilo forem informados).",
    },
    batch_size: {
      label: "Tamanho do Lote (Batch Size)",
      description: "Quantidade de imagens geradas simultaneamente (1 ou 4).",
    },
    enhance_prompt: {
      label: "Aprimorar Prompt Automaticamente",
      description: "Enriquece automaticamente o prompt com detalhes de iluminação e lente.",
    },
    custom_reference_id: {
      label: "UUID do Soul ID / Personagem (Opcional)",
      description:
        "Cole o UUID de um Soul ID para manter o mesmo personagem consistente em várias cenas.",
    },
    custom_reference_strength: {
      label: "Força da Referência do Personagem",
      description: "Intensidade de fidelidade ao Soul ID (0.1 a 1.0).",
    },
    style_id: {
      label: "ID de Estilo do Soul V2 (Opcional)",
      description:
        "UUID opcional de estilo (clique em 'Estilos Soul V2 (33)' no topo para escolher).",
    },
    seed: {
      label: "Semente Aleatória / Seed (Opcional)",
      description:
        "Número inteiro opcional para resultados reproduzíveis. Deixe em branco para gerar automaticamente.",
    },
    variation_index: {
      label: "Índice de Sequência Animal (variation_index)",
      description:
        "Posição na sequência de variação animal (0, 1, 2...). Modos humanos usam 0 automaticamente.",
    },
    body_color: {
      label: "Cor do Corpo Animal em Hex (Opcional)",
      description:
        "Cor hexadecimal #RRGGBB opcional (ex: #D9A066) apenas para animais; omitido para humanos.",
    },
    pinned_species: {
      label: "ID de Espécie de Inseto Fixa (Apenas Insetos)",
      description:
        "ID opcional de espécie de inseto (1–64 caracteres) quando tier='insects'.",
    },
    name: {
      label: "Nome do Personagem",
      description: "Nome identificador para o seu personagem Soul ID.",
    },
    sound: {
      label: "Áudio Nativo (sound)",
      description: "Gerar som nativo sincronizado ('on' ou 'off').",
    },
    cfg_scale: {
      label: "Fidelidade ao Prompt (cfg_scale)",
      description: "Escala de aderência ao prompt de 0.0 a 1.0 (padrão: 0.5).",
    },
    multi_shots: {
      label: "Cortes Multi-Câmera (multi_shots)",
      description: "Permite múltiplos cortes de câmera dentro do mesmo clipe gerado.",
    },
    quality: {
      label: "Nível de Qualidade",
      description: "Qualidade de renderização de saída.",
    },
    moderation: {
      label: "Nível de Moderação",
      description: "Modo do filtro de moderação de segurança.",
    },
  };

  const OPTION_PT_BR = {
    "Average · Human (normal)": "Médio · Humano (normal)",
    "Bold · Human (freak)": "Marcante · Humano (freak)",
    "Extreme · Human (total)": "Extremo · Humano (total)",
    "Cat (cats)": "Gato (cats)",
    "Dog (dogs)": "Cachorro (dogs)",
    "Capybara (capybaras)": "Capivara (capybaras)",
    "Bird (birds)": "Pássaro (birds)",
    "Frog (frogs)": "Sapo (frogs)",
    "Insect (insects)": "Inseto (insects)",
    "Auto / Random": "Automático / Aleatório",
    "Auto / Default": "Automático / Padrão",
    Female: "Feminino",
    Male: "Masculino",
    "Non-Binary": "Não-Binário",
    "Trans Man": "Homem Trans",
    "Trans Woman": "Mulher Trans",
    Slim: "Magro",
    Athletic: "Atlético",
    Muscular: "Musculoso",
    Curvy: "Curvilíneo",
    Heavy: "Forte / Pesado",
    "Ultra Muscular": "Ultra Musculoso",
    Casual: "Casual",
    Streetstyle: "Streetwear",
    Sporty: "Esportivo",
    Suits: "Terno / Social",
    Retro: "Retrô",
    Y2K: "Y2K",
    Goth: "Gótico",
    Theatrical: "Teatral",
    "480p (Fast / Draft)": "480p (Rápido / Rascunho)",
    "720p (Standard HD)": "720p (HD Padrão)",
    "1080p (Full HD)": "1080p (Full HD)",
    "720p (Standard)": "720p (Padrão)",
    "1080p (High Detail)": "1080p (Alta Definição)",
    High: "Alta",
    Standard: "Padrão",
    Low: "Baixa",
    Mid: "Média",
    Medium: "Média",
    Short: "Curto",
    Long: "Longo",
    "1 Image": "1 Imagem",
    "4 Images": "4 Imagens",
    "4 Images (Consistent Set)": "4 Imagens (Set Consistente)",
    "Sound On": "Som Ligado",
    "Sound Off": "Som Desligado",
    Auto: "Automático",
    Adaptive: "Adaptativo",
  };

  function t() {
    return UI_I18N[state.lang] || UI_I18N["pt-br"];
  }

  function getLocalizedModelMeta(model) {
    if (!model) return { name: "", badge: "", pricing_hint: "", description: "", verification_note: "" };
    if (state.lang === "pt-br" && MODEL_PT_BR[model.id]) {
      const loc = MODEL_PT_BR[model.id];
      return {
        name: loc.name || model.name,
        badge: loc.badge || model.badge,
        pricing_hint: loc.pricing_hint || model.pricing_hint,
        description: loc.description || model.description,
        verification_note: loc.verification_note || model.verification_note,
      };
    }
    return {
      name: model.name,
      badge: model.badge,
      pricing_hint: model.pricing_hint,
      description: model.description,
      verification_note: model.verification_note,
    };
  }

  function getLocalizedFieldMeta(field) {
    if (state.lang === "pt-br" && FIELD_PT_BR[field.name]) {
      return {
        label: FIELD_PT_BR[field.name].label || field.label,
        description: FIELD_PT_BR[field.name].description || field.description,
      };
    }
    return {
      label: field.label,
      description: field.description,
    };
  }

  function getLocalizedOptionLabel(optLabel) {
    if (state.lang === "pt-br" && OPTION_PT_BR[optLabel]) {
      return OPTION_PT_BR[optLabel];
    }
    return optLabel;
  }

  // DOM Elements
  const keyStatusDot = document.getElementById("keyStatusDot");
  const keyStatusText = document.getElementById("keyStatusText");
  const keySubtext = document.getElementById("keySubtext");
  const openKeyModalBtn = document.getElementById("openKeyModalBtn");
  const modelSearchInput = document.getElementById("modelSearchInput");
  const modelListEl = document.getElementById("modelList");
  const syncAccountModelsBtn = document.getElementById("syncAccountModelsBtn");

  const activeModelProvider = document.getElementById("activeModelProvider");
  const activeModelEndpoint = document.getElementById("activeModelEndpoint");
  const activeModelBadge = document.getElementById("activeModelBadge");
  const activeModelName = document.getElementById("activeModelName");
  const activeModelDesc = document.getElementById("activeModelDesc");
  const activeModelPricing = document.getElementById("activeModelPricing");
  const activeModelDocLink = document.getElementById("activeModelDocLink");
  const verificationDot = document.getElementById("verificationDot");
  const verificationNoteText = document.getElementById("verificationNoteText");

  const liveCostSourceBadge = document.getElementById("liveCostSourceBadge");
  const refreshEstimateBtn = document.getElementById("refreshEstimateBtn");
  const liveCostUsd = document.getElementById("liveCostUsd");
  const liveCostCredits = document.getElementById("liveCostCredits");
  const liveCostBreakdown = document.getElementById("liveCostBreakdown");
  const liveCostFootnote = document.getElementById("liveCostFootnote");
  const monitorSpecPill = document.getElementById("monitorSpecPill");

  const dynamicFieldsContainer = document.getElementById("dynamicFieldsContainer");
  const loadSoulStylesBtn = document.getElementById("loadSoulStylesBtn");
  const soulStylesDrawer = document.getElementById("soulStylesDrawer");
  const closeSoulStylesBtn = document.getElementById("closeSoulStylesBtn");
  const soulStylesList = document.getElementById("soulStylesList");

  const toggleJsonInspectorBtn = document.getElementById("toggleJsonInspectorBtn");
  const jsonInspectorBox = document.getElementById("jsonInspectorBox");
  const jsonEndpointPreview = document.getElementById("jsonEndpointPreview");
  const customJsonToggleLabel = document.getElementById("customJsonToggleLabel");
  const useCustomJsonToggle = document.getElementById("useCustomJsonToggle");
  const copyCodeSnippetBtn = document.getElementById("copyCodeSnippetBtn");
  const rawJsonTextarea = document.getElementById("rawJsonTextarea");

  const formErrorBox = document.getElementById("formErrorBox");
  const submitGenerateBtn = document.getElementById("submitGenerateBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const generationForm = document.getElementById("generationForm");

  const activePollsBadge = document.getElementById("activePollsBadge");
  const outputStage = document.getElementById("outputStage");
  const jobsList = document.getElementById("jobsList");

  // Modal Elements
  const keyModalBackdrop = document.getElementById("keyModalBackdrop");
  const keyModalTitle = document.getElementById("keyModalTitle");
  const closeKeyModalBtn = document.getElementById("closeKeyModalBtn");
  const cancelKeyModalBtn = document.getElementById("cancelKeyModalBtn");
  const apiKeyForm = document.getElementById("apiKeyForm");
  const apiKeyPasswordInput = document.getElementById("apiKeyPasswordInput");
  const persistEnvLocalCheckbox = document.getElementById("persistEnvLocalCheckbox");
  const keyModalError = document.getElementById("keyModalError");
  const removeKeyBtn = document.getElementById("removeKeyBtn");
  const saveKeyBtn = document.getElementById("saveKeyBtn");

  const accountModelsModalBackdrop = document.getElementById("accountModelsModalBackdrop");
  const closeAccountModelsBtn = document.getElementById("closeAccountModelsBtn");
  const accountModelsContent = document.getElementById("accountModelsContent");
  const toastContainer = document.getElementById("toastContainer");

  function setLanguage(lang) {
    const normalized = lang === "en" ? "en" : "pt-br";
    state.lang = normalized;
    try {
      localStorage.setItem("hf_studio_lang", normalized);
    } catch (_) {}

    document.documentElement.lang = normalized === "pt-br" ? "pt-BR" : "en";
    const dict = t();
    document.title = dict.pageTitle;

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === normalized);
    });

    if (modelSearchInput) modelSearchInput.placeholder = dict.searchPlaceholder;
    const setElText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    const setElHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setElText("catTabAll", dict.catAll);
    setElText("catTabVideo", dict.catVideo);
    setElText("catTabEdit", dict.catEdit);
    setElText("catTabImage", dict.catImage);
    setElText("catTabCharacter", dict.catCharacter);
    setElText("catTabAudio", dict.catAudio);
    setElText("exploreAccountCatalogLabel", dict.exploreAccountCatalog);
    setElText("rateTierLabel", dict.rateTier);
    setElText("activeModelDocLink", dict.apiDocs);
    setElText("directorControlsTitle", dict.directorControls);
    setElText("loadSoulStylesBtn", dict.soulStylesBtn);
    setElText("requestCodeBtnLabel", dict.requestCodeBtn);
    setElText("soulStylesDrawerTitle", dict.soulStylesDrawerTitle);
    setElText("codeTabJson", dict.codeTabJson);
    setElText("customOverrideLabel", dict.customOverrideLabel);
    setElText("copyCodeSnippetBtn", dict.copyBtn);
    setElText("estimatedCostEyebrow", dict.estimatedCostEyebrow);
    setElHtml("liveCostFootnote", dict.billingFootnote);
    setElText("studioMonitorTitle", dict.studioMonitor);
    setElText("renderQueueTitle", dict.renderQueueTitle);
    setElText("historyRetentionHint", dict.historyRetentionHint);
    setElHtml("keyModalInstruction", dict.keyModalInstruction);
    setElText("apiKeyFieldLabel", dict.apiKeyFieldLabel);
    setElHtml("apiKeyFieldHint", dict.apiKeyFieldHint);
    setElHtml("persistEnvLocalLabel", dict.persistEnvLocalLabel);
    setElText("removeKeyBtn", dict.removeApiKey);
    setElText("cancelKeyModalBtn", dict.cancel);
    setElText("accountModelsTitle", dict.accountModelsTitle);
    setElText("accountModelsInstruction", dict.accountModelsInstruction);

    renderKeyStatus();
    renderModelList();
    if (state.activeModel) {
      updateActiveModelHeader(state.activeModel);
      renderFormFields();
      onParametersChanged();
    }
    updatePollsCounter();
    renderOutputStage();
    renderJobsList();
  }

  function showToast(message, variant = "ok") {
    if (!toastContainer) return;
    const item = document.createElement("div");
    item.className = `toast-item ${variant}`;
    item.textContent = message;
    toastContainer.appendChild(item);
    setTimeout(() => {
      item.style.opacity = "0";
      setTimeout(() => item.remove(), 220);
    }, 3200);
  }

  function generateUuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const CUSTOM_ENDPOINT_MODEL = {
    id: "custom-endpoint",
    endpoint: "bytedance/seedance-2.5/text-to-video",
    name: "Custom Model Endpoint · Any Path",
    provider: "Custom REST",
    category: "video",
    badge: "Custom Path",
    pricing_hint: "Dynamic / Estimate",
    description: "Run any Higgsfield API model endpoint path with custom JSON parameters.",
    doc_url: "https://docs.higgsfield.ai/docs/api-reference/overview",
    verified_schema: true,
    verification_note: "Direct REST submission to https://api.higgsfield.ai/<endpoint>.",
    fields: [
      {
        name: "__custom_endpoint",
        label: "Model Endpoint Path",
        field_type: "text",
        required: true,
        default_value: "bytedance/seedance-2.5/text-to-video",
        description: "Path after https://api.higgsfield.ai/ (e.g. bytedance/seedance-2.5/text-to-video).",
      },
      {
        name: "prompt",
        label: "Prompt",
        field_type: "textarea",
        required: false,
        default_value: "",
        description: "Primary prompt (or open Request Code below to customize all fields).",
      },
    ],
  };

  async function init() {
    bindEvents();
    setLanguage(state.lang);
    await Promise.all([fetchConfig(), fetchModels(), fetchJobs()]);
    startElapsedTicker();
  }

  function startElapsedTicker() {
    if (state.elapsedTimerId) clearInterval(state.elapsedTimerId);
    state.elapsedTimerId = setInterval(() => {
      const el = document.getElementById("liveElapsedCounter");
      if (!el) return;
      const job = state.jobs.find((j) => j.request_id === state.activeStageJobId);
      if (!job || TERMINAL_STATUSES.has(job.status)) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSec - (job.created_at || nowSec));
      el.textContent = `${elapsed}${t().elapsedSuffix}`;
    }, 1000);
  }

  async function fetchConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      state.hasKey = Boolean(data.has_key);
      state.keySource = data.key_source || "none";
      state.baseUrl = data.base_url || "https://api.higgsfield.ai";
      renderKeyStatus();
    } catch (_) {
      keyStatusText.textContent = t().serverUnreachable;
    }
  }

  function renderKeyStatus() {
    const dict = t();
    if (state.hasKey) {
      keyStatusDot.classList.add("saved");
      keyStatusText.textContent = dict.apiKeySaved;
      keySubtext.innerHTML =
        state.keySource === "env" ? dict.apiKeyEnvSub : dict.apiKeySessionSub;
      openKeyModalBtn.textContent = dict.manageApiKey;
      openKeyModalBtn.className = "btn btn-secondary btn-sm";
      keyModalTitle.textContent = dict.manageApiKey;
      saveKeyBtn.textContent = dict.replaceApiKey;
      removeKeyBtn.hidden = false;
    } else {
      keyStatusDot.classList.remove("saved");
      keyStatusText.textContent = dict.noApiKey;
      keySubtext.innerHTML = dict.noApiKeySub;
      openKeyModalBtn.textContent = dict.connectApiKey;
      openKeyModalBtn.className = "btn btn-primary btn-sm";
      keyModalTitle.textContent = dict.connectApiKey;
      saveKeyBtn.textContent = dict.saveApiKey;
      removeKeyBtn.hidden = true;
    }
  }

  const VERIFIED_MODEL_PATCHES = {};

  function applyVerifiedModelPatch(model) {
    const patch = VERIFIED_MODEL_PATCHES[model.id];
    if (!patch) return model;

    const updated = { ...model };
    for (const k of ["pricing_hint", "doc_url", "verification_note", "verified_schema", "badge"]) {
      if (patch[k] !== undefined) updated[k] = patch[k];
    }

    if (Array.isArray(patch.fields)) {
      updated.fields = structuredClone(patch.fields);
      return updated;
    }

    let fields = Array.isArray(model.fields) ? structuredClone(model.fields) : [];
    if (patch.patchField) {
      fields = fields.map((f) =>
        patch.patchField[f.name] ? { ...f, ...patch.patchField[f.name] } : f
      );
    }
    if (Array.isArray(patch.addFields)) {
      for (const addF of patch.addFields) {
        if (fields.some((f) => f.name === addF.name)) continue;
        const { after, ...cleanField } = addF;
        const idx = after ? fields.findIndex((f) => f.name === after) : -1;
        if (idx >= 0) {
          fields.splice(idx + 1, 0, cleanField);
        } else {
          fields.push(cleanField);
        }
      }
    }
    updated.fields = fields;
    return updated;
  }

  async function fetchModels() {
    const res = await fetch("/api/models");
    const data = await res.json();
    const rawModels = (data.models || []).map(applyVerifiedModelPatch);
    state.models = [...rawModels, CUSTOM_ENDPOINT_MODEL];
    renderModelList();
    if (state.models.length > 0 && !state.activeModel) {
      selectModel(state.models[0].id);
    }
  }

  function renderModelList() {
    modelListEl.innerHTML = "";
    const query = state.searchQuery.trim().toLowerCase();

    const filtered = state.models.filter((m) => {
      const loc = getLocalizedModelMeta(m);
      const isAiInfluencerInImageTab =
        state.selectedCategory === "image" && m.id === "ai-influencer";
      const matchesCat =
        state.selectedCategory === "all" ||
        m.category === state.selectedCategory ||
        isAiInfluencerInImageTab ||
        m.id === "custom-endpoint";
      const matchesQuery =
        !query ||
        m.name.toLowerCase().includes(query) ||
        loc.name.toLowerCase().includes(query) ||
        m.endpoint.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });

    for (const model of filtered) {
      const loc = getLocalizedModelMeta(model);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "model-item" +
        (state.activeModel && state.activeModel.id === model.id ? " active" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute(
        "aria-selected",
        state.activeModel && state.activeModel.id === model.id ? "true" : "false"
      );

      btn.innerHTML = `
        <div class="model-item-top">
          <span class="model-item-name">${escapeHtml(loc.name)}</span>
          <span class="model-item-badge">${escapeHtml(model.provider)}</span>
        </div>
        <div class="model-item-bottom">
          <span class="model-item-endpoint">${escapeHtml(model.endpoint)}</span>
        </div>
      `;

      btn.addEventListener("click", () => selectModel(model.id));
      modelListEl.appendChild(btn);
    }
  }

  function updateActiveModelHeader(model) {
    const loc = getLocalizedModelMeta(model);
    const dict = t();
    activeModelProvider.textContent = model.provider;
    activeModelEndpoint.textContent = getEffectiveEndpoint();
    activeModelBadge.textContent = model.verified_schema
      ? loc.badge
      : `${loc.badge} · ${dict.verifyAccessSuffix}`;
    activeModelBadge.className = model.verified_schema
      ? "schema-badge"
      : "schema-badge unverified";
    activeModelName.textContent = loc.name;
    activeModelDesc.textContent = loc.description;
    activeModelPricing.textContent = loc.pricing_hint;
    activeModelDocLink.href = model.doc_url || "https://docs.higgsfield.ai/docs";

    verificationDot.className = model.verified_schema
      ? "verification-dot"
      : "verification-dot warn";
    verificationNoteText.textContent = loc.verification_note;
  }

  function selectModel(modelId) {
    const model = state.models.find((m) => m.id === modelId);
    if (!model) return;
    state.activeModel = model;
    state.formValues = {};
    state.refVideoDuration = 5;
    state.refVideoRawDuration = null;

    for (const field of model.fields) {
      state.formValues[field.name] = structuredClone(field.default_value);
    }

    updateActiveModelHeader(model);

    loadSoulStylesBtn.hidden = model.id !== "soul-v2-standard";
    soulStylesDrawer.hidden = true;
    formErrorBox.hidden = true;
    useCustomJsonToggle.checked = false;

    renderModelList();
    renderFormFields();
    onParametersChanged();
  }

  function probeVideoDuration(source, onUpdated) {
    if (!source) return;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let objectUrl = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      video.removeAttribute("src");
      video.load();
    };

    const applyDetected = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const rawSec = video.duration;
        const billedSec = Math.min(30, Math.max(4, Math.ceil(rawSec)));
        state.refVideoRawDuration = rawSec;
        state.refVideoDuration = billedSec;
        if (onUpdated) onUpdated(rawSec, billedSec);
        onParametersChanged();
      }
      cleanup();
    };

    video.onloadedmetadata = applyDetected;
    video.onerror = () => {
      if (typeof source === "string" && video.crossOrigin) {
        // Retry once without crossOrigin for CDNs that omit CORS headers on metadata
        video.removeAttribute("crossOrigin");
        video.onerror = cleanup;
        video.src = source;
        return;
      }
      cleanup();
    };

    if (typeof source === "string") {
      if (!source.startsWith("http://") && !source.startsWith("https://")) return;
      video.crossOrigin = "anonymous";
      video.src = source;
    } else if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    }
  }

  function getEffectiveEndpoint() {
    if (!state.activeModel) return "";
    if (
      state.activeModel.id === "custom-endpoint" &&
      state.formValues.__custom_endpoint
    ) {
      return String(state.formValues.__custom_endpoint).trim();
    }
    return state.activeModel.endpoint;
  }

  function buildCleanPayloadFromForm() {
    const out = {};
    const endpoint = getEffectiveEndpoint();
    const isAiInfluencer = endpoint.includes("ai-influencer");
    const isSoulV2 = endpoint.includes("soul/v2");
    const humanTiers = new Set(["normal", "freak", "total"]);
    const currentTier = String(state.formValues.tier || "normal");
    const isHumanTier = humanTiers.has(currentTier);
    const hasCustomRef = Boolean(
      state.formValues.custom_reference_id &&
        String(state.formValues.custom_reference_id).trim() !== ""
    );

    const selectionObj = {};

    for (const [k, v] of Object.entries(state.formValues)) {
      if (k === "__custom_endpoint") continue;
      if (k.startsWith("__sel_")) {
        if (isAiInfluencer && typeof v === "string" && v.trim() !== "") {
          const catKey = k.replace("__sel_", "");
          selectionObj[catKey] = [v.trim()];
        }
        continue;
      }
      if (v === null || v === undefined) continue;
      if (isSoulV2 && k === "custom_reference_strength" && !hasCustomRef) {
        continue;
      }
      if (typeof v === "string" && v.trim() === "" && k !== "prompt" && k !== "brief") {
        continue;
      }
      if (Array.isArray(v) && v.length === 0) {
        const fieldDef = state.activeModel?.fields.find((f) => f.name === k);
        if (!fieldDef?.required) continue;
      }
      if (k === "batch_size" && typeof v === "string") {
        const parsed = parseInt(v, 10);
        if (!Number.isNaN(parsed)) {
          out[k] = parsed;
          continue;
        }
      }
      if (isAiInfluencer) {
        if (isHumanTier) {
          if (k === "variation_index") {
            out[k] = 0;
            continue;
          }
          if (k === "body_color" || k === "pinned_species") {
            continue;
          }
        } else {
          // Animal character types reject image_url / item_image_urls with
          // "New animal clothing jobs require a reserved outfit"
          if (k === "image_url" || k === "item_image_urls") {
            continue;
          }
          if (currentTier !== "insects" && k === "pinned_species") {
            continue;
          }
        }
      }
      out[k] = v;
    }

    if (isAiInfluencer && Object.keys(selectionObj).length > 0) {
      out.selection = selectionObj;
    }

    return out;
  }

  /**
   * 0ms Instant Local Tier Cost Calculator
   * 1 Higgsfield Credit = $0.0625 USD (16 credits = $1.00 USD)
   */
  function calculateInstantTierCost() {
    const dict = t();
    const endpoint = getEffectiveEndpoint();
    const v = state.formValues;
    const duration = Math.max(1, Number(v.duration) || 5);
    const refSec = Math.min(30, Math.max(4, Number(state.refVideoDuration) || 5));
    const res = String(v.resolution || "720p").toLowerCase();
    const audioOn = v.generate_audio !== false;
    const bitrate = String(v.bitrate_mode || "high").toLowerCase();
    const batchSize = Math.max(1, Number(v.batch_size) || 1);
    const CREDIT_USD = 0.0625;

    let usd = 0;
    let credits = 0;
    const parts = [];

    if (
      endpoint.includes("seedance-2.5/text-to-video") ||
      endpoint.includes("seedance-2.5/image-to-video")
    ) {
      const baseRatePerSec =
        res === "480p" ? 0.144 : res === "1080p" ? 0.663 : 0.318;
      const audioMult = audioOn ? 1.0 : 0.88;
      const bitMult = bitrate === "standard" ? 0.92 : 1.0;
      const rate = baseRatePerSec * audioMult * bitMult;
      usd = rate * duration;
      credits = usd / CREDIT_USD;
      parts.push(
        `${duration}s`,
        res,
        audioOn ? dict.breakdownAudioOn : dict.breakdownAudioOff
      );
      if (v.output_format) parts.push(String(v.output_format).toUpperCase());
    } else if (
      endpoint.includes("seedance-2.5/reference-to-video") ||
      endpoint.includes("seedance-2.5/video-edit") ||
      endpoint.includes("seedance-2.5/video-extend")
    ) {
      const baseRatePerSec =
        res === "480p" ? 0.1728 : res === "1080p" ? 0.796 : 0.382;
      const audioMult = audioOn ? 1.0 : 0.88;
      const bitMult = bitrate === "standard" ? 0.92 : 1.0;
      const effectiveSec =
        endpoint.includes("video-edit") && state.refVideoRawDuration !== null
          ? refSec
          : duration;
      usd = baseRatePerSec * audioMult * bitMult * effectiveSec;
      credits = usd / CREDIT_USD;
      parts.push(
        `${effectiveSec}s`,
        res,
        audioOn ? dict.breakdownAudioOn : dict.breakdownAudioOff
      );
      if (v.output_format) parts.push(String(v.output_format).toUpperCase());
    } else if (endpoint.includes("wan-3.0-prime")) {
      const ratePerSec =
        res === "480p" ? 0.0272 : res === "720p" ? 0.056 : 0.112;
      usd = ratePerSec * duration;
      credits = usd / CREDIT_USD;
      parts.push(
        `${duration}s`,
        res,
        audioOn ? dict.breakdownAudioOn : dict.breakdownAudioOff
      );
      if (v.enable_thinking) parts.push(dict.breakdownThinkingOn);
    } else if (endpoint.includes("wan-3.0")) {
      const ratePerSec =
        res === "480p" ? 0.02 : res === "1080p" ? 0.08 : 0.04;
      usd = ratePerSec * duration;
      credits = usd / CREDIT_USD;
      parts.push(
        `${duration}s`,
        res,
        audioOn ? dict.breakdownAudioOn : dict.breakdownAudioOff
      );
      if (v.enable_thinking) parts.push(dict.breakdownThinkingOn);
    } else if (endpoint.includes("genjutsu/restyle")) {
      // Official Genjutsu Restyle rate: 5.09 cr/s (480p), 10.90 cr/s (720p), 26.11 cr/s (1080p)
      const listCreditsPerSec =
        res === "480p" ? 5.09 : res === "1080p" ? 26.11 : 10.9;
      const listCredits = listCreditsPerSec * refSec;
      const listUsd = listCredits * CREDIT_USD;
      const discMult =
        state.hasKey && state.accountDiscountPct > 0
          ? 1 - state.accountDiscountPct / 100
          : 1.0;
      usd = listUsd * discMult;
      credits = listCredits * discMult;
      parts.push(
        state.refVideoRawDuration !== null ? `${refSec}s ref` : `~${refSec}s ref`,
        res
      );
      if (discMult < 1.0) {
        parts.push(dict.beforeDiscountList(`$${listUsd.toFixed(2)}`));
      }
    } else if (endpoint.includes("genjutsu")) {
      // Official Genjutsu Motion Transfer & Object Swap rate: 2.544 cr/s (480p), 5.43 cr/s (720p), 13.056 cr/s (1080p)
      const listCreditsPerSec =
        res === "480p" ? 2.544 : res === "1080p" ? 13.056 : 5.43;
      const listCredits = listCreditsPerSec * refSec;
      const listUsd = listCredits * CREDIT_USD;
      const discMult =
        state.hasKey && state.accountDiscountPct > 0
          ? 1 - state.accountDiscountPct / 100
          : 1.0;
      usd = listUsd * discMult;
      credits = listCredits * discMult;
      parts.push(
        state.refVideoRawDuration !== null ? `${refSec}s ref` : `~${refSec}s ref`,
        res
      );
      if (discMult < 1.0) {
        parts.push(dict.beforeDiscountList(`$${listUsd.toFixed(2)}`));
      }
    } else if (endpoint.includes("soul/v2")) {
      const perImageUsd = res === "720p" ? 0.004 : 0.006;
      usd = perImageUsd * batchSize;
      credits = usd / CREDIT_USD;
      parts.push(`${batchSize} img`, res, String(v.aspect_ratio || "3:4"));
    } else if (endpoint.includes("soul/cinema")) {
      const perImageUsd = res === "720p" ? 0.004 : 0.006;
      usd = perImageUsd * batchSize;
      credits = usd / CREDIT_USD;
      parts.push(`${batchSize} img`, res, String(v.aspect_ratio || "16:9"));
    } else if (endpoint.includes("ai-influencer")) {
      usd = 0.05;
      credits = usd / CREDIT_USD;
      parts.push(`tier: ${v.tier || "normal"}`, dict.breakdownSheet);
    } else if (endpoint.includes("soul-id")) {
      usd = 2.5;
      credits = 40.0;
      parts.push(dict.breakdownCharLock);
    } else if (endpoint.includes("cinema-studio")) {
      const ratePerSec = res === "480p" ? 0.2057 : 0.4623;
      usd = ratePerSec * duration;
      credits = usd / CREDIT_USD;
      parts.push(`${duration}s`, res, String(v.aspect_ratio || "16:9"));
    } else if (endpoint.includes("kling-video/v3.0")) {
      const soundOn = String(v.sound || "on") === "on";
      const ratePerSec = soundOn ? 0.1428 : 0.0952;
      usd = ratePerSec * duration;
      credits = usd / CREDIT_USD;
      parts.push(
        `${duration}s`,
        soundOn ? dict.breakdownSoundOn : dict.breakdownSoundOff,
        String(v.aspect_ratio || "16:9")
      );
    } else if (endpoint.includes("ltx-2.5")) {
      const ratePerSec = res === "1080p" ? 0.17 : 0.12;
      usd = ratePerSec * duration;
      credits = usd / CREDIT_USD;
      parts.push(`${duration}s`, res, String(v.aspect_ratio || "16:9"));
    } else if (endpoint.includes("recraft")) {
      usd = 0.21;
      credits = usd / CREDIT_USD;
      parts.push(res || "2k", String(v.aspect_ratio || "16:9"));
    } else if (endpoint.includes("grok-imagine")) {
      const qual = String(v.quality || "medium").toLowerCase();
      usd =
        res === "2k"
          ? qual === "low"
            ? 0.06
            : 0.08
          : qual === "low"
          ? 0.04
          : 0.07;
      credits = usd / CREDIT_USD;
      parts.push(res, qual);
    } else if (endpoint.includes("marketing-studio")) {
      const qual = String(v.quality || "high").toLowerCase();
      const table = {
        "1k": { low: 0.0138, medium: 0.0439, high: 0.138 },
        "2k": { low: 0.0189, medium: 0.0665, high: 0.2045 },
        "4k": { low: 0.0565, medium: 0.2, high: 0.6136 },
      };
      usd = table[res]?.[qual] ?? 0.2045;
      credits = usd / CREDIT_USD;
      parts.push(res, qual, String(v.aspect_ratio || "auto"));
    } else {
      usd = 0.25 * duration;
      credits = usd / CREDIT_USD;
      parts.push(res || "default");
    }

    const fmtUsd = usd < 0.05 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
    const fmtCredits =
      credits < 1
        ? `~${credits.toFixed(3)} ${dict.creditsUnit}`
        : `~${credits.toFixed(1)} ${dict.creditsUnit}`;

    return {
      usdStr: fmtUsd,
      creditsStr: fmtCredits,
      breakdownStr: parts.join(" · "),
    };
  }

  function updateCostUIInstant() {
    const dict = t();
    const est = calculateInstantTierCost();
    liveCostUsd.textContent = est.usdStr;
    liveCostCredits.textContent = est.creditsStr;
    liveCostBreakdown.textContent = est.breakdownStr;
    liveCostSourceBadge.textContent = state.hasKey
      ? dict.syncingEstimate
      : dict.instantTierCalc;
    liveCostSourceBadge.className = "live-cost-source-badge";
    liveCostSourceBadge.removeAttribute("title");
    if (!state.isSubmitting && submitBtnText) {
      submitBtnText.textContent = `${dict.generateMedia} · ${est.usdStr}`;
    }

    if (monitorSpecPill) {
      const ar = String(state.formValues.aspect_ratio || "16:9").toUpperCase();
      const res = String(
        state.formValues.resolution || state.formValues.tier || "HD"
      ).toUpperCase();
      monitorSpecPill.textContent = `${ar} · ${res}`;
    }
  }

  function scheduleLiveApiEstimate(immediate = false) {
    if (state.estimateDebounceTimer) {
      clearTimeout(state.estimateDebounceTimer);
    }
    if (!state.hasKey) {
      liveCostSourceBadge.textContent = t().instantTierCalc;
      return;
    }
    const waitMs = immediate ? 10 : 260;
    state.estimateDebounceTimer = setTimeout(() => {
      runLiveApiEstimate();
    }, waitMs);
  }

  async function runLiveApiEstimate() {
    let payload;
    try {
      payload = getActiveRequestPayload();
    } catch (_) {
      return;
    }
    const endpoint = getEffectiveEndpoint();
    if (!endpoint) return;

    const seq = ++state.estimateRequestSeq;
    refreshEstimateBtn.disabled = true;

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, input: payload }),
      });
      const data = await res.json();
      if (seq !== state.estimateRequestSeq) return;

      const dict = t();
      if (!res.ok) {
        liveCostSourceBadge.textContent = dict.instantTierCalc;
        liveCostSourceBadge.className = "live-cost-source-badge";
        return;
      }

      const discountObj =
        data.discount && typeof data.discount === "object" ? data.discount : null;
      if (discountObj && discountObj.percentage !== undefined) {
        const parsedPct = parseFloat(String(discountObj.percentage));
        if (!Number.isNaN(parsedPct) && parsedPct >= 0 && parsedPct < 100) {
          state.accountDiscountPct = parsedPct;
        }
      }

      // IMPORTANT: data.usd and data.credits are the net price charged;
      // discountObj.usd and discountObj.credits are the savings subtracted!
      const rawCredits = data.credits ?? data.cost?.credits ?? null;
      const rawUsd = data.usd ?? data.cost?.usd ?? null;

      if (rawUsd !== null || rawCredits !== null) {
        if (rawUsd !== null) {
          const numUsd = Number(rawUsd);
          const usdFormatted = Number.isNaN(numUsd)
            ? `$${rawUsd}`
            : numUsd < 0.05
            ? `$${numUsd.toFixed(4)}`
            : `$${numUsd.toFixed(3)}`;
          liveCostUsd.textContent = usdFormatted;
          if (!state.isSubmitting && submitBtnText) {
            submitBtnText.textContent = `${dict.generateMedia} · ${usdFormatted}`;
          }
        }
        if (rawCredits !== null) {
          liveCostCredits.textContent = `${rawCredits} ${dict.creditsUnit}`;
        }
        liveCostSourceBadge.textContent = discountObj?.percentage
          ? dict.accountQuoteDiscount(discountObj.percentage)
          : dict.verifiedAccountQuote;
        liveCostSourceBadge.className = "live-cost-source-badge verified-api";
        liveCostSourceBadge.removeAttribute("title");
      } else if (data.type === "description" || typeof data.pricing_description === "string") {
        // Endpoints like Genjutsu, Seedance 2.5, and Wan 3.0 return { type: "description", pricing_description: "..." }
        const est = calculateInstantTierCost();
        liveCostUsd.textContent = est.usdStr;
        liveCostCredits.textContent = est.creditsStr;
        liveCostBreakdown.textContent = est.breakdownStr;
        if (!state.isSubmitting && submitBtnText) {
          submitBtnText.textContent = `${dict.generateMedia} · ${est.usdStr}`;
        }
        liveCostSourceBadge.textContent =
          state.accountDiscountPct > 0
            ? dict.accountQuoteDiscount(`${state.accountDiscountPct}%`)
            : dict.verifiedRateTable;
        liveCostSourceBadge.className = "live-cost-source-badge verified-api";
        if (data.pricing_description) {
          liveCostSourceBadge.title = data.pricing_description;
        }
      } else {
        liveCostSourceBadge.textContent = dict.instantTierCalc;
        liveCostSourceBadge.className = "live-cost-source-badge";
      }
    } catch (_) {
      if (seq === state.estimateRequestSeq) {
        liveCostSourceBadge.textContent = t().instantTierCalc;
        liveCostSourceBadge.className = "live-cost-source-badge";
      }
    } finally {
      if (seq === state.estimateRequestSeq) {
        refreshEstimateBtn.disabled = false;
      }
    }
  }

  function syncConditionalFieldVisibility() {
    if (!state.activeModel || !dynamicFieldsContainer) return;
    const isAiInfluencer =
      state.activeModel.id === "ai-influencer" ||
      String(state.activeModel.endpoint || "").includes("ai-influencer");
    const isSoulV2 =
      state.activeModel.id === "soul-v2-standard" ||
      String(state.activeModel.endpoint || "").includes("soul/v2/standard");

    const currentTier = String(state.formValues.tier || "normal");
    const isHumanTier = ["normal", "freak", "total"].includes(currentTier);
    const hasCustomRef = Boolean(
      state.formValues.custom_reference_id &&
        String(state.formValues.custom_reference_id).trim() !== ""
    );

    dynamicFieldsContainer.querySelectorAll(".field-group").forEach((groupEl) => {
      const fName = groupEl.dataset.fieldName;
      if (!fName) return;
      if (isAiInfluencer) {
        if (fName === "image_url" || fName === "item_image_urls") {
          groupEl.hidden = !isHumanTier;
          return;
        }
        if (fName === "variation_index" || fName === "body_color") {
          groupEl.hidden = isHumanTier;
          return;
        }
        if (fName === "pinned_species") {
          groupEl.hidden = currentTier !== "insects";
          return;
        }
      }
      if (isSoulV2 && fName === "custom_reference_strength") {
        groupEl.hidden = !hasCustomRef;
        return;
      }
      groupEl.hidden = false;
    });
  }

  function onParametersChanged() {
    syncConditionalFieldVisibility();
    syncJsonInspector();
    updateCostUIInstant();
    scheduleLiveApiEstimate(false);
    if (
      !state.activeStageJobId ||
      !state.jobs.some((j) => j.request_id === state.activeStageJobId)
    ) {
      renderOutputStage();
    }
  }

  function syncJsonInspector() {
    const endpoint = getEffectiveEndpoint();
    activeModelEndpoint.textContent = endpoint;
    jsonEndpointPreview.textContent = `/${endpoint}`;

    const payloadObj = buildCleanPayloadFromForm();
    const jsonFormatted = JSON.stringify(payloadObj, null, 2);

    if (state.activeCodeTab === "json") {
      customJsonToggleLabel.hidden = false;
      rawJsonTextarea.readOnly = !useCustomJsonToggle.checked;
      if (!useCustomJsonToggle.checked) {
        rawJsonTextarea.value = jsonFormatted;
      }
    } else if (state.activeCodeTab === "curl") {
      customJsonToggleLabel.hidden = true;
      rawJsonTextarea.readOnly = true;
      const singleLine = JSON.stringify(payloadObj).replace(/'/g, "'\\''");
      rawJsonTextarea.value =
        `curl -X POST "https://api.higgsfield.ai/${endpoint}" \\\n` +
        `  -H "Authorization: Key \${HF_API_KEY}" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${singleLine}'`;
    } else if (state.activeCodeTab === "ts") {
      customJsonToggleLabel.hidden = true;
      rawJsonTextarea.readOnly = true;
      rawJsonTextarea.value =
        `import { config, higgsfield } from "@higgsfield/client/v2";\n\n` +
        `config({ credentials: process.env.HF_CREDENTIALS });\n\n` +
        `const result = await higgsfield.subscribe("${endpoint}", {\n` +
        `  input: ${jsonFormatted.replace(/\n/g, "\n  ")},\n` +
        `  withPolling: true,\n` +
        `});\n` +
        `console.log(result);`;
    }
  }

  function attachDropzone(element, onFilesDropped) {
    element.addEventListener("dragover", (e) => {
      e.preventDefault();
      element.classList.add("dropzone-active");
    });
    element.addEventListener("dragleave", () => {
      element.classList.remove("dropzone-active");
    });
    element.addEventListener("drop", async (e) => {
      e.preventDefault();
      element.classList.remove("dropzone-active");
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        await onFilesDropped(files);
      }
    });
  }

  function getAspectFrameDimensions(ratioVal, scale = 1) {
    const map = {
      "16:9": [26, 15],
      "9:16": [15, 26],
      "21:9": [30, 13],
      "4:3": [22, 17],
      "3:4": [17, 22],
      "1:1": [19, 19],
      "2:3": [16, 24],
      "3:2": [24, 16],
      "4:5": [17, 21],
      adaptive: [24, 16],
      auto: [24, 16],
    };
    const [w, h] = map[String(ratioVal).toLowerCase()] || [22, 16];
    return [Math.round(w * scale), Math.round(h * scale)];
  }

  function syncDurationFieldInDOM(valNum) {
    if (!dynamicFieldsContainer) return;
    const durGroup = dynamicFieldsContainer.querySelector(
      '.field-group[data-field-name="duration"]'
    );
    if (!durGroup) return;
    const slider = durGroup.querySelector(".duration-slider");
    const badge = durGroup.querySelector(".duration-value-badge");
    if (slider) slider.value = String(valNum);
    if (badge) badge.textContent = `${valNum}s`;
    durGroup.querySelectorAll(".duration-chip").forEach((c) => {
      c.classList.toggle("active", Number(c.dataset.sec) === valNum);
    });
  }

  function renderFormFields() {
    dynamicFieldsContainer.innerHTML = "";
    if (!state.activeModel) return;
    const dict = t();

    for (const field of state.activeModel.fields) {
      const fMeta = getLocalizedFieldMeta(field);
      const wrapper = document.createElement("div");
      wrapper.className = "field-group";
      wrapper.dataset.fieldName = field.name;

      // 1. Custom Animated Toggle Switch for Booleans
      if (field.field_type === "boolean") {
        const card = document.createElement("div");
        card.className = "toggle-switch-card";
        card.setAttribute("role", "switch");
        const isChecked = Boolean(state.formValues[field.name]);
        card.setAttribute("aria-checked", isChecked ? "true" : "false");
        card.tabIndex = 0;

        const textCol = document.createElement("div");
        textCol.className = "toggle-switch-text";
        textCol.innerHTML = `
          <span class="toggle-switch-title">${escapeHtml(fMeta.label)}</span>
          <span class="toggle-switch-desc">${escapeHtml(fMeta.description)}</span>
        `;

        const track = document.createElement("div");
        track.className = "toggle-track" + (isChecked ? " on" : "");
        const thumb = document.createElement("div");
        thumb.className = "toggle-thumb";
        track.appendChild(thumb);

        const toggleAction = () => {
          const next = !state.formValues[field.name];
          state.formValues[field.name] = next;
          card.setAttribute("aria-checked", next ? "true" : "false");
          track.className = "toggle-track" + (next ? " on" : "");
          onParametersChanged();
        };

        card.addEventListener("click", toggleAction);
        card.addEventListener("keydown", (e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggleAction();
          }
        });

        card.appendChild(textCol);
        card.appendChild(track);
        wrapper.appendChild(card);
        dynamicFieldsContainer.appendChild(wrapper);
        continue;
      }

      // Label Row
      const labelRow = document.createElement("div");
      labelRow.className = "field-label-row";
      const labelEl = document.createElement("label");
      labelEl.textContent = fMeta.label;
      labelRow.appendChild(labelEl);

      if (field.required) {
        const reqTag = document.createElement("span");
        reqTag.className = "required-tag";
        reqTag.textContent = dict.requiredTag;
        labelRow.appendChild(reqTag);
      }
      wrapper.appendChild(labelRow);

      // 2. Prompt / Brief Textarea
      if (field.field_type === "textarea") {
        const ta = document.createElement("textarea");
        ta.rows = 3;
        ta.value = state.formValues[field.name] ?? "";
        ta.placeholder = fMeta.description;
        ta.addEventListener("input", () => {
          state.formValues[field.name] = ta.value;
          syncJsonInspector();
        });
        wrapper.appendChild(ta);
      }
      // 3. Visual Aspect Ratio Tiles
      else if (
        field.field_type === "select" &&
        field.name === "aspect_ratio" &&
        Array.isArray(field.options)
      ) {
        const grid = document.createElement("div");
        grid.className = "aspect-grid";

        const renderTiles = () => {
          grid.innerHTML = "";
          for (const opt of field.options) {
            const tile = document.createElement("button");
            tile.type = "button";
            const isSelected =
              String(state.formValues[field.name]) === String(opt.value);
            tile.className = "aspect-tile" + (isSelected ? " active" : "");

            const [fw, fh] = getAspectFrameDimensions(opt.value, 1);
            const frame = document.createElement("span");
            frame.className = "aspect-frame-preview";
            frame.style.width = `${fw}px`;
            frame.style.height = `${fh}px`;

            const lbl = document.createElement("span");
            lbl.className = "aspect-tile-label";
            lbl.textContent = String(opt.value).toUpperCase();

            tile.appendChild(frame);
            tile.appendChild(lbl);
            tile.title = getLocalizedOptionLabel(opt.label);
            tile.addEventListener("click", () => {
              state.formValues[field.name] = opt.value;
              renderTiles();
              onParametersChanged();
            });
            grid.appendChild(tile);
          }
        };
        renderTiles();
        wrapper.appendChild(grid);
      }
      // 4. Tactile Segmented Pill Bar for Select Enums
      else if (field.field_type === "select" && Array.isArray(field.options)) {
        const seg = document.createElement("div");
        seg.className = "segmented-control";

        const renderSegments = () => {
          seg.innerHTML = "";
          for (const opt of field.options) {
            const btn = document.createElement("button");
            btn.type = "button";
            const isSelected =
              String(state.formValues[field.name]) === String(opt.value);
            btn.className = "segment-btn" + (isSelected ? " active" : "");
            btn.textContent = getLocalizedOptionLabel(opt.label);
            btn.addEventListener("click", () => {
              state.formValues[field.name] = opt.value;
              renderSegments();
              onParametersChanged();
            });
            seg.appendChild(btn);
          }
        };
        renderSegments();
        wrapper.appendChild(seg);
      }
      // 5. Interactive Duration Range Slider + Preset Chips
      else if (
        field.field_type === "number" &&
        field.name === "duration" &&
        field.min !== null &&
        field.max !== null
      ) {
        const box = document.createElement("div");
        box.className = "duration-control-box";

        const sliderRow = document.createElement("div");
        sliderRow.className = "duration-slider-row";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "duration-slider";
        slider.min = String(field.min ?? 2);
        slider.max = String(field.max ?? 30);
        slider.step = String(field.step ?? 1);
        slider.value = String(state.formValues[field.name] ?? 5);

        const badge = document.createElement("span");
        badge.className = "duration-value-badge";
        badge.textContent = `${slider.value}s`;

        const chipsRow = document.createElement("div");
        chipsRow.className = "duration-chips";
        const minSec = field.min ?? 2;
        const maxSec = field.max ?? 30;
        const stepSec = field.step ?? 1;
        const presetSecs = [3, 4, 5, 6, 8, 10, 15, 20, 30].filter(
          (s) => s >= minSec && s <= maxSec && (s - minSec) % stepSec === 0
        );

        const updateDurationUI = (valNum) => {
          state.formValues[field.name] = valNum;
          slider.value = String(valNum);
          badge.textContent = `${valNum}s`;
          chipsRow.querySelectorAll(".duration-chip").forEach((c) => {
            c.classList.toggle("active", Number(c.dataset.sec) === valNum);
          });
          onParametersChanged();
        };

        for (const sec of presetSecs) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className =
            "duration-chip" +
            (Number(state.formValues[field.name]) === sec ? " active" : "");
          chip.dataset.sec = String(sec);
          chip.textContent = `${sec}s`;
          chip.addEventListener("click", () => updateDurationUI(sec));
          chipsRow.appendChild(chip);
        }

        slider.addEventListener("input", () => {
          updateDurationUI(Number(slider.value));
        });

        sliderRow.appendChild(slider);
        sliderRow.appendChild(badge);
        box.appendChild(sliderRow);
        box.appendChild(chipsRow);
        wrapper.appendChild(box);
      }
      // 6. Standard Numeric Input
      else if (field.field_type === "number") {
        const num = document.createElement("input");
        num.type = "number";
        if (field.min !== undefined && field.min !== null) num.min = String(field.min);
        if (field.max !== undefined && field.max !== null) num.max = String(field.max);
        if (field.step !== undefined && field.step !== null) num.step = String(field.step);
        num.value = state.formValues[field.name] ?? "";
        num.placeholder = fMeta.description;
        num.addEventListener("input", () => {
          const parsed = num.value === "" ? null : Number(num.value);
          state.formValues[field.name] = Number.isNaN(parsed) ? null : parsed;
          onParametersChanged();
        });
        wrapper.appendChild(num);
      }
      // 7. Studio Media Dropzone for Single URL
      else if (
        field.field_type === "image_url" ||
        field.field_type === "video_url" ||
        field.field_type === "audio_url"
      ) {
        const dropzone = document.createElement("div");
        dropzone.className = "studio-dropzone";

        const formatTag =
          field.field_type === "video_url"
            ? "MP4 · MOV · WEBM"
            : field.field_type === "audio_url"
            ? "WAV · MP3"
            : "PNG · JPG · WEBP";

        const topRow = document.createElement("div");
        topRow.className = "dropzone-header-row";
        topRow.innerHTML = `<span class="dropzone-Format-tag">${escapeHtml(
          dict.dropSingleMedia(formatTag)
        )}</span>`;

        const row = document.createElement("div");
        row.className = "upload-row";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "https://...";
        input.value = state.formValues[field.name] ?? "";

        const previewBox = document.createElement("div");
        previewBox.className = "upload-preview-thumb";
        const updateThumb = (urlStr) => {
          previewBox.innerHTML = "";
          if (!urlStr) return;
          if (field.field_type === "image_url") {
            const img = document.createElement("img");
            img.src = urlStr;
            img.alt = "Reference preview";
            previewBox.appendChild(img);
          } else if (field.field_type === "video_url") {
            const vid = document.createElement("video");
            vid.src = urlStr;
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = "metadata";
            vid.className = "chip-media-thumb";
            previewBox.appendChild(vid);
          }
        };
        updateThumb(input.value);

        let syncRefDurationUI = null;

        input.addEventListener("input", () => {
          const val = input.value.trim();
          state.formValues[field.name] = val;
          updateThumb(val);
          if (field.field_type === "video_url" && val) {
            probeVideoDuration(val, (_rawSec, billedSec) => {
              if ("duration" in state.formValues) {
                state.formValues.duration = billedSec;
                syncDurationFieldInDOM(billedSec);
              }
              if (syncRefDurationUI) syncRefDurationUI();
            });
          }
          onParametersChanged();
        });

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.hidden = true;
        fileInput.accept =
          field.field_type === "video_url"
            ? "video/mp4,video/quicktime,video/webm"
            : field.field_type === "audio_url"
            ? "audio/wav,audio/mpeg,audio/mp3"
            : "image/png,image/jpeg,image/webp,image/gif";

        const uploadBtn = document.createElement("button");
        uploadBtn.type = "button";
        uploadBtn.className = "btn btn-secondary btn-sm";
        uploadBtn.textContent = dict.browseFile;
        uploadBtn.addEventListener("click", () => fileInput.click());

        const handleSingleFile = async (file) => {
          if (field.field_type === "video_url") {
            // Immediately probe local video metadata (0ms) before upload completes
            probeVideoDuration(file, (_rawSec, billedSec) => {
              if ("duration" in state.formValues) {
                state.formValues.duration = billedSec;
                syncDurationFieldInDOM(billedSec);
              }
              if (syncRefDurationUI) syncRefDurationUI();
            });
          }
          uploadBtn.disabled = true;
          uploadBtn.textContent = dict.uploading;
          try {
            const publicUrl = await uploadReferenceFile(file);
            state.formValues[field.name] = publicUrl;
            input.value = publicUrl;
            updateThumb(publicUrl);
            onParametersChanged();
            showToast(t().uploadedSingleToast, "ok");
          } catch (err) {
            showFormError(err.message || String(err));
          } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = t().browseFile;
            fileInput.value = "";
          }
        };

        fileInput.addEventListener("change", async () => {
          const file = fileInput.files?.[0];
          if (file) await handleSingleFile(file);
        });

        attachDropzone(dropzone, async (files) => {
          if (files[0]) await handleSingleFile(files[0]);
        });

        row.appendChild(input);
        row.appendChild(uploadBtn);
        row.appendChild(fileInput);
        dropzone.appendChild(topRow);
        dropzone.appendChild(row);
        dropzone.appendChild(previewBox);

        // Reference Video Duration Bar for video-input models (especially Genjutsu)
        const modelHasOwnDurationField = state.activeModel.fields.some(
          (f) => f.name === "duration"
        );
        if (field.field_type === "video_url" && !modelHasOwnDurationField) {
          const refDurBox = document.createElement("div");
          refDurBox.className = "ref-video-duration-bar";

          const refTop = document.createElement("div");
          refTop.className = "ref-video-duration-top";

          const refLabel = document.createElement("span");
          refLabel.className = "ref-video-duration-label";
          refLabel.textContent = dict.refVideoDurationLabel;

          const refStatusBadge = document.createElement("span");
          refStatusBadge.className = "ref-video-duration-status";

          refTop.appendChild(refLabel);
          refTop.appendChild(refStatusBadge);

          const sliderRow = document.createElement("div");
          sliderRow.className = "duration-slider-row";

          const refSlider = document.createElement("input");
          refSlider.type = "range";
          refSlider.className = "duration-slider";
          refSlider.min = "4";
          refSlider.max = "30";
          refSlider.step = "1";
          refSlider.value = String(state.refVideoDuration || 5);

          const refValBadge = document.createElement("span");
          refValBadge.className = "duration-value-badge";
          refValBadge.textContent = `${refSlider.value}s`;

          const refChips = document.createElement("div");
          refChips.className = "duration-chips";
          const refPresetSecs = [4, 5, 8, 10, 15, 20, 30];

          syncRefDurationUI = () => {
            const d = t();
            const sec = Math.min(30, Math.max(4, Number(state.refVideoDuration) || 5));
            refSlider.value = String(sec);
            refValBadge.textContent = `${sec}s`;
            if (state.refVideoRawDuration !== null) {
              refStatusBadge.textContent = d.refVideoDetectedBadge(
                state.refVideoRawDuration,
                sec
              );
              refStatusBadge.classList.add("detected");
            } else {
              refStatusBadge.textContent = d.refVideoManualBadge(sec);
              refStatusBadge.classList.remove("detected");
            }
            refChips.querySelectorAll(".duration-chip").forEach((c) => {
              c.classList.toggle("active", Number(c.dataset.sec) === sec);
            });
          };

          const setManualRefDuration = (secNum) => {
            state.refVideoDuration = secNum;
            state.refVideoRawDuration = null;
            syncRefDurationUI();
            onParametersChanged();
          };

          for (const sec of refPresetSecs) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className =
              "duration-chip" + (state.refVideoDuration === sec ? " active" : "");
            chip.dataset.sec = String(sec);
            chip.textContent = `${sec}s`;
            chip.addEventListener("click", () => setManualRefDuration(sec));
            refChips.appendChild(chip);
          }

          refSlider.addEventListener("input", () => {
            setManualRefDuration(Number(refSlider.value));
          });

          sliderRow.appendChild(refSlider);
          sliderRow.appendChild(refValBadge);
          refDurBox.appendChild(refTop);
          refDurBox.appendChild(sliderRow);
          refDurBox.appendChild(refChips);
          syncRefDurationUI();
          dropzone.appendChild(refDurBox);
        }

        wrapper.appendChild(dropzone);
      }
      // 8. Studio Media Dropzone for Multi-Media URLs (image_urls, audio_urls, video_urls)
      else if (
        field.field_type === "image_urls" ||
        field.field_type === "audio_urls" ||
        field.field_type === "video_urls"
      ) {
        const dropzone = document.createElement("div");
        dropzone.className = "studio-dropzone";

        const dropHeaderLabel =
          field.field_type === "audio_urls"
            ? dict.dropMultiAudios
            : field.field_type === "video_urls"
            ? dict.dropMultiVideos
            : dict.dropMultiImages;

        const topRow = document.createElement("div");
        topRow.className = "dropzone-header-row";
        topRow.innerHTML = `<span class="dropzone-Format-tag">${escapeHtml(
          dropHeaderLabel
        )}</span>`;

        const listContainer = document.createElement("div");
        listContainer.className = "multi-urls-list";

        const renderChips = () => {
          listContainer.innerHTML = "";
          const urls = Array.isArray(state.formValues[field.name])
            ? state.formValues[field.name]
            : [];
          const refPrefix =
            field.field_type === "video_urls"
              ? "@Video"
              : field.field_type === "audio_urls"
              ? "@Audio"
              : "@Image";

          urls.forEach((urlStr, idx) => {
            const chip = document.createElement("div");
            chip.className = "multi-url-chip";

            const leftGroup = document.createElement("div");
            leftGroup.className = "multi-url-chip-left";

            let vidEl = null;
            if (field.field_type === "image_urls") {
              const img = document.createElement("img");
              img.src = urlStr;
              img.alt = `${refPrefix}${idx + 1}`;
              img.className = "chip-media-thumb";
              leftGroup.appendChild(img);
            } else if (field.field_type === "video_urls") {
              vidEl = document.createElement("video");
              vidEl.src = urlStr;
              vidEl.muted = true;
              vidEl.playsInline = true;
              vidEl.preload = "metadata";
              vidEl.className = "chip-media-thumb";
              leftGroup.appendChild(vidEl);
            }

            const tagBadge = document.createElement("span");
            tagBadge.className = "multi-url-ref-tag";
            tagBadge.textContent = `${refPrefix}${idx + 1}`;
            leftGroup.appendChild(tagBadge);

            if (vidEl) {
              const durBadge = document.createElement("span");
              durBadge.className = "multi-url-dur-badge";
              durBadge.hidden = true;
              leftGroup.appendChild(durBadge);
              vidEl.addEventListener("loadedmetadata", () => {
                if (Number.isFinite(vidEl.duration) && vidEl.duration > 0) {
                  durBadge.textContent = `${vidEl.duration.toFixed(1)}s`;
                  durBadge.hidden = false;
                  if (vidEl.duration > 30) {
                    durBadge.classList.add("over-limit");
                    durBadge.title =
                      state.lang === "pt-br"
                        ? "Limite máximo de referência é 30s totais"
                        : "Max reference video limit is 30s total";
                  }
                }
              });
            }

            const urlText = document.createElement("span");
            urlText.className = "multi-url-text";
            urlText.textContent = urlStr;
            leftGroup.appendChild(urlText);

            const rmBtn = document.createElement("button");
            rmBtn.type = "button";
            rmBtn.className = "btn-close-xs";
            rmBtn.textContent = "×";
            rmBtn.addEventListener("click", () => {
              state.formValues[field.name].splice(idx, 1);
              renderChips();
              onParametersChanged();
            });
            chip.appendChild(leftGroup);
            chip.appendChild(rmBtn);
            listContainer.appendChild(chip);
          });
        };

        const row = document.createElement("div");
        row.className = "upload-row";
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.placeholder = "https://...";

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn btn-ghost btn-sm";
        addBtn.textContent = dict.addUrl;
        addBtn.addEventListener("click", () => {
          const val = urlInput.value.trim();
          if (!val) return;
          if (!Array.isArray(state.formValues[field.name])) {
            state.formValues[field.name] = [];
          }
          state.formValues[field.name].push(val);
          urlInput.value = "";
          if (field.field_type === "video_urls") {
            probeVideoDuration(val, (_rawSec, billedSec) => {
              if ("duration" in state.formValues) {
                state.formValues.duration = billedSec;
                syncDurationFieldInDOM(billedSec);
              }
            });
          }
          renderChips();
          onParametersChanged();
        });

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.hidden = true;
        fileInput.accept =
          field.field_type === "audio_urls"
            ? "audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg"
            : field.field_type === "video_urls"
            ? "video/mp4,video/quicktime,video/webm"
            : "image/png,image/jpeg,image/webp";

        const uploadBtn = document.createElement("button");
        uploadBtn.type = "button";
        uploadBtn.className = "btn btn-secondary btn-sm";
        uploadBtn.textContent = dict.browseFiles;
        uploadBtn.addEventListener("click", () => fileInput.click());

        const handleMultipleFiles = async (files) => {
          if (field.field_type === "video_urls" && files[0]) {
            probeVideoDuration(files[0], (_rawSec, billedSec) => {
              if ("duration" in state.formValues) {
                state.formValues.duration = billedSec;
                syncDurationFieldInDOM(billedSec);
              }
            });
          }
          uploadBtn.disabled = true;
          uploadBtn.textContent = t().uploading;
          try {
            for (const f of files) {
              const publicUrl = await uploadReferenceFile(f);
              if (!Array.isArray(state.formValues[field.name])) {
                state.formValues[field.name] = [];
              }
              state.formValues[field.name].push(publicUrl);
            }
            renderChips();
            onParametersChanged();
            showToast(t().uploadedMultiToast(files.length), "ok");
          } catch (err) {
            showFormError(err.message || String(err));
          } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = t().browseFiles;
            fileInput.value = "";
          }
        };

        fileInput.addEventListener("change", async () => {
          const files = Array.from(fileInput.files || []);
          if (files.length) await handleMultipleFiles(files);
        });

        attachDropzone(dropzone, handleMultipleFiles);

        row.appendChild(urlInput);
        row.appendChild(addBtn);
        row.appendChild(uploadBtn);
        row.appendChild(fileInput);

        renderChips();
        dropzone.appendChild(topRow);
        dropzone.appendChild(listContainer);
        dropzone.appendChild(row);
        wrapper.appendChild(dropzone);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.value = state.formValues[field.name] ?? "";
        input.placeholder = fMeta.description;
        input.addEventListener("input", () => {
          state.formValues[field.name] = input.value;
          onParametersChanged();
        });
        wrapper.appendChild(input);
      }

      if (fMeta.description && field.field_type !== "textarea") {
        const hint = document.createElement("span");
        hint.className = "field-hint";
        hint.textContent = fMeta.description;
        wrapper.appendChild(hint);
      }

      dynamicFieldsContainer.appendChild(wrapper);
    }

    syncConditionalFieldVisibility();
  }

  async function uploadReferenceFile(file) {
    const contentType = file.type || "image/png";
    const presignRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType }),
    });

    const presignData = await presignRes.json();
    if (!presignRes.ok) {
      throw new Error(presignData.error || "Failed to generate presigned upload URL.");
    }

    const putHeaders = new Headers();
    if (presignData.upload_headers && typeof presignData.upload_headers === "object") {
      for (const [hk, hv] of Object.entries(presignData.upload_headers)) {
        putHeaders.set(hk, String(hv));
      }
    }
    if (!putHeaders.has("Content-Type")) {
      putHeaders.set("Content-Type", contentType);
    }

    const putRes = await fetch(presignData.upload_url, {
      method: "PUT",
      headers: putHeaders,
      body: file,
      credentials: "omit",
    });

    if (!putRes.ok) {
      throw new Error(`Storage PUT failed with HTTP ${putRes.status}.`);
    }

    return presignData.public_url;
  }

  function getActiveRequestPayload() {
    if (state.activeCodeTab === "json" && useCustomJsonToggle.checked) {
      try {
        return JSON.parse(rawJsonTextarea.value);
      } catch (e) {
        throw new Error(t().invalidJsonError(e.message));
      }
    }
    return buildCleanPayloadFromForm();
  }

  function showFormError(msg) {
    if (!msg) {
      formErrorBox.hidden = true;
      formErrorBox.textContent = "";
      return;
    }
    formErrorBox.hidden = false;
    formErrorBox.textContent = msg;
  }

  async function handleSubmitGeneration(e) {
    if (e) e.preventDefault();
    if (state.isSubmitting) return;
    showFormError("");

    let payload;
    try {
      payload = getActiveRequestPayload();
    } catch (err) {
      showFormError(err.message);
      return;
    }

    if (
      state.activeModel &&
      Array.isArray(state.activeModel.fields) &&
      !useCustomJsonToggle.checked
    ) {
      for (const field of state.activeModel.fields) {
        if (!field.required) continue;
        const val = payload[field.name];
        const missing =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);
        if (missing) {
          const fMeta = getLocalizedFieldMeta(field);
          showFormError(t().missingRequiredError(fMeta.label, field.name));
          return;
        }
      }
    }

    const endpoint = getEffectiveEndpoint();
    if (
      endpoint.endsWith("reference-to-video") &&
      !useCustomJsonToggle.checked
    ) {
      const hasAnyArrayRef = ["image_urls", "audio_urls", "video_urls"].some(
        (k) => Array.isArray(payload[k]) && payload[k].length > 0
      );
      const hasAnyDocRef = ["file_url", "link_url"].some(
        (k) => typeof payload[k] === "string" && payload[k].trim() !== ""
      );
      if (!hasAnyArrayRef && !hasAnyDocRef) {
        showFormError(t().missingR2vRefError);
        return;
      }
    }
    const idempotencyKey = generateUuid();

    state.isSubmitting = true;
    submitGenerateBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = t().submitting;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: state.activeModel?.id ? `${state.activeModel.id}:verified` : "custom",
          endpoint,
          model_name: state.activeModel?.name || endpoint,
          category: state.activeModel?.category || "video",
          input: payload,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFormError(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error || data)
        );
        return;
      }

      upsertJob(data);
      state.activeStageJobId = data.request_id;
      renderOutputStage();
      renderJobsList();
      startPollingJob(data.request_id);
      showToast(t().submittedToast(data.request_id.slice(0, 8)), "ok");
    } catch (err) {
      showFormError(err.message || String(err));
    } finally {
      state.isSubmitting = false;
      submitGenerateBtn.disabled = false;
      updateCostUIInstant();
      scheduleLiveApiEstimate(true);
    }
  }

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      state.jobs = data.jobs || [];
      if (state.jobs.length > 0 && !state.activeStageJobId) {
        state.activeStageJobId = state.jobs[0].request_id;
      }
      renderOutputStage();
      renderJobsList();

      for (const job of state.jobs) {
        if (!TERMINAL_STATUSES.has(job.status)) {
          startPollingJob(job.request_id);
        }
      }
    } catch (_) {}
  }

  function upsertJob(jobRecord) {
    const idx = state.jobs.findIndex((j) => j.request_id === jobRecord.request_id);
    if (idx >= 0) {
      state.jobs[idx] = jobRecord;
    } else {
      state.jobs.unshift(jobRecord);
    }
  }

  function updatePollsCounter() {
    const count = state.pollingTimers.size;
    activePollsBadge.textContent = count > 0 ? t().activeCount(count) : t().idle;
  }

  async function pollJobOnce(requestId, isManual = false) {
    const prevJob = state.jobs.find((j) => j.request_id === requestId);
    const prevStatus = prevJob?.status;
    const prevVideo = prevJob?.video_url;
    const prevImages = Array.isArray(prevJob?.image_urls)
      ? prevJob.image_urls.length
      : 0;
    const prevAudio = prevJob?.audio_url;

    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/status`);
    const data = await res.json();
    if (res.ok && data.request_id) {
      const changed =
        prevStatus !== data.status ||
        prevVideo !== data.video_url ||
        prevImages !== (Array.isArray(data.image_urls) ? data.image_urls.length : 0) ||
        prevAudio !== data.audio_url;

      upsertJob(data);
      if ((changed || isManual) && state.activeStageJobId === requestId) {
        renderOutputStage();
      }
      if (changed || isManual) {
        renderJobsList();
      }

      if (TERMINAL_STATUSES.has(data.status)) {
        const existingTimer = state.pollingTimers.get(requestId);
        if (existingTimer) clearTimeout(existingTimer);
        state.pollingTimers.delete(requestId);
        updatePollsCounter();
        if (prevStatus && !TERMINAL_STATUSES.has(prevStatus)) {
          if (data.status === "completed") {
            showToast(t().completedToast(requestId.slice(0, 8)), "ok");
          } else {
            showToast(t().endedStatusToast(data.status), "warn");
          }
        }
      } else if (isManual) {
        showToast(t().statusRefreshedToast(formatStatusLabel(data.status)), "ok");
      }
      return data;
    }
    return null;
  }

  function startPollingJob(requestId) {
    if (state.pollingTimers.has(requestId)) return;
    let delayMs = 2000;

    const pollStep = async () => {
      try {
        const data = await pollJobOnce(requestId, false);
        if (data && TERMINAL_STATUSES.has(data.status)) {
          return;
        }
      } catch (_) {}

      delayMs = Math.min(delayMs * 1.5, 10000);
      const jitter = Math.floor(Math.random() * 350);
      const timerId = setTimeout(pollStep, delayMs + jitter);
      state.pollingTimers.set(requestId, timerId);
      updatePollsCounter();
    };

    const initialTimer = setTimeout(pollStep, delayMs);
    state.pollingTimers.set(requestId, initialTimer);
    updatePollsCounter();
  }

  async function cancelJob(requestId) {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/cancel`, {
        method: "POST",
      });
      if (res.status === 202 || res.ok) {
        const job = state.jobs.find((j) => j.request_id === requestId);
        if (job) {
          job.status = "canceled";
        }
        const timer = state.pollingTimers.get(requestId);
        if (timer) clearTimeout(timer);
        state.pollingTimers.delete(requestId);
        updatePollsCounter();
        renderOutputStage();
        renderJobsList();
        showToast(t().canceledRefundToast, "warn");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(
          data.detail || data.error || t().cancelWindowClosedToast,
          "err"
        );
      }
    } catch (err) {
      showToast(err.message, "err");
    }
  }

  function sendImageToModel(imageUrl, targetModelId) {
    selectModel(targetModelId);
    if ("image_url" in state.formValues) {
      state.formValues.image_url = imageUrl;
    } else if ("image_urls" in state.formValues) {
      state.formValues.image_urls = [imageUrl];
    }
    renderFormFields();
    onParametersChanged();
    const loc = getLocalizedModelMeta(state.activeModel);
    showToast(t().loadedImageIntoToast(loc.name), "ok");
  }

  function renderIdleCinemaViewfinder() {
    outputStage.innerHTML = "";
    const dict = t();
    const ratio = String(state.formValues.aspect_ratio || "16:9");
    const [fw, fh] = getAspectFrameDimensions(ratio, 10);
    const est = calculateInstantTierCost();
    const loc = getLocalizedModelMeta(state.activeModel);

    const hud = document.createElement("div");
    hud.className = "viewfinder-hud";
    hud.innerHTML = `
      <span class="reticle reticle-tl"></span>
      <span class="reticle reticle-tr"></span>
      <span class="reticle reticle-bl"></span>
      <span class="reticle reticle-br"></span>
      <div class="viewfinder-frame" style="width:${fw}px; min-height:${fh}px;">
        <span class="viewfinder-ratio-tag">${escapeHtml(
          dict.framePreviewTag(ratio.toUpperCase())
        )}</span>
        <p class="viewfinder-title">${escapeHtml(loc.name || "Studio Engine")}</p>
        <p class="viewfinder-sub">${escapeHtml(dict.viewfinderIdleSub)}</p>
      </div>
      <div class="viewfinder-telemetry-bar">
        <span class="telemetry-chip">POST /${escapeHtml(getEffectiveEndpoint())}</span>
        <span class="telemetry-chip">${escapeHtml(est.breakdownStr)}</span>
        <span class="telemetry-chip">${escapeHtml(dict.estPrefix)} ${escapeHtml(
      est.usdStr
    )}</span>
      </div>
    `;
    outputStage.appendChild(hud);
  }

  function formatStatusLabel(status) {
    const dict = t();
    return dict.statusLabels?.[status] || String(status || "").toUpperCase();
  }

  function renderOutputStage() {
    const job = state.jobs.find((j) => j.request_id === state.activeStageJobId);
    if (!job) {
      renderIdleCinemaViewfinder();
      return;
    }

    const dict = t();
    outputStage.innerHTML = "";
    const card = document.createElement("div");
    card.className = "stage-media-card";

    if (job.status === "completed") {
      if (job.video_url) {
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.src = job.video_url;
        card.appendChild(video);
      }
      if (Array.isArray(job.image_urls) && job.image_urls.length > 0) {
        const grid = document.createElement("div");
        grid.className = "stage-image-grid";
        for (const imgUrl of job.image_urls) {
          const link = document.createElement("a");
          link.href = imgUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          const img = document.createElement("img");
          img.src = imgUrl;
          img.alt = job.prompt_summary || "Generated image";
          img.width = 512;
          img.height = 512;
          link.appendChild(img);
          grid.appendChild(link);
        }
        card.appendChild(grid);

        const chainBar = document.createElement("div");
        chainBar.className = "stage-chain-actions";
        const firstImg = job.image_urls[0];

        const toSeedanceI2v = document.createElement("button");
        toSeedanceI2v.type = "button";
        toSeedanceI2v.className = "btn btn-ghost btn-xs";
        toSeedanceI2v.textContent = dict.animateSeedance;
        toSeedanceI2v.addEventListener("click", () =>
          sendImageToModel(firstImg, "seedance-2.5-i2v")
        );

        const toSeedanceR2v = document.createElement("button");
        toSeedanceR2v.type = "button";
        toSeedanceR2v.className = "btn btn-ghost btn-xs";
        toSeedanceR2v.textContent = dict.animateSeedanceR2v;
        toSeedanceR2v.addEventListener("click", () =>
          sendImageToModel(firstImg, "seedance-2.5-r2v")
        );

        const toWanPrimeI2v = document.createElement("button");
        toWanPrimeI2v.type = "button";
        toWanPrimeI2v.className = "btn btn-ghost btn-xs";
        toWanPrimeI2v.textContent = dict.animateWan;
        toWanPrimeI2v.addEventListener("click", () =>
          sendImageToModel(firstImg, "wan-3.0-prime-i2v")
        );

        const toGenjutsu = document.createElement("button");
        toGenjutsu.type = "button";
        toGenjutsu.className = "btn btn-ghost btn-xs";
        toGenjutsu.textContent = dict.useGenjutsu;
        toGenjutsu.addEventListener("click", () =>
          sendImageToModel(firstImg, "genjutsu-motion-transfer")
        );

        chainBar.appendChild(toSeedanceI2v);
        chainBar.appendChild(toSeedanceR2v);
        chainBar.appendChild(toWanPrimeI2v);
        chainBar.appendChild(toGenjutsu);
        card.appendChild(chainBar);
      }
      if (job.audio_url) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = job.audio_url;
        card.appendChild(audio);
      }
    } else if (job.status === "queued" || job.status === "in_progress") {
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSec - (job.created_at || nowSec));
      const box = document.createElement("div");
      box.className = "viewfinder-hud";
      box.innerHTML = `
        <span class="reticle reticle-tl"></span>
        <span class="reticle reticle-tr"></span>
        <span class="reticle reticle-bl"></span>
        <span class="reticle reticle-br"></span>
        <div class="empty-stage">
          <div class="empty-stage-code">${escapeHtml(job.endpoint)} · <span id="liveElapsedCounter">${elapsed}${escapeHtml(
        dict.elapsedSuffix
      )}</span></div>
          <p class="empty-stage-title">${escapeHtml(dict.statusPrefix)} ${escapeHtml(
        formatStatusLabel(job.status)
      )}</p>
          <p class="empty-stage-sub">${dict.pollingSub(escapeHtml(job.request_id))}</p>
        </div>
      `;

      const actionRow = document.createElement("div");
      actionRow.className = "stage-status-actions";

      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "btn btn-secondary btn-sm";
      refreshBtn.textContent = dict.refreshStatusBtn;
      refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = dict.refreshingStatus;
        try {
          await pollJobOnce(job.request_id, true);
        } finally {
          if (refreshBtn.isConnected) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = t().refreshStatusBtn;
          }
        }
      });
      actionRow.appendChild(refreshBtn);

      if (job.status === "queued") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-danger btn-sm";
        cancelBtn.textContent = dict.cancelQueuedBtn;
        cancelBtn.addEventListener("click", () => cancelJob(job.request_id));
        actionRow.appendChild(cancelBtn);
      }
      box.appendChild(actionRow);
      card.appendChild(box);
    } else {
      const box = document.createElement("div");
      box.className = "alert-error";
      box.innerHTML = `
        <strong>${escapeHtml(dict.terminalStatePrefix)} ${escapeHtml(
        formatStatusLabel(job.status)
      )}</strong><br/>
        ${escapeHtml(job.error_detail || dict.terminalErrorFallback)}
      `;
      card.appendChild(box);
    }

    const metaBar = document.createElement("div");
    metaBar.className = "stage-meta-bar";
    const primaryUrl =
      job.video_url ||
      (job.image_urls && job.image_urls[0]) ||
      job.audio_url ||
      null;

    metaBar.innerHTML = `
      <span>ID: <code>${escapeHtml(job.request_id)}</code> · <span class="status-pill ${escapeHtml(
      job.status
    )}">${escapeHtml(formatStatusLabel(job.status))}</span></span>
      <div style="display:flex; gap:6px;">
        <button type="button" class="btn btn-ghost btn-xs" id="backToViewfinderBtn">${escapeHtml(
          dict.framePreviewBtn
        )}</button>
        ${
          primaryUrl
            ? `<a href="${escapeHtml(
                primaryUrl
              )}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-xs">${escapeHtml(
                dict.openDownloadBtn
              )}</a>`
            : ""
        }
      </div>
    `;
    card.appendChild(metaBar);
    outputStage.appendChild(card);

    const backBtn = document.getElementById("backToViewfinderBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        state.activeStageJobId = null;
        renderIdleCinemaViewfinder();
      });
    }
  }

  function renderJobsList() {
    jobsList.innerHTML = "";
    const dict = t();
    if (state.jobs.length === 0) {
      jobsList.innerHTML = `<div class="field-hint">${escapeHtml(
        dict.emptyQueueHint
      )}</div>`;
      return;
    }

    for (const job of state.jobs) {
      const matchedModel = state.models.find(
        (m) => m.id === String(job.model_id || "").replace(":verified", "") || m.endpoint === job.endpoint
      );
      const displayModelName = matchedModel
        ? getLocalizedModelMeta(matchedModel).name
        : job.model_name;

      const item = document.createElement("div");
      item.className = "job-card";
      item.innerHTML = `
        <div class="job-card-top">
          <span class="job-model-title">${escapeHtml(displayModelName)}</span>
          <span class="status-pill ${escapeHtml(job.status)}">${escapeHtml(
        formatStatusLabel(job.status)
      )}</span>
        </div>
        <div class="job-prompt">${escapeHtml(job.prompt_summary)}</div>
      `;

      const footer = document.createElement("div");
      footer.className = "job-footer";
      footer.innerHTML = `<span>${escapeHtml(job.request_id.slice(0, 12))}...</span>`;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn-ghost btn-xs";
      viewBtn.textContent = dict.inspectBtn;
      viewBtn.addEventListener("click", () => {
        state.activeStageJobId = job.request_id;
        renderOutputStage();
      });
      actions.appendChild(viewBtn);

      if (job.status === "queued") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-danger btn-xs";
        cancelBtn.textContent = dict.cancelShortBtn;
        cancelBtn.addEventListener("click", () => cancelJob(job.request_id));
        actions.appendChild(cancelBtn);
      }

      footer.appendChild(actions);
      item.appendChild(footer);
      jobsList.appendChild(item);
    }
  }

  function bindEvents() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setLanguage(btn.dataset.lang || "pt-br");
      });
    });

    document.querySelectorAll(".cat-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".cat-tab").forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        state.selectedCategory = tab.dataset.category || "all";
        renderModelList();
      });
    });

    modelSearchInput.addEventListener("input", () => {
      state.searchQuery = modelSearchInput.value;
      renderModelList();
    });

    refreshEstimateBtn.addEventListener("click", () => {
      updateCostUIInstant();
      if (!state.hasKey) {
        showToast(t().connectKeyForEstimateToast, "warn");
        return;
      }
      runLiveApiEstimate();
    });

    toggleJsonInspectorBtn.addEventListener("click", () => {
      jsonInspectorBox.hidden = !jsonInspectorBox.hidden;
      syncJsonInspector();
    });

    document.querySelectorAll(".code-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".code-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeCodeTab = tab.dataset.codetab || "json";
        syncJsonInspector();
      });
    });

    copyCodeSnippetBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rawJsonTextarea.value);
        showToast(t().copiedSnippetToast, "ok");
      } catch (_) {}
    });

    useCustomJsonToggle.addEventListener("change", () => {
      onParametersChanged();
    });

    rawJsonTextarea.addEventListener("input", () => {
      if (useCustomJsonToggle.checked) {
        scheduleLiveApiEstimate(false);
      }
    });

    generationForm.addEventListener("submit", handleSubmitGeneration);

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (keyModalBackdrop.hidden && accountModelsModalBackdrop.hidden) {
          e.preventDefault();
          handleSubmitGeneration(null);
        }
      } else if (e.key === "Escape") {
        keyModalBackdrop.hidden = true;
        accountModelsModalBackdrop.hidden = true;
      }
    });

    // Soul V2 Styles loader
    loadSoulStylesBtn.addEventListener("click", async () => {
      soulStylesDrawer.hidden = false;
      soulStylesList.innerHTML = `<span class="field-hint">${escapeHtml(
        t().loadingSoulStyles
      )}</span>`;
      try {
        const res = await fetch("/api/soul-styles");
        const data = await res.json();
        if (!res.ok) {
          soulStylesList.innerHTML = `<span class="field-hint">${escapeHtml(
            data.error || data.detail || t().connectKeyForStyles
          )}</span>`;
          return;
        }
        const items = Array.isArray(data)
          ? data
          : data.styles || data.items || data.results || [];
        soulStylesList.innerHTML = "";
        for (const st of items) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "style-pill";
          btn.textContent = st.name || st.id;
          btn.title = st.id;
          btn.addEventListener("click", () => {
            state.formValues.style_id = st.id;
            renderFormFields();
            onParametersChanged();
            showToast(t().selectedSoulStyleToast(st.name || st.id), "ok");
          });
          soulStylesList.appendChild(btn);
        }
      } catch (err) {
        soulStylesList.innerHTML = `<span class="field-hint">${escapeHtml(err.message)}</span>`;
      }
    });

    closeSoulStylesBtn.addEventListener("click", () => {
      soulStylesDrawer.hidden = true;
    });

    // API Key Modal
    openKeyModalBtn.addEventListener("click", () => {
      keyModalError.hidden = true;
      apiKeyPasswordInput.value = "";
      keyModalBackdrop.hidden = false;
      apiKeyPasswordInput.focus();
    });

    const closeKeyModal = () => {
      keyModalBackdrop.hidden = true;
      apiKeyPasswordInput.value = "";
    };
    closeKeyModalBtn.addEventListener("click", closeKeyModal);
    cancelKeyModalBtn.addEventListener("click", closeKeyModal);

    apiKeyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      keyModalError.hidden = true;
      const val = apiKeyPasswordInput.value.trim();
      if (!val) {
        keyModalError.hidden = false;
        keyModalError.textContent = t().pasteApiKeyError;
        return;
      }

      saveKeyBtn.disabled = true;
      try {
        const res = await fetch("/api/key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: val,
            persist_env_local: persistEnvLocalCheckbox.checked,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          keyModalError.hidden = false;
          keyModalError.textContent = data.error || t().failedSaveKeyError;
          return;
        }
        await fetchConfig();
        closeKeyModal();
        scheduleLiveApiEstimate(true);
        showToast(t().savedKeyToast, "ok");
      } catch (err) {
        keyModalError.hidden = false;
        keyModalError.textContent = err.message || String(err);
      } finally {
        saveKeyBtn.disabled = false;
      }
    });

    removeKeyBtn.addEventListener("click", async () => {
      removeKeyBtn.disabled = true;
      try {
        await fetch("/api/key", { method: "DELETE" });
        await fetchConfig();
        closeKeyModal();
        updateCostUIInstant();
        showToast(t().removedKeyToast, "warn");
      } finally {
        removeKeyBtn.disabled = false;
      }
    });

    // Account Models Explorer Modal
    syncAccountModelsBtn.addEventListener("click", async () => {
      accountModelsModalBackdrop.hidden = false;
      accountModelsContent.innerHTML = `<span class="field-hint">${escapeHtml(
        t().fetchingAccountModels
      )}</span>`;
      try {
        const res = await fetch("/api/account-models");
        const data = await res.json();
        if (!res.ok) {
          accountModelsContent.innerHTML = `<div class="alert-error">${escapeHtml(
            data.error || data.detail || t().connectKeyForModels
          )}</div>`;
          return;
        }
        const list = Array.isArray(data)
          ? data
          : data.models || data.items || data.data || [];
        if (!Array.isArray(list) || list.length === 0) {
          accountModelsContent.innerHTML = `<pre class="mono-textarea">${escapeHtml(
            JSON.stringify(data, null, 2)
          )}</pre>`;
          return;
        }
        accountModelsContent.innerHTML = "";
        for (const item of list) {
          const slug =
            typeof item === "string"
              ? item
              : item.endpoint || item.slug || item.id || item.name || JSON.stringify(item);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "model-item";
          btn.innerHTML = `
            <div class="model-item-top">
              <span class="model-item-name">${escapeHtml(item.name || slug)}</span>
              <span class="model-item-badge">${escapeHtml(item.type || item.category || "Live")}</span>
            </div>
            <div class="model-item-bottom">
              <span class="model-item-endpoint">${escapeHtml(slug)}</span>
            </div>
          `;
          btn.addEventListener("click", () => {
            const matched = state.models.find((m) => m.endpoint === slug);
            if (matched) {
              selectModel(matched.id);
            } else {
              selectModel("custom-endpoint");
              state.formValues.__custom_endpoint = slug;
              renderFormFields();
              onParametersChanged();
            }
            accountModelsModalBackdrop.hidden = true;
            showToast(t().loadedEndpointToast(slug), "ok");
          });
          accountModelsContent.appendChild(btn);
        }
      } catch (err) {
        accountModelsContent.innerHTML = `<div class="alert-error">${escapeHtml(
          err.message
        )}</div>`;
      }
    });

    closeAccountModelsBtn.addEventListener("click", () => {
      accountModelsModalBackdrop.hidden = true;
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
})();
