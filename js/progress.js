// ─── PROGRESS TRACKER ────────────────────────────────────────
// Manages solved questions in localStorage + renders the progress ring

const STORAGE_KEY = "dsa_tracker_solved_v1";
const CIRC        = 2 * Math.PI * 50;   // r=50 → ≈314.16

/* ── localStorage helpers ──────────────────────────────── */
function getSolvedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveSolvedSet(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/* ── Toggle a question solved/unsolved ─────────────────── */
function toggleSolved(id) {
  const solved = getSolvedSet();
  if (solved.has(id)) solved.delete(id);
  else                solved.add(id);
  saveSolvedSet(solved);
  updateProgressRing();
  syncRowCheckbox(id, solved.has(id));
}

/* ── Update a single row's checkbox without re-rendering ── */
function syncRowCheckbox(id, isSolved) {
  const btn = document.querySelector(`.check-btn[data-id="${id}"]`);
  const row = btn && btn.closest("tr");
  if (btn) {
    btn.classList.toggle("checked", isSolved);
    btn.textContent = isSolved ? "✓" : "";
  }
  if (row) row.classList.toggle("solved", isSolved);
}

/* ── Build difficulty totals once data is loaded ────────── */
function getDifficultyTotals() {
  const totals = { Easy:0, Medium:0, Hard:0 };
  Object.values(allQuestions).forEach(q => {
    if (totals[q.difficulty] !== undefined) totals[q.difficulty]++;
  });
  return totals;
}

function getDifficultySolved(solved) {
  const counts = { Easy:0, Medium:0, Hard:0 };
  solved.forEach(id => {
    const q = allQuestions[id];
    if (q && counts[q.difficulty] !== undefined) counts[q.difficulty]++;
  });
  return counts;
}

/* ── Render / update the progress ring ─────────────────── */
function updateProgressRing() {
  const solved  = getSolvedSet();
  const totals  = getDifficultyTotals();
  const sCounts = getDifficultySolved(solved);
  const total   = totals.Easy + totals.Medium + totals.Hard;
  const totalSolved = sCounts.Easy + sCounts.Medium + sCounts.Hard;

  // Center text
  document.getElementById("ringSolvedCount").textContent = totalSolved;
  document.getElementById("ringTotalCount").textContent  = `/ ${total}`;

  // Stat labels
  document.getElementById("easyCount").textContent   = `${sCounts.Easy}/${totals.Easy}`;
  document.getElementById("mediumCount").textContent = `${sCounts.Medium}/${totals.Medium}`;
  document.getElementById("hardCount").textContent   = `${sCounts.Hard}/${totals.Hard}`;

  if (total === 0) return;

  // Three-arc segmented ring:
  // Each difficulty gets a slice of the circumference proportional to its count.
  // Within that slice, the filled (solved) portion is colored; rest is transparent.

  const easySlice   = (totals.Easy   / total) * CIRC;
  const medSlice    = (totals.Medium / total) * CIRC;
  const hardSlice   = (totals.Hard   / total) * CIRC;

  const easyFill    = (totals.Easy   > 0 ? sCounts.Easy   / totals.Easy   : 0) * easySlice;
  const medFill     = (totals.Medium > 0 ? sCounts.Medium / totals.Medium : 0) * medSlice;
  const hardFill    = (totals.Hard   > 0 ? sCounts.Hard   / totals.Hard   : 0) * hardSlice;

  // Easy arc: starts at 0 (top after -90 rotation applied via CSS)
  setArc("easyArc",   easyFill,  easySlice,  0);
  setArc("medArc",    medFill,   medSlice,   easySlice);
  setArc("hardArc",   hardFill,  hardSlice,  easySlice + medSlice);
}

function setArc(id, fill, sliceTotal, offsetAngle) {
  const el = document.getElementById(id);
  if (!el) return;
  const gap = 3; // small gap between segments
  const effectiveSlice = Math.max(0, sliceTotal - gap);
  const effectiveFill  = Math.min(fill, effectiveSlice);

  // dasharray: fill then gap to end of slice, then rest transparent
  el.setAttribute("stroke-dasharray",  `${effectiveFill} ${CIRC - effectiveFill}`);
  el.setAttribute("stroke-dashoffset", CIRC - offsetAngle);
}

/* ── Init: called after data loads ────────────────────────── */
function initProgress() {
  updateProgressRing();
}
