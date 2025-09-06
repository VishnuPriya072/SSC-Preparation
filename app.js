/* SSC Prep PWA - Vanilla JS SPA */
let state = {
  exam: "CGL",
  section: "general_awareness",
  count: 10,
  mode: "practice",
  questions: [],
  idx: 0,
  score: 0,
  answers: {}, // qid -> chosen index
};

const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    themeToggle.textContent = "☀️ Day Mode";
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.textContent = "🌙 Night Mode";
    localStorage.setItem("theme", "light");
  }
});

// Apply saved theme on load
window.addEventListener("load", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Day Mode";
  }
});

async function loadQuestions(exam, section) {
  const res = await fetch("data/questions.json");
  const all = await res.json();
  const pool = (all[exam] && all[exam][section]) ? all[exam][section] : [];
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, state.count);
}

function saveProgress() {
  localStorage.setItem("ssc_prep_state", JSON.stringify(state));
}

function loadProgress() {
  const raw = localStorage.getItem("ssc_prep_state");
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.questions && Array.isArray(obj.questions)) {
      state = obj;
      renderQuiz();
      $("#quizSection").classList.remove("hidden");
    }
  } catch {}
}

function getSelected(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function renderQuiz() {
  $("#quizTitle").textContent = `${state.exam} • ${pretty(state.section)}`;
  $("#progress").textContent = `Q ${state.idx + 1}/${state.questions.length}`;
  $("#score").textContent = `Score: ${state.score}`;

  const q = state.questions[state.idx];
  const wrap = $("#questionBox");
  wrap.innerHTML = "";
  const qDiv = document.createElement("div");
  qDiv.className = "question";
  qDiv.innerHTML = `<div class="qtext">${q.q}</div>`;

  const opts = document.createElement("div");
  opts.className = "options";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleAnswer(i));
    // show previously selected
    if (state.answers[q.id] !== undefined) {
      const chosen = state.answers[q.id];
      if (i === chosen) {
        if (chosen === q.answer) btn.classList.add("correct");
        else btn.classList.add("wrong");
      }
    }
    opts.appendChild(btn);
  });

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<strong>Tip:</strong> ${q.explain}`;

  qDiv.appendChild(opts);
  if (state.mode === "practice") qDiv.appendChild(meta);
  wrap.appendChild(qDiv);

  $("#prevBtn").disabled = state.idx === 0;
  $("#nextBtn").disabled = state.idx >= state.questions.length - 1;
}

function handleAnswer(i) {
  const q = state.questions[state.idx];
  const prev = state.answers[q.id];
  state.answers[q.id] = i;
  const correct = i === q.answer;
  // scoring logic: only score once per question (first attempt)
  if (prev === undefined && correct) {
    state.score += 1;
  }

  // UI feedback
  const buttons = $$(".option");
  buttons.forEach((b, idx) => {
    b.classList.remove("correct","wrong");
    if (idx === q.answer) b.classList.add("correct");
    if (idx === i && idx !== q.answer) b.classList.add("wrong");
  });

  if (state.mode === "practice") {
    // auto-advance after short delay
    setTimeout(() => {
      if (state.idx < state.questions.length - 1) {
        state.idx += 1;
        renderQuiz();
        saveProgress();
      }
    }, 500);
  } else {
    saveProgress();
  }
}

function pretty(sectionKey) {
  switch(sectionKey){
    case "general_awareness": return "General Awareness";
    case "aptitude": return "Aptitude";
    case "english": return "English";
    case "general_intelligence": return "General Intelligence";
    default: return sectionKey;
  }
}

function showResult() {
  const total = state.questions.length;
  const correct = state.score;
  const percent = Math.round((correct/total)*100);
  const box = $("#resultBox");
  box.classList.remove("hidden");
  box.innerHTML = `<h3>Your Result</h3>
    <p><strong>${correct}</strong> / ${total} correct (${percent}%).</p>
    <p>Great job! Review explanations in Practice mode for deeper understanding.</p>`;
}

async function startQuiz() {
  state.exam = getSelected("exam") || "CGL";
  state.section = getSelected("section") || "general_awareness";
  state.count = parseInt($("#countSelect").value, 10);
  state.mode = $("#modeSelect").value;
  state.idx = 0;
  state.score = 0;
  state.answers = {};
  state.questions = await loadQuestions(state.exam, state.section);
  $("#quizSection").classList.remove("hidden");
  $("#resultBox").classList.add("hidden");
  renderQuiz();
  saveProgress();
}

// Navigation
$("#startBtn").addEventListener("click", startQuiz);
$("#prevBtn").addEventListener("click", () => {
  if (state.idx > 0) { state.idx -= 1; renderQuiz(); saveProgress(); }
});
$("#nextBtn").addEventListener("click", () => {
  if (state.idx < state.questions.length - 1) { state.idx += 1; renderQuiz(); saveProgress(); }
});
$("#finishBtn").addEventListener("click", () => { showResult(); saveProgress(); });
$("#resetBtn").addEventListener("click", () => {
  localStorage.removeItem("ssc_prep_state");
  state.idx = 0; state.score = 0; state.answers = {}; renderQuiz();
});
$("#clearData").addEventListener("click", (e) => { e.preventDefault(); localStorage.clear(); alert("Cleared!"); });

// PWA install prompt
let deferredPrompt;
const installBtn = $("#installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

// Try to restore previous session
loadProgress();
