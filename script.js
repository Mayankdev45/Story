/* ─────────────────────────────────────────────
   Mythos — Story Creator
   script.js
───────────────────────────────────────────── */

// ── State ────────────────────────────────────
let fullStoryText = "";

const LOADING_MESSAGES = [
  "Crafting your story scenes…",
  "Building the plot arc…",
  "Polishing every word…",
  "Almost ready — your story awaits…",
];

// ── DOM refs ─────────────────────────────────
const genBtn      = document.getElementById("genBtn");
const btnText     = document.getElementById("btnText");
const errorBox    = document.getElementById("errorBox");
const loadingBar  = document.getElementById("loadingBar");
const loadingFill = document.getElementById("loadingFill");
const loadingMsg  = document.getElementById("loadingMsg");
const storyPage   = document.getElementById("storyPage");
const storyEnd    = document.getElementById("storyEnd");

// ── Buttons ───────────────────────────────────
document.getElementById("newStoryBtn").addEventListener("click", resetToForge);
document.getElementById("copyBtn").addEventListener("click", copyStory);
genBtn.addEventListener("click", generate);

// ── Main generate flow ───────────────────────
async function generate() {
  const genre     = document.getElementById("genre").value;
  const setting   = document.getElementById("setting").value;
  const hero      = document.getElementById("hero").value.trim() || "Arjun";
  const trait     = document.getElementById("trait").value;
  const numScenes = parseInt(document.getElementById("numScenes").value);

  setLoading(true);
  hideError();
  storyPage.classList.remove("visible");
  storyEnd.classList.remove("visible");
  showLoadingBar();

  let msgIndex = 0;
  loadingMsg.textContent = LOADING_MESSAGES[0];
  const msgTimer = setInterval(() => {
    msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
    loadingMsg.textContent = LOADING_MESSAGES[msgIndex];
  }, 2200);

  try {
    const response = await fetch("/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genre, setting, hero, trait, numScenes }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server error. Please try again.");
    }

    clearInterval(msgTimer);
    finishLoadingBar();
    renderStory(data, genre, setting);

    setTimeout(() => {
      hideLoadingBar();
      storyPage.classList.add("visible");
      storyPage.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);

  } catch (err) {
    clearInterval(msgTimer);
    hideLoadingBar();
    showError(err.message);
  }

  setLoading(false);
}

// ── Render story ─────────────────────────────
function renderStory(story, genre, setting) {
  document.getElementById("storyGenreTag").textContent =
    capitalize(genre) + " · " + capitalize(setting);
  document.getElementById("storyMainTitle").textContent = story.title;
  document.getElementById("storyByline").textContent    = story.byline || "";

  const container = document.getElementById("scenesContainer");
  container.innerHTML = "";
  storyEnd.classList.remove("visible");
  fullStoryText = story.title + "\n\n";

  story.scenes.forEach((scene, i) => {
    const isLast  = i === story.scenes.length - 1;

    const paraText = (scene.paragraphs || []).join("\n\n");
    fullStoryText += `Scene ${i + 1}: ${scene.scene_title}\n\n${paraText}\n\n`;

    const paraHTML = (scene.paragraphs || [])
      .map((p) => `<p>${escapeHTML(p)}</p>`)
      .join("");

    const el = document.createElement("div");
    el.className = "scene";
    el.id = "scene-" + i;

    el.innerHTML = `
      <div class="scene-number">Scene ${i + 1} of ${story.scenes.length}</div>
      <div class="scene-title">${escapeHTML(scene.scene_title)}</div>
      <div class="scene-text">${paraHTML}</div>
      ${!isLast ? '<div class="scene-divider"><span class="divider-glyph">❧</span></div>' : ""}
    `;

    container.appendChild(el);
    setTimeout(() => el.classList.add("revealed"), 100 + i * 130);
  });

  setTimeout(() => {
    storyEnd.classList.add("visible");
  }, 500 + story.scenes.length * 130);
}

// ── UI helpers ────────────────────────────────
function setLoading(on) {
  genBtn.disabled = on;
  if (on) {
    genBtn.classList.add("loading");
    btnText.textContent = "Creating your story…";
  } else {
    genBtn.classList.remove("loading");
    btnText.innerHTML = "Generate my story &rarr;";
  }
}

function showLoadingBar() {
  loadingBar.classList.add("visible");
  loadingMsg.classList.add("visible");
  loadingFill.style.transition = "none";
  loadingFill.style.width = "0%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 14s ease";
      loadingFill.style.width = "85%";
    });
  });
}

function finishLoadingBar() {
  loadingFill.style.transition = "width 0.35s ease";
  loadingFill.style.width = "100%";
}

function hideLoadingBar() {
  loadingBar.classList.remove("visible");
  loadingMsg.classList.remove("visible");
  loadingFill.style.width = "0%";
}

function showError(msg) {
  errorBox.textContent = "Error: " + msg;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
  errorBox.textContent = "";
}

function resetToForge() {
  storyPage.classList.remove("visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyStory() {
  navigator.clipboard
    .writeText(fullStoryText.trim())
    .then(() => {
      const btn = document.getElementById("copyBtn");
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy full story"), 2200);
    })
    .catch(() => alert("Copy failed — please copy manually."));
}

// ── Utils ─────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}