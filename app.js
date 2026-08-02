(() => {
  const STORAGE_KEY = "quiz-deck-opened-v1";
  const DATA_URL = "quiz-data.json";
  const app = document.getElementById("app");

  /** @type {any} */
  let QUIZ_DATA = { rounds: [] };

  /** @type {{ view: 'home' | 'board' | 'question', roundId: string | null, categoryId: string | null, points: number | null, questionId: string | null, showHint: boolean, showAnswer: boolean, clueIndex: number }} */
  let state = {
    view: "home",
    roundId: null,
    categoryId: null,
    points: null,
    questionId: null,
    showHint: false,
    showAnswer: false,
    clueIndex: 0,
  };

  function loadOpened() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveOpened(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function cellKey(roundId, ...parts) {
    return [roundId, ...parts].join("::");
  }

  function isOpened(key) {
    return Boolean(loadOpened()[key]);
  }

  function markOpened(key) {
    const map = loadOpened();
    map[key] = true;
    saveOpened(map);
  }

  function resetRound(roundId) {
    const map = loadOpened();
    const prefix = `${roundId}::`;
    for (const key of Object.keys(map)) {
      if (key.startsWith(prefix)) delete map[key];
    }
    saveOpened(map);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Turn *phrases* into bold + underlined spans. Lone * stay as-is. */
  function formatMarkup(text) {
    const escaped = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*([^*\n]+)\*/g, '<span class="emphasis">$1</span>');
  }

  /** Highlight standalone X / Xs for Find My Ex clues. */
  function formatExText(text) {
    return formatMarkup(text).replace(
      /\b(Xs?)\b/g,
      '<span class="ex-var">$1</span>'
    );
  }

  function assetUrl(path) {
    const [pathname, query] = String(path).split("?");
    const encoded = pathname
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return query ? `${encoded}?${query}` : encoded;
  }

  function getRound(roundId) {
    return QUIZ_DATA.rounds.find((r) => r.id === roundId) || null;
  }

  function getJeopardyQuestion(round, categoryId, points) {
    const category = round.categories.find((c) => c.id === categoryId);
    if (!category) return null;
    const question = category.questions.find((q) => q.points === points);
    if (!question) return null;
    return { category, question };
  }

  function getPriceQuestion(round, questionId) {
    return round.questions.find((q) => q.id === questionId) || null;
  }

  function getMcqQuestion(round, questionId) {
    for (const category of round.categories || []) {
      const question = category.questions.find((q) => q.id === questionId);
      if (question) return { category, question };
    }
    return null;
  }

  function render() {
    if (state.view === "home") {
      app.innerHTML = renderHome();
    } else if (state.view === "board") {
      app.innerHTML = renderBoard();
    } else if (state.view === "question") {
      app.innerHTML = renderQuestion();
    }
    bindEvents();
  }

  function renderHome() {
    const rounds = QUIZ_DATA.rounds
      .map(
        (r, i) =>
          `<button type="button" class="round-btn" data-action="open-round" data-round="${r.id}">
            <span class="round-num">Round ${i + 1}</span>
            <span class="round-name">${escapeHtml(r.name)}</span>
          </button>`
      )
      .join("");

    return `
      <section class="home">
        <h1 class="brand">Quiz Deck</h1>
        <p class="home-sub">Pick a round to open the board.</p>
        <div class="round-list">${rounds}</div>
        <button type="button" class="btn btn-danger home-reset" data-action="reset-all">Reset All</button>
      </section>
    `;
  }

  function renderBoard() {
    const round = getRound(state.roundId);
    if (!round) {
      state.view = "home";
      return renderHome();
    }

    if (round.type === "price") {
      return renderPriceBoard(round);
    }
    if (round.type === "mcq") {
      return renderMcqBoard(round);
    }
    if (round.type === "ex") {
      return renderExBoard(round);
    }
    return renderJeopardyBoard(round);
  }

  function renderJeopardyBoard(round) {
    const headers = round.categories
      .map((c) => `<div class="cat-header">${escapeHtml(c.name)}</div>`)
      .join("");

    const rows = round.pointValues
      .map((points) => {
        return round.categories
          .map((category) => {
            const hasQ = category.questions.some((q) => q.points === points);
            if (!hasQ) {
              return `<button type="button" class="cell" disabled aria-disabled="true">—</button>`;
            }
            const key = cellKey(round.id, category.id, points);
            const opened = isOpened(key);
            if (opened) {
              return `<button type="button" class="cell opened" data-action="open-cell" data-category="${category.id}" data-points="${points}">Opened</button>`;
            }
            return `<button type="button" class="cell" data-action="open-cell" data-category="${category.id}" data-points="${points}">${points}</button>`;
          })
          .join("");
      })
      .join("");

    return `
      <section class="board-view">
        <header class="board-header">
          <h1 class="board-title">${escapeHtml(round.name)}</h1>
          <div class="board-actions">
            <button type="button" class="btn" data-action="go-home">Home</button>
            <button type="button" class="btn btn-danger" data-action="reset-round">Reset board</button>
          </div>
        </header>
        <div class="jeopardy-grid" role="grid" aria-label="${escapeHtml(round.name)} board">
          ${headers}
          ${rows}
        </div>
      </section>
    `;
  }

  function renderPriceBoard(round) {
    const items = round.questions
      .map((q) => {
        const key = cellKey(round.id, q.id);
        const opened = isOpened(key);
        const title = q.title || `Item ${q.number}`;
        const label = opened ? "Opened" : title;
        const openedClass = opened ? " opened" : "";
        return `<button type="button" class="price-card mcq-card${openedClass}" data-action="open-price" data-question="${q.id}">
          <span class="price-card-num">${escapeHtml(label)}</span>
        </button>`;
      })
      .join("");

    return `
      <section class="board-view">
        <header class="board-header">
          <h1 class="board-title">${escapeHtml(round.name)}</h1>
          <div class="board-actions">
            <button type="button" class="btn" data-action="go-home">Home</button>
            <button type="button" class="btn btn-danger" data-action="reset-round">Reset board</button>
          </div>
        </header>
        <div class="price-grid" role="list" aria-label="${escapeHtml(round.name)} items">
          ${items}
        </div>
      </section>
    `;
  }

  function renderMcqBoard(round) {
    const sections = round.categories
      .map((category) => {
        const cards = category.questions
          .map((q) => {
            const key = cellKey(round.id, q.id);
            const opened = isOpened(key);
            const title = q.title || `Q${q.number}`;
            const label = opened ? "Opened" : title;
            const openedClass = opened ? " opened" : "";
            return `<button type="button" class="price-card mcq-card${openedClass}" data-action="open-mcq" data-question="${q.id}">
              <span class="price-card-num">${escapeHtml(label)}</span>
            </button>`;
          })
          .join("");

        return `
          <section class="mcq-section">
            <h2 class="mcq-section-title">${escapeHtml(category.name)}</h2>
            <div class="price-grid">${cards}</div>
          </section>
        `;
      })
      .join("");

    return `
      <section class="board-view">
        <header class="board-header">
          <h1 class="board-title">${escapeHtml(round.name)}</h1>
          <div class="board-actions">
            <button type="button" class="btn" data-action="go-home">Home</button>
            <button type="button" class="btn btn-danger" data-action="reset-round">Reset board</button>
          </div>
        </header>
        <div class="mcq-sections">${sections}</div>
      </section>
    `;
  }

  function getExQuestion(round, questionId) {
    return (round.questions || []).find((q) => q.id === questionId) || null;
  }

  function renderExBoard(round) {
    const items = (round.questions || [])
      .map((q) => {
        const key = cellKey(round.id, q.id);
        const opened = isOpened(key);
        const label = opened ? "Opened" : `Q${q.number}`;
        const openedClass = opened ? " opened" : "";
        return `<button type="button" class="price-card${openedClass}" data-action="open-ex" data-question="${q.id}">
          <span class="price-card-num">${escapeHtml(label)}</span>
        </button>`;
      })
      .join("");

    return `
      <section class="board-view">
        <header class="board-header">
          <h1 class="board-title">${escapeHtml(round.name)}</h1>
          <div class="board-actions">
            <button type="button" class="btn" data-action="go-home">Home</button>
            <button type="button" class="btn btn-danger" data-action="reset-round">Reset board</button>
          </div>
        </header>
        <div class="price-grid" role="list" aria-label="${escapeHtml(round.name)} items">
          ${items}
        </div>
      </section>
    `;
  }

  function renderExQuestion(round) {
    const question = getExQuestion(round, state.questionId);
    if (!question) {
      state.view = "board";
      return renderBoard();
    }

    const clues = (Array.isArray(question.clues) ? question.clues : []).map(
      (clue) => (typeof clue === "string" ? { text: clue } : clue)
    );
    const maxClues = Math.max(1, clues.length);
    const idx = Math.max(0, Math.min(state.clueIndex || 0, maxClues - 1));

    const clueItems = clues
      .slice(0, idx + 1)
      .map((clue, i) => {
        const align = clue.imageAlign === "right" ? " ex-clue-with-image-right" : "";
        const image = clue.image
          ? `<img class="ex-clue-image" src="${assetUrl(clue.image)}" alt="Clue ${i + 1} image" />`
          : "";
        return `<div class="ex-clue-item${align}">
            <div class="ex-clue-body">
              <div class="ex-clue-label">Clue ${i + 1}</div>
              <div class="ex-clue-text">${formatExText(clue.text || "")}</div>
            </div>
            ${image}
          </div>`;
      })
      .join("");

    let answerBlock = "";
    if (state.showAnswer) {
      const answerImage = question.answerImage
        ? `<img class="answer-image" src="${assetUrl(question.answerImage)}" alt="Answer" />`
        : "";
      answerBlock = `
        <div class="answer-box">
          <p class="answer-label">Answer</p>
          <div class="answer-row">
            <p class="answer-text">${formatExText(question.answer || "")}</p>
            ${answerImage}
          </div>
        </div>
      `;
    }

    const prevBtn =
      idx > 0
        ? `<button type="button" class="btn" data-action="prev-clue" data-expected-index="${idx}">Back</button>`
        : "";

    const nextBtn =
      idx < maxClues - 1
        ? `<button type="button" class="btn btn-gold" data-action="next-clue" data-expected-index="${idx}">Next clue</button>`
        : "";

    const revealBtn = state.showAnswer
      ? ""
      : `<button type="button" class="btn btn-gold" data-action="show-answer">Reveal answer</button>`;

    return `
      <section class="question-view">
        <div class="question-meta">
          <h2 class="question-cat">${escapeHtml(round.name)}</h2>
          <span class="question-points">Clue ${idx + 1}/${maxClues}</span>
        </div>
        <div class="question-panel">
          <div class="ex-clues">${clueItems}</div>
          ${answerBlock}
        </div>
        <div class="question-actions">
          ${prevBtn}
          ${nextBtn}
          ${revealBtn}
          <button type="button" class="btn" data-action="back-board">Menu</button>
        </div>
      </section>
    `;
  }

  function renderQuestion() {
    const round = getRound(state.roundId);
    if (!round) {
      state.view = "home";
      return renderHome();
    }

    if (round.type === "price") {
      return renderPriceQuestion(round);
    }
    if (round.type === "mcq") {
      return renderMcqQuestion(round);
    }
    if (round.type === "ex") {
      return renderExQuestion(round);
    }
    return renderJeopardyQuestion(round);
  }

  function renderJeopardyQuestion(round) {
    const found = getJeopardyQuestion(round, state.categoryId, state.points);
    if (!found) {
      state.view = "board";
      return renderBoard();
    }

    const { category, question } = found;
    const hasHint = Boolean(question.hint || question.hintImage);

    const hintBlock = state.showHint
      ? `<div class="hint-box">
           <p class="hint-label">Hint</p>
           ${
             question.hint
               ? `<p class="hint-text">${formatMarkup(question.hint)}</p>`
               : ""
           }
           ${
             question.hintImage
               ? `<img class="hint-image" src="${assetUrl(question.hintImage)}" alt="Hint" />`
               : ""
           }
         </div>`
      : "";

    let answerBlock = "";
    if (state.showAnswer) {
      const image = question.answerImage
        ? `<img class="answer-image" src="${assetUrl(question.answerImage)}" alt="${escapeAttr(question.answer)}" />`
        : "";
      answerBlock = `
        <div class="answer-box">
          <p class="answer-label">Answer</p>
          <div class="answer-row">
            <p class="answer-text">${formatMarkup(question.answer)}</p>
            ${image}
          </div>
        </div>
      `;
    }

    const hintBtn =
      !hasHint || state.showHint
        ? ""
        : `<button type="button" class="btn btn-gold" data-action="show-hint">Show hint</button>`;

    const answerBtn = state.showAnswer
      ? ""
      : `<button type="button" class="btn btn-gold" data-action="show-answer">Reveal answer</button>`;

    const promptImageBlock = renderPromptImages(question.promptImages);

    return `
      <section class="question-view">
        <div class="question-meta">
          <h2 class="question-cat">${escapeHtml(category.name)}</h2>
          <span class="question-points">${question.points} points</span>
        </div>
        <div class="question-panel">
          ${promptImageBlock}
          <p class="question-text">${formatMarkup(question.prompt)}</p>
          ${hintBlock}
          ${answerBlock}
        </div>
        <div class="question-actions">
          ${hintBtn}
          ${answerBtn}
          <button type="button" class="btn" data-action="back-board">Back</button>
        </div>
      </section>
    `;
  }

  function renderPriceQuestion(round) {
    const question = getPriceQuestion(round, state.questionId);
    if (!question) {
      state.view = "board";
      return renderBoard();
    }

    const promptImageBlock = renderPromptImages(question.promptImages);

    const promptList =
      Array.isArray(question.promptList) && question.promptList.length
        ? `<ul class="prompt-list">${question.promptList
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : "";

    let answerBlock = "";
    if (state.showAnswer) {
      const breakdown =
        Array.isArray(question.answerBreakdown) && question.answerBreakdown.length
          ? `<ul class="answer-breakdown">${question.answerBreakdown
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : "";
      answerBlock = `
        <div class="answer-box">
          <p class="answer-label">Answer</p>
          <p class="answer-text answer-price">${formatMarkup(question.answer)}</p>
          ${breakdown}
        </div>
      `;
    }

    const answerBtn = state.showAnswer
      ? ""
      : `<button type="button" class="btn btn-gold" data-action="show-answer">Reveal answer</button>`;

    return `
      <section class="question-view">
        <div class="question-meta">
          <h2 class="question-cat">${escapeHtml(round.name)}</h2>
          <span class="question-points">${escapeHtml(question.title || `Item ${question.number}`)}</span>
        </div>
        <div class="question-panel">
          ${promptImageBlock}
          <p class="question-text">${formatMarkup(question.prompt)}</p>
          ${promptList}
          ${answerBlock}
        </div>
        <div class="question-actions">
          ${answerBtn}
          <button type="button" class="btn" data-action="back-board">Back</button>
        </div>
      </section>
    `;
  }

  function renderMcqQuestion(round) {
    const found = getMcqQuestion(round, state.questionId);
    if (!found) {
      state.view = "board";
      return renderBoard();
    }

    const { category, question } = found;
    const optionsBlock = renderMcqOptions(question.options);

    let answerBlock = "";
    if (state.showAnswer) {
      const keyList =
        Array.isArray(question.answerKey) && question.answerKey.length
          ? `<ul class="answer-breakdown">${question.answerKey
              .map((item) => {
                const isCorrect = item.startsWith(`${question.answer}:`);
                return `<li class="${isCorrect ? "answer-correct" : ""}">${escapeHtml(item)}</li>`;
              })
              .join("")}</ul>`
          : "";
      answerBlock = `
        <div class="answer-box">
          <p class="answer-label">Answer</p>
          <p class="answer-text answer-price">${escapeHtml(question.answer)}</p>
          ${keyList}
        </div>
      `;
    }

    const answerBtn = state.showAnswer
      ? ""
      : `<button type="button" class="btn btn-gold" data-action="show-answer">Reveal answer</button>`;

    return `
      <section class="question-view">
        <div class="question-meta">
          <h2 class="question-cat">${escapeHtml(category.name)}</h2>
          <span class="question-points">${escapeHtml(question.title || `Q${question.number}`)}</span>
        </div>
        <div class="question-panel">
          <p class="question-text">${formatMarkup(question.prompt)}</p>
          ${optionsBlock}
          ${answerBlock}
        </div>
        <div class="question-actions">
          ${answerBtn}
          <button type="button" class="btn" data-action="back-board">Back</button>
        </div>
      </section>
    `;
  }

  function renderMcqOptions(options) {
    if (!Array.isArray(options) || !options.length) return "";

    const allImages = options.every((opt) => opt.image);
    const items = options
      .map((opt) => {
        if (opt.image) {
          return `
            <div class="mcq-option mcq-option-image">
              <span class="mcq-key">${escapeHtml(opt.key)}</span>
              <div class="mcq-option-frame">
                <img class="mcq-option-img" src="${assetUrl(opt.image)}" alt="Option ${escapeAttr(opt.key)}" />
              </div>
            </div>
          `;
        }
        return `
          <div class="mcq-option mcq-option-text">
            <span class="mcq-key">${escapeHtml(opt.key)}</span>
            <span class="mcq-option-label">${escapeHtml(opt.text || "")}</span>
          </div>
        `;
      })
      .join("");

    const gridClass = allImages ? "mcq-options mcq-options-images" : "mcq-options";
    return `<div class="${gridClass}">${items}</div>`;
  }

  function renderPromptImages(images) {
    if (!Array.isArray(images) || !images.length) return "";
    const imgs = images
      .map(
        (src, i) =>
          `<img class="prompt-image" src="${assetUrl(src)}" alt="Question image ${i + 1}" />`
      )
      .join("");
    return `<div class="prompt-images">${imgs}</div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  function bindEvents() {
    app.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", onAction);
    });
  }

  function onAction(event) {
    const el = event.currentTarget;
    const action = el.getAttribute("data-action");

    if (action === "open-round") {
      state = {
        view: "board",
        roundId: el.getAttribute("data-round"),
        categoryId: null,
        points: null,
        questionId: null,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "go-home") {
      state = {
        view: "home",
        roundId: null,
        categoryId: null,
        points: null,
        questionId: null,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "reset-round") {
      if (!state.roundId) return;
      const ok = window.confirm("Reset this board? All opened cards will be cleared.");
      if (!ok) return;
      resetRound(state.roundId);
      render();
      return;
    }

    if (action === "reset-all") {
      const ok = window.confirm(
        "Reset the entire quiz? All opened questions across every round will be cleared."
      );
      if (!ok) return;
      resetAll();
      render();
      return;
    }

    if (action === "open-cell") {
      const categoryId = el.getAttribute("data-category");
      const points = Number(el.getAttribute("data-points"));
      markOpened(cellKey(state.roundId, categoryId, points));
      state = {
        ...state,
        view: "question",
        categoryId,
        points,
        questionId: null,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "open-price") {
      const questionId = el.getAttribute("data-question");
      markOpened(cellKey(state.roundId, questionId));
      state = {
        ...state,
        view: "question",
        categoryId: null,
        points: null,
        questionId,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "open-mcq") {
      const questionId = el.getAttribute("data-question");
      markOpened(cellKey(state.roundId, questionId));
      state = {
        ...state,
        view: "question",
        categoryId: null,
        points: null,
        questionId,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "open-ex") {
      const questionId = el.getAttribute("data-question");
      markOpened(cellKey(state.roundId, questionId));
      state = {
        ...state,
        view: "question",
        categoryId: null,
        points: null,
        questionId,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
      return;
    }

    if (action === "show-hint") {
      state.showHint = true;
      render();
      return;
    }

    if (action === "show-answer") {
      state.showAnswer = true;
      render();
      return;
    }

    if (action === "back-board") {
      state = {
        ...state,
        view: "board",
        categoryId: null,
        points: null,
        questionId: null,
        showHint: false,
        showAnswer: false,
        clueIndex: 0,
      };
      render();
    }

    if (action === "next-clue") {
      const expected = Number(el.getAttribute("data-expected-index"));
      if (expected !== state.clueIndex) return;
      const round = getRound(state.roundId);
      const question = round ? getExQuestion(round, state.questionId) : null;
      const clues = question && Array.isArray(question.clues) ? question.clues : [];
      if (state.clueIndex < clues.length - 1) {
        state.clueIndex += 1;
      }
      render();
      return;
    }

    if (action === "prev-clue") {
      const expected = Number(el.getAttribute("data-expected-index"));
      if (expected !== state.clueIndex) return;
      if (state.clueIndex > 0) {
        state.clueIndex -= 1;
      }
      render();
      return;
    }
  }

  async function boot() {
    app.innerHTML = `
      <section class="home">
        <h1 class="brand">Quiz Deck</h1>
        <p class="home-sub">Loading quiz data…</p>
      </section>
    `;

    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load ${DATA_URL} (${response.status})`);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.rounds)) {
        throw new Error('quiz-data.json must contain a top-level "rounds" array.');
      }
      QUIZ_DATA = data;
      render();
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      app.innerHTML = `
        <section class="home">
          <h1 class="brand">Quiz Deck</h1>
          <p class="home-sub">Could not load quiz-data.json.</p>
          <p class="home-sub">${escapeHtml(message)}</p>
          <p class="home-sub">Open this site via a local server or GitHub Pages (not by double-clicking the HTML file), and check that quiz-data.json is valid.</p>
        </section>
      `;
    }
  }

  boot();
})();
