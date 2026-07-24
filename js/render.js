// ─── RENDER MODULE ───────────────────────────────────────────

function renderTable() {
  const tbody  = document.getElementById("tableBody");
  const items  = getCurrentPageItems();
  const solved = getSolvedSet();

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="icon">🔍</div>
          <p>No questions match your filters.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(q => {
    const tw        = activeFilters.timeWindow;
    const isSolved  = solved.has(q.id);
    const companies = getCompaniesForWindow(q, tw).length
      ? getCompaniesForWindow(q, tw)
      : Object.keys(q.companies).sort();

    const shown   = companies.slice(0, 3);
    const extra   = companies.length - 3;
    const tags    = shown.map(c =>
      `<span class="co-tag">${formatCompanyName(c).substring(0,16)}</span>`
    ).join("");
    const moreTag = extra > 0
      ? `<span class="co-tag more" onclick="event.stopPropagation();openModal(${q.id})">+${extra}</span>`
      : "";

    const freq    = getMaxFreq(q, tw);
    const freqStr = freq > 0 ? freq.toFixed(1) + "%" : "—";
    const pat     = getPattern(q.id).split(" / ")[0];

    return `
      <tr class="${isSolved ? "solved" : ""}" onclick="openModal(${q.id})">
        <td class="check-cell" onclick="event.stopPropagation()">
          <button class="check-btn ${isSolved ? "checked" : ""}"
                  data-id="${q.id}"
                  onclick="toggleSolved(${q.id})"
                  title="${isSolved ? "Mark unsolved" : "Mark solved"}">
            ${isSolved ? "✓" : ""}
          </button>
        </td>
        <td class="q-num">#${q.id}</td>
        <td class="q-title">
          <a href="${q.url}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">${q.title}</a>
        </td>
        <td><span class="badge ${q.difficulty}">${q.difficulty}</span></td>
        <td><span class="pattern-tag">${pat}</span></td>
        <td><div class="companies-cell">${tags}${moreTag}</div></td>
        <td class="freq-cell">${freqStr}</td>
      </tr>`;
  }).join("");
}

function renderPagination() {
  const total = getTotalPages();
  const el    = document.getElementById("pagination");
  if (total <= 1) { el.innerHTML = ""; return; }

  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - currentPage) <= 2) range.push(i);
    else if (range[range.length - 1] !== "…") range.push("…");
  }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})"
    ${currentPage===1?"disabled":""}>←</button>`;
  range.forEach(p => {
    html += p === "…"
      ? `<span class="page-btn ellipsis">…</span>`
      : `<button class="page-btn ${p===currentPage?"active":""}"
           onclick="goPage(${p})">${p}</button>`;
  });
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})"
    ${currentPage===total?"disabled":""}>→</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  setPage(p);
  renderTable();
  renderPagination();
  document.querySelector("main").scrollTo({ top: 0, behavior: "smooth" });
}

function renderResultsInfo() {
  document.getElementById("resultsInfo").innerHTML =
    `<strong>${filteredQuestions.length.toLocaleString()}</strong> questions found`;
}

function renderCompanyDropdown() {
  const sel = document.getElementById("companyFilter");
  companiesList.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = formatCompanyName(c);
    sel.appendChild(opt);
  });
}

function renderPatternList() {
  const counts    = buildPatternCounts();
  const container = document.getElementById("patternList");
  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className    = "pattern-btn active";
  allBtn.dataset.pattern = "all";
  const totalQ = Object.keys(allQuestions).length;
  allBtn.innerHTML = `<span>All Patterns</span><span class="count">${totalQ}</span>`;
  allBtn.onclick   = () => setPatternFilter("all");
  container.appendChild(allBtn);

  PATTERN_GROUPS.forEach(p => {
    if (!counts[p]) return;
    const btn = document.createElement("button");
    btn.className      = "pattern-btn";
    btn.dataset.pattern = p;
    btn.innerHTML      = `<span>${p}</span><span class="count">${counts[p]}</span>`;
    btn.onclick        = () => setPatternFilter(p);
    container.appendChild(btn);
  });
}

function openModal(id) {
  const q      = allQuestions[id];
  if (!q) return;
  const tw       = activeFilters.timeWindow;
  const solved   = getSolvedSet();
  const isSolved = solved.has(id);
  const companies = getCompaniesForWindow(q, tw).length
    ? getCompaniesForWindow(q, tw)
    : Object.keys(q.companies).sort();

  document.getElementById("modalTitle").textContent = `#${q.id} — ${q.title}`;
  document.getElementById("modalMeta").innerHTML = `
    <span class="badge ${q.difficulty}">${q.difficulty}</span>
    <span class="pattern-tag">${getPattern(q.id)}</span>
    ${q.acceptance ? `<span class="meta-stat">Acceptance: <strong>${q.acceptance.toFixed(1)}%</strong></span>` : ""}
  `;
  const freq = getMaxFreq(q, tw);
  document.getElementById("modalFreq").textContent =
    freq > 0 ? `Max frequency: ${freq.toFixed(1)}%` : "";

  document.getElementById("modalCompanyCount").textContent = companies.length;
  document.getElementById("modalCompanies").innerHTML = companies.map(c =>
    `<span class="co-full">${formatCompanyName(c)}</span>`
  ).join("");

  // Solve button in modal
  const solveBtn = document.getElementById("modalSolveBtn");
  solveBtn.className = `modal-solve-btn ${isSolved ? "solved" : ""}`;
  solveBtn.innerHTML = isSolved ? "✓ Solved" : "Mark as Solved";
  solveBtn.onclick   = () => {
    toggleSolved(id);
    const nowSolved = getSolvedSet().has(id);
    solveBtn.className = `modal-solve-btn ${nowSolved ? "solved" : ""}`;
    solveBtn.innerHTML = nowSolved ? "✓ Solved" : "Mark as Solved";
  };

  document.getElementById("modalLink").href = q.url;
  document.getElementById("modalOverlay").classList.add("open");
}

function formatCompanyName(name) {
  return name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function renderStats() {
  document.getElementById("totalQ").textContent = Object.keys(allQuestions).length.toLocaleString();
  document.getElementById("totalC").textContent = companiesList.length;
}

function setLoadingProgress(percent, statusText) {
  document.getElementById("progressFill").style.width = `${percent}%`;
  document.getElementById("loadingStatus").textContent = statusText;
}

function showInlineLoader(text) {
  let el = document.getElementById("inlineLoader");
  if (!el) {
    el = document.createElement("div");
    el.id = "inlineLoader"; el.className = "inline-loader";
    document.querySelector(".toolbar").after(el);
  }
  el.textContent = text; el.style.display = "block";
}
function hideInlineLoader() {
  const el = document.getElementById("inlineLoader");
  if (el) el.style.display = "none";
}
