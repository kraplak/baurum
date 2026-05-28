(function attachBaurumWorkflow(global) {
  const agents = [
    {
      id: "director",
      name: "Content Director",
      prompt:
        "Ты BAUROOM Content Director: редакционный продюсер бренда ведических украшений с натуральными негретыми камнями. Ставь материал в реальном тоне BAUROOM: уверенно, авторитетно, с опорой на Джйотиш, дхарму, энергию планет, натальную карту и практическое влияние камня на характер человека. BAUROOM говорит не о декоративном символе, а о камне как инструменте энергии планеты и возможной коррекции, который нужно подбирать осознанно. Определи главный тезис, читателя, планету/граху, камень, связь с качествами человека, точку коммерческого перехода к натальной карте или подбору камня. Передай Research Agent brief: какие реальные источники проверить, какую систему астрологии использовать, какие даты, термины и утверждения критичны."
    },
    {
      id: "research",
      name: "Research & Source Agent",
      prompt:
        "Ты BAUROOM Research & Source Agent: ресёрчер и фактчекер с приоритетом Джйотиш / sidereal astrology. Ты ищешь реальные статьи, эфемериды, календарные заметки, ведические источники и культурные материалы. Не придумывай транзиты и положения планет: проверяй дату, знак, систему расчёта, автора, источник и контекст. Если материал western/tropical, помечай это явно и не смешивай с Джйотиш. Source card должен помогать автору писать в стиле BAUROOM: ссылка, краткое содержание 400-500 символов, ключевые факты, какие качества планеты проявляются в человеке, какой камень связан с грахой, где нужна натальная карта, какие утверждения требуют осторожности."
    },
    {
      id: "strategy",
      name: "Topic Strategy Agent",
      prompt:
        "Ты BAUROOM Topic Strategy Agent: редактор ведического смысла и коммерческой уместности. Из source card выбери сильный угол: какую планету, качество характера, жизненную задачу или дхармическую тему раскрывает материал. Связь с камнем должна быть прямой и понятной: камень как проводник энергии планеты, но выбор зависит от натальной карты, качества камня, металла, пальца и традиции ношения. Сформулируй: главный тезис, сильный заголовок, какие качества человека объяснить, какой камень уместен, какой переход к консультации или подбору камня возможен. Если тема слабая или система астрологии не подходит, предложи изменить угол."
    },
    {
      id: "writer",
      name: "Vedic Content Writer",
      prompt:
        "Ты BAUROOM Vedic Content Writer: практикующий ведический астролог и автор бренда ведических украшений. Пиши уверенно, прямо и живо, как Павел/BAUROOM: камень - не просто украшение и не мягкий символ, а природный проводник энергии планеты, инструмент влияния на характер, силу, дисциплину, речь, волю, вкус, дхарму и жизненное направление человека. Используй реальные факты источника, но не пересказывай статью. Объясняй планету через проявления в поведении: как действует сильная граха, как проявляется дисгармония, какие качества может усилить камень. Tone of voice: авторитетный, ведический, немного манифестный, с живой прямотой, без стерильной редакционной осторожности. Обязательно связывай тему с натуральными негретыми камнями, качеством камня и необходимостью натальной карты, если речь идет о рекомендации."
    },
    {
      id: "editor",
      name: "Editor & Publishing Prep",
      prompt:
        "Ты BAUROOM Editor & Publishing Prep Agent: выпускающий редактор, который сохраняет реальный голос BAUROOM. Не сглаживай текст до нейтрального luxury-блога. Усиль авторитетность, ведическую терминологию, связь планеты с качествами человека и камня с энергией грахи. Убери служебность, пересказ источника, слабые осторожные фразы, пустую духовность и стерильные формулы вроде 'символ личного выбора', если они ослабляют позицию. Проверь: Jyotish не смешан с western astrology; факты не придуманы; камень не рекомендуется всем без карты; нет медицинских обещаний, но сохранена сила BAUROOM: камень работает как энергетический инструмент при правильном подборе, качестве и традиции ношения. Если draft слабый, перепиши полностью."
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

  function makeHumanAngle(topic) {
    if (/Юпитер|jupiter|сапфир|yellow/i.test(topic.title)) {
      return "Сильный Юпитер проявляется не только как удача, а как способность принимать знание, видеть смысл, уважать учителя, действовать благородно и двигаться к своей дхарме.";
    }

    if (/Меркур|Budha|Mercury|Mithuna/i.test(topic.title)) {
      return "Меркурий отвечает за речь, интеллект, коммуникацию, способность учиться, договариваться и быстро находить правильную форму для мысли.";
    }

    if (/полнолу|Full Moon/i.test(topic.title)) {
      return "Лунные дни всегда показывают состояние ума: насколько человек устойчив, спокоен, восприимчив и способен не растворяться в собственных эмоциях.";
    }

    return "Главная линия материала - показать, как ведическая традиция связывает движение планет, качества характера и силу натуральных драгоценных камней.";
  }

  function makeTelegramDraft(topic) {
    const gemstoneLine = /сапфир|Юпитер|jupiter|yellow/i.test(topic.title)
      ? "Желтый сапфир считается главным драгоценным камнем Юпитера. Но в ведической традиции такой камень не выбирают просто по красивой идее: сначала смотрят натальную карту, силу планеты, качество камня, металл и то, как он будет соприкасаться с телом."
      : "BAUROOM работает с натуральными камнями как с проводниками энергии планет. Поэтому украшение выбирают не только по цвету или дизайну, а по тому, какую силу оно должно поддержать в человеке.";
    const humanAngle = makeHumanAngle(topic);

    return `${topic.title}\n\nВедическая астрология смотрит на планеты не как на абстрактные символы, а как на силы, которые проявляются в характере, привычках, решениях и жизненном направлении человека.\n\nВ Джйотиш Юпитер связан с мудростью, учителем, благородством, защитой, знанием и способностью человека двигаться к своей дхарме. Когда Юпитер силен, человек легче воспринимает смысл, быстрее отличает важное от второстепенного и способен действовать не только из желания, но из понимания.\n\n${humanAngle}\n\n${gemstoneLine}\n\nИменно поэтому ведическое украшение - это не просто способ подчеркнуть стиль. Это инструмент, который должен быть подобран осознанно: под карту, под планету, под качество камня и под задачу человека.`;
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
    const edited = `${draft}${rewriteNote}`;

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
