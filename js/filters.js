// ─── FILTERS MODULE ──────────────────────────────────────────

const activeFilters = {
  search: "", difficulty: "all", timeWindow: "all",
  company: "all", pattern: "all"
};

let activeSort        = "freq";
let filteredQuestions = [];
let currentPage       = 1;
const PAGE_SIZE       = 50;

function applyFilters() {
  const { search, difficulty, timeWindow, company, pattern } = activeFilters;
  const s = search.toLowerCase();

  filteredQuestions = Object.values(allQuestions).filter(q => {
    if (difficulty !== "all" && q.difficulty !== difficulty) return false;
    if (company !== "all") {
      const tw = q.companies[company];
      if (!tw) return false;
      if (timeWindow !== "all" && tw[timeWindow] === undefined) return false;
    }
    if (timeWindow !== "all" && !getCompaniesForWindow(q, timeWindow).length) return false;
    if (pattern !== "all" && normalizePattern(getPattern(q.id)) !== pattern) return false;
    if (s) {
      const clean = s.replace(/^#/, "");
      if (!q.title.toLowerCase().includes(s) && !String(q.id).startsWith(clean)) return false;
    }
    return true;
  });

  filteredQuestions.sort((a, b) => {
    switch (activeSort) {
      case "freq":      return getMaxFreq(b, activeFilters.timeWindow) - getMaxFreq(a, activeFilters.timeWindow);
      case "id":        return a.id - b.id;
      case "title":     return a.title.localeCompare(b.title);
      case "companies": return getCompaniesForWindow(b, activeFilters.timeWindow).length
                             - getCompaniesForWindow(a, activeFilters.timeWindow).length;
      default: return 0;
    }
  });

  currentPage = 1;
}

function getCurrentPageItems() {
  const start = (currentPage - 1) * PAGE_SIZE;
  return filteredQuestions.slice(start, start + PAGE_SIZE);
}

function getTotalPages() { return Math.ceil(filteredQuestions.length / PAGE_SIZE); }

function setPage(p) {
  currentPage = Math.max(1, Math.min(p, getTotalPages()));
}

function buildPatternCounts() {
  const counts = {};
  Object.values(allQuestions).forEach(q => {
    const p = normalizePattern(getPattern(q.id));
    counts[p] = (counts[p] || 0) + 1;
  });
  return counts;
}
