#!/usr/bin/env node
/**
 * generate-data.js
 * ─────────────────
 * Run once:   node generate-data.js
 * Then commit data.json to your repo.
 *
 * GitHub Actions runs this automatically every month.
 * Uses GITHUB_TOKEN env var if available (removes API rate limits).
 */

const fs    = require("fs");
const https = require("https");

const REPO        = "snehasishroy/leetcode-companywise-interview-questions";
const BASE_RAW    = `https://raw.githubusercontent.com/${REPO}/master`;
const GITHUB_API  = `https://api.github.com/repos/${REPO}/contents`;
const TIME_WINDOWS = {
  "all":                  "all.csv",
  "six-months":           "six-months.csv",
  "three-months":         "three-months.csv",
  "thirty-days":          "thirty-days.csv",
  "more-than-six-months": "more-than-six-months.csv"
};
const CONCURRENCY = 8;   // parallel company fetches

/* ── HTTP helper ────────────────────────────────────────── */
function get(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        "User-Agent": "dsa-tracker-generator/1.0",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          : {})
      }
    };
    https.get(url, opts, res => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return get(res.headers.location).then(resolve).catch(reject);
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

/* ── CSV parser ─────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  });
}

/* ── Process one company ────────────────────────────────── */
async function processCompany(company, questions) {
  for (const [tw, filename] of Object.entries(TIME_WINDOWS)) {
    try {
      const res = await get(`${BASE_RAW}/${company}/${filename}`);
      if (res.status !== 200) continue;
      parseCSV(res.body).forEach(row => {
        const id = parseInt(row["ID"]);
        if (!id || !row["Title"]) return;
        if (!questions[id]) {
          questions[id] = {
            id,
            title:      row["Title"],
            url:        row["URL"] || `https://leetcode.com/problems/${row["Title"].toLowerCase().replace(/\s+/g,"-")}`,
            difficulty: row["Difficulty"] || "Unknown",
            acceptance: parseFloat(row["Acceptance %"]) || 0,
            companies:  {}
          };
        }
        if (!questions[id].companies[company])
          questions[id].companies[company] = {};
        questions[id].companies[company][tw] = parseFloat(row["Frequency %"]) || 0;
      });
    } catch (_) {}
  }
}

/* ── Main ───────────────────────────────────────────────── */
async function main() {
  console.log("🚀 DSA Tracker — Data Generator");
  console.log("─".repeat(40));

  // 1. Get company list
  console.log("📋 Fetching company list…");
  const apiRes   = await get(GITHUB_API);
  const contents = JSON.parse(apiRes.body);
  const companies = contents.filter(f => f.type === "dir").map(f => f.name).sort();
  console.log(`   Found ${companies.length} companies\n`);

  const questions = {};
  let processed   = 0;

  // 2. Process in batches
  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(c => processCompany(c, questions)));
    processed += batch.length;
    const pct = Math.round((processed / companies.length) * 100);
    const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20 - Math.floor(pct/5));
    process.stdout.write(`\r   [${bar}] ${pct}% (${processed}/${companies.length})`);
  }

  console.log("\n");
  const totalQ = Object.keys(questions).length;
  console.log(`✅ Collected ${totalQ} unique questions`);

  // 3. Write output
  const output = {
    generated: new Date().toISOString().split("T")[0],
    companies,
    questions
  };

  const outPath = "data.json";
  fs.writeFileSync(outPath, JSON.stringify(output));
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`💾 Saved ${outPath} (${sizeMB} MB)`);
  console.log("─".repeat(40));
  console.log("✨ Done! Commit data.json to your repo.");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
