(function attachBaurumWorkflow(global) {
  const agents = [
    {
      id: "director",
      name: "Content Director",
      prompt:
        "Ты BAURUM Content Director. Получи запрос Павла и выбранную тему. Сформируй content brief: цель, канал, критерии отбора, требования к источникам, осторожность по камням и следующий handoff. Не пиши пост."
    },
    {
      id: "research",
      name: "Research & Source Agent",
      prompt:
        "Ты BAURUM Research & Source Agent. Работай как Джйотиш-first ресёрчер. Зафиксируй источник, факты, интерпретации, риски, micro-summary до 300 символов и BAURUM angles. Не выдумывай даты и не делай финальный текст."
    },
    {
      id: "strategy",
      name: "Topic Strategy Agent",
      prompt:
        "Ты BAURUM Topic Strategy Agent. Преврати research card в человеческий review item: почему тема важна сейчас, какой формат выбрать, где риск, какой CTA мягкий и уместный."
    },
    {
      id: "writer",
      name: "Vedic Content Writer",
      prompt:
        "Ты BAURUM Vedic Content Writer. Напиши оригинальный Telegram draft на русском: тихий hook, контекст события, ведический смысл, человеческая рефлексия, аккуратный мост к BAURUM, без обещаний и страха."
    },
    {
      id: "editor",
      name: "Editor & Publishing Prep",
      prompt:
        "Ты BAURUM Editor & Publishing Prep Agent. Проверь текст на overclaiming, медицинские/фаталистичные обещания, слабый CTA, тон BAURUM. Подготовь финальный текст, статус draft_review и publishing metadata."
    },
    {
      id: "visual",
      name: "Visual Agent",
      prompt:
        "Ты BAURUM Visual Agent. Создай visual brief: refined jewelry editorial, теплый естественный свет, тактильность, спокойная сакральность, без дешевой мистики и без агрессивной рекламы."
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

    return `${topic.title}\n\n${topic.summary}\n\n${topic.angle}\n\n${gemstoneLine}\n\nМягкий вопрос недели: где сейчас нужно не больше знаков, а больше ясности, меры и ответственности?`;
  }

  function runAgentChain(topic, options = {}) {
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
    const edited = `${draft}\n\nЕсли тема откликается, можно вернуться к ней бережно: не как к обещанию результата, а как к вопросу о подходящем символе, качестве камня и личном контексте.`;

    const visualBrief = {
      concept: "Тихий editorial-кадр: рука, бумага с заметками, теплый металл, один камень или его цветовой намек, без прямой продажи.",
      imagePrompt:
        "refined high-end jewelry editorial, warm natural window light, tactile paper notes, subtle gemstone presence, calm sacred atmosphere, elegant composition, no horoscope wheel, no neon, no mystic stock look",
      negativePrompt: "neon zodiac, cheap mysticism, aggressive sales layout, medical claims, overdone cosmic background",
      dimensions: ["Telegram 1080x1350", "Blog cover 1600x900"],
      textOverlay: "Без текста или короткий заголовок в 3-5 слов."
    };

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
      steps: agents.map((agent) => ({
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
      visualBrief
    };
  }

  global.BaurumWorkflow = {
    agents,
    runAgentChain
  };
})(typeof window !== "undefined" ? window : globalThis);
