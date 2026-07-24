// ─── DATA MODULE ─────────────────────────────────────────────

const REPO       = "snehasishroy/leetcode-companywise-interview-questions";
const BASE_RAW   = `https://raw.githubusercontent.com/${REPO}/master`;
const GITHUB_API = `https://api.github.com/repos/${REPO}/contents`;

const TIME_WINDOW_FILES = {
  "all":                  "all.csv",
  "six-months":           "six-months.csv",
  "three-months":         "three-months.csv",
  "thirty-days":          "thirty-days.csv",
  "more-than-six-months": "more-than-six-months.csv"
};

const allQuestions = {};
let   companiesList = [];
let   dataMode      = "json";
const fetchCache    = new Set();

/* ── CSV parser ─────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  });
}

function mergeRow(row, company, timeWindow) {
  const id = parseInt(row["ID"]);
  if (!id || !row["Title"]) return;
  if (!allQuestions[id]) {
    allQuestions[id] = {
      id,
      title:      row["Title"],
      url:        row["URL"] || `https://leetcode.com/problems/${row["Title"].toLowerCase().replace(/\s+/g,"-")}`,
      difficulty: row["Difficulty"] || "Unknown",
      acceptance: parseFloat(row["Acceptance %"]) || 0,
      companies:  {}
    };
  }
  if (!allQuestions[id].companies[company])
    allQuestions[id].companies[company] = {};
  allQuestions[id].companies[company][timeWindow] = parseFloat(row["Frequency %"]) || 0;
}

/* ── PRIMARY: single data.json fetch ───────────────────── */
async function loadFromJSON(progressCallback) {
  if (progressCallback) progressCallback(5, "Loading data.json…");

  // Try both relative paths in case of subfolder serving
  let res = null;
  for (const path of ["data.json", "./data.json", "../data.json"]) {
    try {
      const r = await fetch(path);
      if (r.ok) { res = r; break; }
    } catch (_) {}
  }

  if (!res) throw new Error("data.json not accessible");

  if (progressCallback) progressCallback(40, "Parsing data…");
  const json = await res.json();

  if (!json.questions || !json.companies)
    throw new Error("data.json format invalid");

  companiesList = json.companies;
  Object.values(json.questions).forEach(q => { allQuestions[q.id] = q; });
  if (progressCallback) progressCallback(100, "Ready!");
  dataMode = "json";
  console.log(`✅ Loaded from data.json: ${Object.keys(allQuestions).length} questions`);
}

/* ── FALLBACK: parallel CSV fetching ───────────────────── */
async function fetchCompanyCSV(company, timeWindow) {
  const key = `${company}::${timeWindow}`;
  if (fetchCache.has(key)) return;
  try {
    const res = await fetch(`${BASE_RAW}/${company}/${TIME_WINDOW_FILES[timeWindow]}`);
    if (!res.ok) return;
    parseCSV(await res.text()).forEach(row => mergeRow(row, company, timeWindow));
    fetchCache.add(key);
  } catch (_) {}
}

async function loadFromCSV(progressCallback) {
  dataMode = "csv";
  console.warn("⚠️ data.json not found — falling back to CSV fetching (slower)");

  const res  = await fetch(GITHUB_API);
  const list = await res.json();
  companiesList = list.filter(f => f.type === "dir").map(f => f.name).sort();

  const total   = companiesList.length;
  const BATCH   = 20;   // fetch 20 companies in parallel
  let   done    = 0;

  for (let i = 0; i < total; i += BATCH) {
    const batch = companiesList.slice(i, i + BATCH);
    await Promise.all(batch.map(c => fetchCompanyCSV(c, "all")));
    done += batch.length;
    if (progressCallback)
      progressCallback(
        Math.round((done / total) * 100),
        `Loading companies… (${done}/${total})`
      );
  }
}

/* ── PUBLIC entry ───────────────────────────────────────── */
async function loadData(progressCallback) {
  try {
    await loadFromJSON(progressCallback);
  } catch (err) {
    console.error("data.json failed:", err.message, "→ falling back to CSV");
    await loadFromCSV(progressCallback);
  }
  return companiesList;
}

/* ── Time window lazy-load (no-op when using JSON) ──────── */
async function ensureTimeWindowLoaded(timeWindow, progressCallback) {
  if (dataMode === "json") return;
  if (timeWindow === "all") return;

  const unloaded = companiesList.filter(c => !fetchCache.has(`${c}::${timeWindow}`));
  if (!unloaded.length) return;

  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < unloaded.length; i += BATCH) {
    const batch = unloaded.slice(i, i + BATCH);
    await Promise.all(batch.map(c => fetchCompanyCSV(c, timeWindow)));
    done += batch.length;
    if (progressCallback) progressCallback(done, unloaded.length, batch[0]);
  }
}

/* ── Helpers ────────────────────────────────────────────── */
function getMaxFreq(question, timeWindow) {
  let max = 0;
  for (const tw of Object.values(question.companies)) {
    const f = tw[timeWindow];
    if (f !== undefined && f > max) max = f;
  }
  return max;
}

function getCompaniesForWindow(question, timeWindow) {
  return Object.entries(question.companies)
    .filter(([, tw]) => tw[timeWindow] !== undefined)
    .map(([name]) => name)
    .sort();
}
