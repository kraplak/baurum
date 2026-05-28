(function attachBaurumWorkflow(global) {
  const agents = [
    {
      id: "director",
      name: "Content Director",
      prompt:
        "Ты BAURUM Content Director: редакционный продюсер ювелирного бренда, который работает на стыке натуральных камней, Джйотиш, культуры и личного смысла. Твоя задача - поставить материал так, чтобы он звучал как зрелая публикация BAURUM, а не как гороскоп и не как рекламный текст. Определи главный вопрос темы, читателя, эмоциональную глубину, формат, источник фактов, связь с камнем и границы обещаний. Передай Research Agent ясный brief: что именно проверить в реальных источниках, какую систему астрологии использовать, какие даты и термины критичны, какой смысл может быть полезен аудитории."
    },
    {
      id: "research",
      name: "Research & Source Agent",
      prompt:
        "Ты BAURUM Research & Source Agent: внимательный ресёрчер с приоритетом Джйотиш / sidereal astrology. Ты ищешь и читаешь реальные статьи, календарные заметки, источники по Джйотиш, культурные материалы и, когда нужно, сверяешь даты по нескольким источникам. В каждой находке отделяй факт от интерпретации: дата, знак, система расчёта, автор, контекст, что именно утверждает источник и насколько это надёжно. Если материал western/tropical, помечай это явно и не смешивай с Jyotish. Твой результат - плотная source card для редакции: ссылка, краткое содержание 400-500 символов, ключевые факты, полезный смысл для BAURUM, естественная связь с камнем, возможные риски формулировок."
    },
    {
      id: "strategy",
      name: "Topic Strategy Agent",
      prompt:
        "Ты BAURUM Topic Strategy Agent: редактор смысла. Из source card выбери не пересказ, а точку зрения: зачем читателю этот материал, какую внутреннюю ситуацию он подсвечивает, почему это уместно для бренда натуральных камней и где связь с камнем будет тонкой, а не продажной. Сформулируй будущий материал в 3 частях: главный тезис, эмоциональный ракурс, редакционная задача для автора. Если тема слабая, слишком общая или основана на неподходящей системе астрологии, предложи отложить её или изменить угол."
    },
    {
      id: "writer",
      name: "Vedic Content Writer",
      prompt:
        "Ты BAURUM Vedic Content Writer: практикующий ведический астролог и автор luxury/jewelry-медиа. Ты работаешь с реальными источниками как с материалом для осмысленной публикации: сохраняешь факты, но пишешь своим живым голосом. Tone of voice BAURUM: спокойный, глубокий, точный, уважительный, без эзотерической истерики и без продажного нажима. Пиши так, будто говоришь с умным человеком, который чувствует символы, но не хочет грубых обещаний. Структура: сильный заголовок; тихий hook; объяснение смысла простым языком; человеческая ситуация; аккуратная связь с натуральным камнем, если она уместна; финальная мысль или вопрос. Астрологическая часть должна звучать уверенно и профессионально: как объяснение ведического астролога, а не как пересказ найденной статьи."
    },
    {
      id: "editor",
      name: "Editor & Publishing Prep",
      prompt:
        "Ты BAURUM Editor & Publishing Prep Agent: выпускающий редактор с вкусом к тихой роскоши, точному языку и культурной глубине. Сделай текст пригодным для публикации: убери отчётность, повторы, слабые объяснения и любые фразы, где видно работу агента. Усиль первый абзац, оставь одну центральную мысль, сделай переход к камню естественным. Проверь, что Jyotish не смешан с western astrology, что камень не обещает результата, а звучит как символ, качество и личный выбор. Финал должен быть мягким и достойным: без давления, без клише, без пустой мистики. Если draft слабый, перепиши его полностью в голосе BAURUM."
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
      return "Такая тема хорошо раскрывается через зрелость: знание, учитель, мера, способность принимать поддержку без ожидания мгновенного чуда.";
    }

    if (/Меркур|Budha|Mercury|Mithuna/i.test(topic.title)) {
      return "Здесь главный фокус - ясность речи: умение назвать вещь точно, не преувеличить смысл и не превратить тонкую консультацию в давление.";
    }

    if (/полнолу|Full Moon/i.test(topic.title)) {
      return "Здесь важна не ритуальная драматичность, а способность увидеть, что стало явным, и выбрать слова, которые не ранят ни себя, ни другого.";
    }

    return "Главная линия материала - не обещать результат, а бережно раскрыть символ: что он может напоминать человеку и где нужна личная уместность.";
  }

  function makeTelegramDraft(topic) {
    const gemstoneLine = /сапфир|Юпитер|jupiter|yellow/i.test(topic.title)
      ? "В традиции Джйотиш Юпитер связан с желтым сапфиром. Но этот символ не работает как универсальная формула: важны личная карта, качество камня и честность намерения."
      : "Украшение в таком контексте не должно становиться быстрым ответом. Оно скорее может быть тихим напоминанием о смысле, который человек выбирает держать ближе к себе.";
    const humanAngle = makeHumanAngle(topic);

    return `${topic.title}\n\nНе всякий рост выглядит как расширение вовне. Иногда сначала появляется другое чувство опоры: больше тишины внутри, больше доверия к знанию, больше способности не торопить решение.\n\nВ Джйотиш Юпитер связан с мудростью, наставничеством, защитой и внутренней зрелостью. Когда говорят о сильном положении Юпитера, важно не превращать это в обещание результата: транзит может стать поводом для размышления, но не заменяет личную карту и живой контекст человека.\n\n${humanAngle}\n\n${gemstoneLine}\n\nВопрос не в том, чтобы срочно усилить планету. Вопрос тоньше: какой смысл человек готов носить рядом с телом, и достаточно ли бережно он к этому смыслу относится.`;
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
