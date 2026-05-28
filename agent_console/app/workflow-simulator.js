(function attachBaurumWorkflow(global) {
  const agents = [
    {
      id: "director",
      name: "Content Director",
      prompt:
        "Ты BAURUM Content Director. Работай как продюсер цепочки, а не автор поста. Получи запрос Павла, выбранную тему, период публикации, источник и ограничения бренда. Верни структурный content brief: цель материала, аудитория, канал, формат, критерии качества, что обязательно проверить в источниках, какие утверждения запрещены, как обращаться с камнями и какой точный handoff должен получить Research Agent. Если источник смешивает Jyotish/sidereal и western/tropical, останови тему или вынеси ее в adjacent_context. Не пиши финальный текст."
    },
    {
      id: "research",
      name: "Research & Source Agent",
      prompt:
        "Ты BAURUM Research & Source Agent. Работай как Jyotish-first фактчекер. Для каждой темы отделяй: jyotish_sidereal, western_tropical, astronomical_ephemeris, cultural_context. Основной список BAURUM допускает только jyotish_sidereal или культурно-ведический контекст; western/tropical можно использовать только как adjacent_context с явной маркировкой. Проверь дату, знак, систему расчета, источник и риск ошибки. Верни source card: URL, автор/издание, retrieved_at, micro-summary до 300 символов, extended summary, key facts, interpretive claims, BAURUM relevance, gemstone relevance, risk notes. Не выдумывай даты, не смешивай системы, не пиши финальный пост."
    },
    {
      id: "strategy",
      name: "Topic Strategy Agent",
      prompt:
        "Ты BAURUM Topic Strategy Agent. Твоя задача - превратить source card в решение: стоит ли делать материал сейчас. Оцени timing relevance, depth, usefulness, BAURUM fit, novelty, gemstone fit, риск overclaiming и коммерческую уместность. Верни review item для Павла: сильный заголовок, почему это важно сейчас, какая точка зрения BAURUM, какой формат лучше, что нельзя говорить, какой мягкий CTA возможен, какие источники нужно приложить. Если тема слабая или система источника не подходит, честно пометь reject/park."
    },
    {
      id: "writer",
      name: "Vedic Content Writer",
      prompt:
        "Ты BAURUM Vedic Content Writer. Напиши русский Telegram draft, пригодный для публикации после редактора. Структура: 1) тихий сильный hook без кликбейта; 2) что именно известно из источника; 3) ведический/культурный смысл простым языком; 4) человеческая ситуация, где это становится полезно; 5) если есть камень - аккуратный мост через традицию, карту, качество и личную уместность; 6) мягкое завершение или вопрос. Запрещено: miracle claims, медицинские обещания, страх, 'всем нужно носить', прямое давление купить. Пиши глубоко, конкретно, не общими словами."
    },
    {
      id: "editor",
      name: "Editor & Publishing Prep",
      prompt:
        "Ты BAURUM Editor & Publishing Prep Agent. Отредактируй draft как выпускающий редактор. Проверь: оригинальность, ясность, уважение к Jyotish, отсутствие смешения систем, отсутствие медицинских/фаталистичных/miracle claims, точность каменных формулировок, силу первого абзаца, отсутствие пустой эзотерики, мягкий CTA. Верни final Telegram text, short title, source URL, source note, approval message, status draft_review, suggested publication time, CTA type, Notion/Sheets metadata. Если текст слабый, перепиши, а не просто похвали."
    },
    {
      id: "visual",
      name: "Visual Agent",
      prompt:
        "Ты BAURUM Visual Agent. Создай реальный visual direction для материала. Верни: concept, кадр/композиция, предметы в кадре, свет, материал, цвет, нужно ли показывать камень, image generation prompt на английском, negative prompt, размеры Telegram/blog/Instagram, text overlay или 'без текста'. Стиль: refined high-end jewelry editorial, warm natural light, tactile materiality, quiet sacred atmosphere. Запрещено: neon zodiac, horoscope wheel, cheap mysticism, aggressive sales layout, fake healing visuals."
    }
  ];

  function compactTopic(topic) {
    return {
      title: topic.title,
      summary: topic.summary,
      baurumAngle: topic.angle,
      risk: topic.risk,
      source: topic.source
    };
  }

  function makeTelegramDraft(topic) {
    const gemstoneLine = /сапфир|Юпитер|jupiter|yellow/i.test(topic.title)
      ? "В традиции Джйотиш Юпитер связан с желтым сапфиром, но это не делает камень универсальной рекомендацией: личная карта, качество камня и намерение важнее красивой формулы."
      : "Для BAURUM эта тема важна не как повод что-то срочно купить, а как способ точнее почувствовать, какой смысл человек хочет носить рядом с телом.";

    return `${topic.title}\n\nЕсть темы, которые легко испортить быстрым обещанием. ${topic.summary}\n\nДля BAURUM здесь важен не прогноз ради прогноза, а качество различения: что мы действительно знаем из источника, где начинается интерпретация, и где нужна личная карта.\n\n${topic.angle}\n\n${gemstoneLine}\n\nВопрос не в том, чтобы срочно усилить планету. Вопрос в том, какой смысл человек готов носить рядом с телом - и достаточно ли бережно он к этому смыслу относится.`;
  }

  function makeVisualAsset(topic, visualBrief) {
    const title = topic.title.length > 58 ? `${topic.title.slice(0, 55)}...` : topic.title;
    const safeTitle = title
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    return {
      alt: `BAURUM visual preview for ${topic.title}`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="BAURUM generated visual preview">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#161b18"/>
      <stop offset="0.52" stop-color="#5d4b34"/>
      <stop offset="1" stop-color="#d7c093"/>
    </linearGradient>
    <radialGradient id="stone" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="#f8e6a7"/>
      <stop offset="0.5" stop-color="#b58935"/>
      <stop offset="1" stop-color="#46351f"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#000" flood-opacity="0.32"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect x="110" y="120" width="980" height="660" rx="18" fill="#fbf7ee" opacity="0.92" filter="url(#shadow)"/>
  <path d="M180 665 C330 565 510 570 665 635 C790 687 905 675 1025 590" fill="none" stroke="#b48739" stroke-width="7" opacity="0.45"/>
  <circle cx="784" cy="410" r="118" fill="url(#stone)" opacity="0.96"/>
  <circle cx="784" cy="410" r="154" fill="none" stroke="#b48739" stroke-width="2" opacity="0.42"/>
  <rect x="205" y="210" width="420" height="18" rx="9" fill="#28594f" opacity="0.82"/>
  <rect x="205" y="258" width="520" height="10" rx="5" fill="#6c685f" opacity="0.42"/>
  <rect x="205" y="288" width="465" height="10" rx="5" fill="#6c685f" opacity="0.34"/>
  <rect x="205" y="318" width="370" height="10" rx="5" fill="#6c685f" opacity="0.28"/>
  <text x="205" y="522" font-family="Georgia, serif" font-size="38" fill="#201f1c">${safeTitle}</text>
  <text x="205" y="578" font-family="Arial, sans-serif" font-size="22" fill="#6c685f">BAURUM editorial visual</text>
  <text x="205" y="628" font-family="Arial, sans-serif" font-size="18" fill="#928c80">${visualBrief.textOverlay}</text>
</svg>`
    };
  }

  function runAgentChain(topic, options = {}) {
    const promptOverrides = options.prompts || {};
    const activeAgents = agents.map((agent) => ({
      ...agent,
      prompt: promptOverrides[agent.id] || agent.prompt
    }));
    const context = {
      request: "Протестировать один полный цикл BAURUM weekly content workflow.",
      publicationWindow: options.publicationWindow || "1-7 июня 2026",
      language: "ru",
      preferredSources: options.preferredSources || "",
      topic: compactTopic(topic)
    };

    const brief = {
      workflowMode: "weekly_topic_discovery",
      expectedFinalOutputs: 1,
      channels: ["Telegram", "Blog"],
      gemstonePolicy: /сапфир|Юпитер|jupiter|yellow/i.test(topic.title) ? "natural" : "optional",
      handoff: "Research & Source Agent"
    };

    const sourceCard = {
      sourceId: `src-${topic.id}`,
      title: topic.title,
      url: topic.source,
      microSummary300: topic.summary.slice(0, 300),
      extendedSummary: `${topic.summary} ${topic.angle}`,
      keyFacts: ["Тема используется как тестовый source card для проверки workflow."],
      interpretiveClaims: [topic.angle],
      gemstoneRelevance: brief.gemstonePolicy,
      riskNotes: topic.risk
    };

    const strategy = {
      whyNow: "Тема достаточно сильная для тестового недельного цикла и показывает, как агентная цепочка переводит источник в публикацию.",
      recommendedFormat: "Telegram post + visual brief",
      ctaIdea: "Сохранить пост или запросить консультацию по смыслу камня без автоматической рекомендации.",
      riskNote: topic.risk
    };

    const draft = makeTelegramDraft(topic);
    const rewriteNote = options.rewriteInstruction
      ? `\n\nПереписано с учетом правки: ${options.rewriteInstruction}`
      : "";
    const edited = `${draft}\n\nЕсли тема откликается, можно вернуться к ней бережно: не как к обещанию результата, а как к вопросу о подходящем символе, качестве камня и личном контексте.${rewriteNote}`;

    const visualBrief = {
      concept: "Тихий editorial-кадр: рука, бумага с заметками, теплый металл, один камень или его цветовой намек, без прямой продажи.",
      imagePrompt:
        "refined high-end jewelry editorial, warm natural window light, tactile paper notes, subtle gemstone presence, calm sacred atmosphere, elegant composition, no horoscope wheel, no neon, no mystic stock look",
      negativePrompt: "neon zodiac, cheap mysticism, aggressive sales layout, medical claims, overdone cosmic background",
      dimensions: ["Telegram 1080x1350", "Blog cover 1600x900"],
      textOverlay: "Без текста или короткий заголовок в 3-5 слов."
    };
    const visualAsset = makeVisualAsset(topic, visualBrief);

    const stepOutputs = {
      director: brief,
      research: sourceCard,
      strategy,
      writer: { telegramDraft: draft },
      editor: {
        finalTelegramText: edited,
        status: "draft_review",
        checks: ["Нет miracle claims", "Нет медицинских обещаний", "CTA мягкий", "Тон BAURUM сохранен"]
      },
      visual: visualBrief
    };

    return {
      topicId: topic.id,
      status: "visual_ready",
      context,
      steps: activeAgents.map((agent) => ({
        agentId: agent.id,
        agentName: agent.name,
        internalPrompt: agent.prompt,
        output: stepOutputs[agent.id]
      })),
      finalTelegramText: edited,
      publishing: {
        status: "draft_review",
        channel: "Telegram",
        suggestedDate: "2026-06-01 10:00",
        sourceUrl: topic.source
      },
      visualBrief,
      visualAsset
    };
  }

  global.BaurumWorkflow = {
    agents,
    runAgentChain
  };
})(typeof window !== "undefined" ? window : globalThis);
