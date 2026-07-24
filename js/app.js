// ─── APP ENTRY POINT ─────────────────────────────────────────

function refreshUI() {
  applyFilters();
  renderTable();
  renderPagination();
  renderResultsInfo();
}

function setPatternFilter(p) {
  activeFilters.pattern = p;
  document.querySelectorAll(".pattern-btn")
    .forEach(b => b.classList.toggle("active", b.dataset.pattern === p));
  refreshUI();
}

// ─── EVENT LISTENERS ─────────────────────────────────────────

document.getElementById("searchInput").addEventListener("input", e => {
  activeFilters.search = e.target.value.trim();
  refreshUI();
});

document.querySelectorAll("[data-diff]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-diff]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilters.difficulty = btn.dataset.diff;
    refreshUI();
  });
});

document.getElementById("timeWindow").addEventListener("change", async e => {
  const tw  = e.target.value;
  const lbl = e.target.options[e.target.selectedIndex].text;
  activeFilters.timeWindow = tw;
  if (tw !== "all") {
    showInlineLoader(`⏳ Loading ${lbl} data…`);
    await ensureTimeWindowLoaded(tw, (loaded, total) => {
      showInlineLoader(`⏳ Loading ${lbl}… (${loaded}/${total})`);
    });
    hideInlineLoader();
  }
  refreshUI();
});

document.getElementById("companyFilter").addEventListener("change", e => {
  activeFilters.company = e.target.value;
  refreshUI();
});

document.querySelectorAll("[data-sort]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-sort]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeSort = btn.dataset.sort;
    refreshUI();
  });
});

document.getElementById("modalClose").addEventListener("click", () =>
  document.getElementById("modalOverlay").classList.remove("open"));
document.getElementById("modalOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modalOverlay"))
    document.getElementById("modalOverlay").classList.remove("open");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape")
    document.getElementById("modalOverlay").classList.remove("open");
});

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  setLoadingProgress(0, "Starting…");
  await loadData((pct, status) => setLoadingProgress(pct, status));
  renderCompanyDropdown();
  renderPatternList();
  renderStats();
  initProgress();
  refreshUI();
  setTimeout(() => {
    const s = document.getElementById("loadingScreen");
    s.style.opacity = "0";
    setTimeout(() => s.remove(), 400);
  }, 300);
}

init();
