/* ================================================
   main.js — Sidebar, Tabs, Quiz engine, Filters, 
   Font-size, Modals, localStorage
   ================================================ */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- SIDEBAR ---------- */
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("sidebarClose");

  const openSidebar = () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  };
  const closeSidebar = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  };

  menuBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  /* ---------- TAB NAVIGATION ---------- */
  const tabLinks = document.querySelectorAll("[data-tab]");
  const panels = document.querySelectorAll(".panel");

  function activateTab(id) {
    panels.forEach((p) => p.classList.remove("active"));
    tabLinks.forEach((l) => l.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) {
      target.classList.add("active");
      tabLinks.forEach((l) => {
        if (l.dataset.tab === id) l.classList.add("active");
      });
    }
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activateTab(link.dataset.tab);
      history.replaceState(null, "", "#" + link.dataset.tab);
    });
  });

  // Hero "Comenzar" button
  document.getElementById("heroStart")?.addEventListener("click", () => {
    activateTab("panel-fundamentos");
    history.replaceState(null, "", "#panel-fundamentos");
  });

  // restore tab from hash
  const hash = location.hash.replace("#", "");
  if (hash && document.getElementById(hash)) activateTab(hash);

  /* ---------- FONT SIZE ---------- */
  const fontBtns = document.querySelectorAll(".font-btn");
  const root = document.documentElement; // <html>
  const savedFont = localStorage.getItem("fontSize") || "font-md";
  root.classList.add(savedFont);
  fontBtns.forEach((b) => {
    if (b.dataset.size === savedFont) b.classList.add("active");
  });

  fontBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      root.classList.remove("font-sm", "font-md", "font-lg");
      const size = btn.dataset.size;
      root.classList.add(size);
      localStorage.setItem("fontSize", size);
      fontBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  /* ---------- PANEL NAV — Anterior / Siguiente ---------- */
  const panelOrder = [
    "panel-hero","panel-fundamentos","panel-ia",
    "panel-casos","panel-herramientas","panel-quiz","panel-biblio"
  ];
  const panelNames = [
    "Inicio","Fundamentos","IA y ética",
    "Casos","Herramientas","Cuestionario","Bibliografía"
  ];
  const btnPrev = document.getElementById("navPrev");
  const btnNext = document.getElementById("navNext");
  const navIndicator = document.getElementById("navIndicator");

  function updatePanelNav() {
    const current = document.querySelector(".panel.active");
    if (!current) return;
    const idx = panelOrder.indexOf(current.id);
    if (idx < 0) return;
    btnPrev.hidden = idx === 0;
    btnNext.hidden = idx === panelOrder.length - 1;
    navIndicator.textContent = (idx + 1) + " / " + panelOrder.length + " — " + panelNames[idx];
  }

  btnPrev?.addEventListener("click", () => {
    const current = document.querySelector(".panel.active");
    const idx = panelOrder.indexOf(current?.id);
    if (idx > 0) {
      activateTab(panelOrder[idx - 1]);
      history.replaceState(null, "", "#" + panelOrder[idx - 1]);
    }
  });
  btnNext?.addEventListener("click", () => {
    const current = document.querySelector(".panel.active");
    const idx = panelOrder.indexOf(current?.id);
    if (idx < panelOrder.length - 1) {
      activateTab(panelOrder[idx + 1]);
      history.replaceState(null, "", "#" + panelOrder[idx + 1]);
    }
  });

  // patch activateTab to update nav
  const _origActivate = activateTab;
  activateTab = function(id) {
    _origActivate(id);
    updatePanelNav();
  };
  updatePanelNav();

  /* ---------- FILTER BUTTONS ---------- */
  document.querySelectorAll(".filter-bar").forEach((bar) => {
    const buttons = bar.querySelectorAll(".filter-btn");
    const gridId = bar.dataset.target;
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const items = grid.querySelectorAll("[data-theme]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const theme = btn.dataset.filter;
        items.forEach((item) => {
          item.style.display =
            theme === "all" || item.dataset.theme === theme ? "" : "none";
        });
      });
    });
  });

  /* ---------- SEARCH ---------- */
  document.querySelectorAll(".search-input").forEach((input) => {
    const gridId = input.dataset.target;
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const items = grid.querySelectorAll("[data-searchable]");

    input.addEventListener("input", () => {
      const q = input.value.toLowerCase().trim();
      items.forEach((item) => {
        const text = item.dataset.searchable.toLowerCase();
        item.style.display = text.includes(q) ? "" : "none";
      });
    });
  });

  /* ---------- MODAL ---------- */
  window.openModal = function (modalId) {
    document.getElementById(modalId)?.classList.add("open");
  };
  window.closeModal = function (modalId) {
    document.getElementById(modalId)?.classList.remove("open");
  };
  document.querySelectorAll(".modal-overlay").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  });

  /* ================================================
       QUIZ ENGINE
       ================================================ */
  const quizContainer = document.getElementById("quizContainer");
  const quizProgress = document.getElementById("quizProgressFill");
  const quizProgText = document.getElementById("quizProgressText");
  const quizResults = document.getElementById("quizResults");

  let quizData = [];
  let answers = {};
  let submitted = false;

  // Load quiz data
  fetch("assets/quiz-data.json")
    .then((r) => r.json())
    .then((data) => {
      quizData = data;
      renderQuiz();
      restoreAnswers();
    })
    .catch(() => {
      if (quizContainer)
        quizContainer.innerHTML = "<p>No se pudo cargar el cuestionario.</p>";
    });

  function renderQuiz() {
    if (!quizContainer) return;
    quizContainer.innerHTML = "";
    quizData.forEach((q, idx) => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.id = "q-" + q.id;

      let typeLabel = "",
        typeCls = "";
      if (q.type === "mcq") {
        typeLabel = "Opción múltiple";
        typeCls = "mcq";
      }
      if (q.type === "match") {
        typeLabel = "Emparejamiento";
        typeCls = "match";
      }
      if (q.type === "open") {
        typeLabel = "Respuesta abierta";
        typeCls = "open";
      }

      let inner = `
                <div class="q-number">Pregunta ${idx + 1} de ${quizData.length} <span class="q-type ${typeCls}">${typeLabel}</span></div>
                <h3>${q.question}</h3>`;

      if (q.type === "mcq") {
        inner += '<div class="quiz-options">';
        q.options.forEach((opt, oi) => {
          inner += `<div class="quiz-option" data-qid="${q.id}" data-oi="${oi}" onclick="selectOption(${q.id},${oi})">
                        <div class="radio-circle"></div><span>${opt}</span></div>`;
        });
        inner += "</div>";
      }

      if (q.type === "match") {
        inner +=
          '<div class="match-columns"><div class="match-col"><h4>Valores</h4>';
        q.pairs.forEach((p, pi) => {
          inner += `<div class="match-item" data-qid="${q.id}" data-side="left" data-pi="${pi}">${p.left}</div>`;
        });
        inner += '</div><div class="match-col"><h4>Ejemplos</h4>';
        // shuffle right side display
        const shuffled = q.pairs.map((p, pi) => ({ text: p.right, pi }));
        shuffled.sort(() => Math.random() - 0.5);
        shuffled.forEach((s) => {
          inner += `<div class="match-item" data-qid="${q.id}" data-side="right" data-pi="${s.pi}">${s.text}</div>`;
        });
        inner += "</div></div>";
      }

      if (q.type === "open") {
        inner += `<textarea class="open-textarea" data-qid="${q.id}" placeholder="Escribe tu respuesta aquí..." oninput="saveOpenAnswer(${q.id}, this.value)"></textarea>`;
        if (q.criteria) {
          inner += `<p style="font-size:.78rem;color:var(--text-muted);margin-top:8px"><strong>Criterio de evaluación:</strong> ${q.criteria}</p>`;
        }
      }

      inner += `<div class="quiz-feedback" id="fb-${q.id}"></div>`;
      card.innerHTML = inner;
      quizContainer.appendChild(card);
    });

    updateProgress();
  }

  // MCQ selection
  window.selectOption = function (qid, oi) {
    if (submitted) return;
    answers[qid] = oi;
    document
      .querySelectorAll(`.quiz-option[data-qid="${qid}"]`)
      .forEach((opt) => {
        opt.classList.toggle("selected", parseInt(opt.dataset.oi) === oi);
      });
    saveAnswers();
    updateProgress();
  };

  // Open answer
  window.saveOpenAnswer = function (qid, val) {
    if (submitted) return;
    answers[qid] = val;
    saveAnswers();
    updateProgress();
  };

  // Match interaction (simple left-right click matching)
  let matchSelection = null;
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".match-item");
    if (!item || submitted) return;
    const qid = item.dataset.qid;
    const side = item.dataset.side;
    const pi = parseInt(item.dataset.pi);

    if (!matchSelection) {
      if (side === "left") {
        matchSelection = { qid, pi, el: item };
        item.style.borderColor = "var(--accent)";
        item.style.background = "var(--accent-soft)";
      }
    } else {
      if (matchSelection.qid === qid && side === "right") {
        // Record match
        if (!answers[qid]) answers[qid] = {};
        answers[qid][matchSelection.pi] = pi;
        matchSelection.el.classList.add("matched");
        item.classList.add("matched");
        matchSelection.el.style.borderColor = "";
        matchSelection.el.style.background = "";
      } else {
        matchSelection.el.style.borderColor = "";
        matchSelection.el.style.background = "";
      }
      matchSelection = null;
      saveAnswers();
      updateProgress();
    }
  });

  function updateProgress() {
    const answered = Object.keys(answers).length;
    const total = quizData.length;
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    if (quizProgress) quizProgress.style.width = pct + "%";
    if (quizProgText)
      quizProgText.textContent = `${answered} / ${total} respondidas`;
  }

  // Submit
  window.submitQuiz = function () {
    submitted = true;
    let totalPoints = 0;
    let earned = 0;

    quizData.forEach((q) => {
      totalPoints += q.points;
      const card = document.getElementById("q-" + q.id);
      const fb = document.getElementById("fb-" + q.id);
      let isCorrect = false;

      if (q.type === "mcq") {
        isCorrect = answers[q.id] === q.correct;
        if (isCorrect) earned += q.points;
        // highlight
        document
          .querySelectorAll(`.quiz-option[data-qid="${q.id}"]`)
          .forEach((opt) => {
            const oi = parseInt(opt.dataset.oi);
            opt.classList.remove("selected");
            if (oi === q.correct) opt.classList.add("correct-answer");
            else if (oi === answers[q.id]) opt.classList.add("wrong-answer");
          });
        card.classList.add(isCorrect ? "correct" : "incorrect");
      }

      if (q.type === "match") {
        const ans = answers[q.id] || {};
        let matchCorrect = true;
        q.pairs.forEach((p, pi) => {
          if (ans[pi] !== pi) matchCorrect = false;
        });
        isCorrect = matchCorrect;
        if (isCorrect) earned += q.points;
        card.classList.add(isCorrect ? "correct" : "incorrect");
      }

      if (q.type === "open") {
        // auto-award 1 point if > 20 chars
        const val = (answers[q.id] || "").trim();
        if (val.length > 20) {
          earned += 1;
          isCorrect = true;
        }
        card.classList.add(val.length > 20 ? "correct" : "incorrect");
      }

      if (fb) {
        fb.textContent = q.feedback;
        fb.classList.add("show", isCorrect ? "correct" : "incorrect");
      }
    });

    // show results
    const pct = Math.round((earned / totalPoints) * 100);
    if (quizResults) {
      let level, cls, msg;
      if (pct >= 80) {
        level = "high";
        cls = "high";
        msg = "Comprensión sólida. ¡Excelente trabajo!";
      } else if (pct >= 60) {
        level = "mid";
        cls = "mid";
        msg =
          "Buen entendimiento. Revisa algunos conceptos para afianzar tu conocimiento.";
      } else {
        level = "low";
        cls = "low";
        msg =
          "Recomendamos tomar el Curso A para reforzar los fundamentos de ética.";
      }
      quizResults.innerHTML = `
                <div class="score-circle ${cls}">${pct}%<small>${earned}/${totalPoints} pts</small></div>
                <h3>Resultado</h3>
                <p>${msg}</p>
                <div style="margin-top:20px">
                    <button class="quiz-reset" onclick="resetQuiz()">Reiniciar cuestionario</button>
                </div>`;
      quizResults.style.display = "block";
      quizResults.scrollIntoView({ behavior: "smooth" });
    }

    // save to localStorage
    localStorage.setItem(
      "quizResult",
      JSON.stringify({
        pct,
        earned,
        totalPoints,
        date: new Date().toISOString(),
      }),
    );
  };

  window.resetQuiz = function () {
    submitted = false;
    answers = {};
    localStorage.removeItem("quizAnswers");
    localStorage.removeItem("quizResult");
    if (quizResults) quizResults.style.display = "none";
    renderQuiz();
  };

  function saveAnswers() {
    localStorage.setItem("quizAnswers", JSON.stringify(answers));
  }
  function restoreAnswers() {
    try {
      const saved = JSON.parse(localStorage.getItem("quizAnswers"));
      if (saved) {
        answers = saved;
        // restore MCQ visuals
        Object.entries(answers).forEach(([qid, val]) => {
          if (typeof val === "number") {
            document
              .querySelectorAll(`.quiz-option[data-qid="${qid}"]`)
              .forEach((opt) => {
                opt.classList.toggle(
                  "selected",
                  parseInt(opt.dataset.oi) === val,
                );
              });
          }
          if (typeof val === "string") {
            const ta = document.querySelector(
              `.open-textarea[data-qid="${qid}"]`,
            );
            if (ta) ta.value = val;
          }
        });
        updateProgress();
      }
    } catch (e) {}
  }
});
