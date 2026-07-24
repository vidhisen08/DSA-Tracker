# DSA Tracker ⚡

Fast, filterable LeetCode company-wise question tracker with progress tracking.

**Data:** [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)

---

## Features
- ⚡ Instant loading via pre-built `data.json` (single file, not 657 CSVs)
- 🔍 Search by title or #number
- 🏢 See all companies that asked each question
- 🎯 Filter by difficulty, time window, company, DSA pattern
- ✅ Checkbox to mark questions solved — persists across sessions
- 📊 LeetCode-style progress ring (Easy / Medium / Hard)
- 📄 Sort by frequency, ID, title, or company count

---

## 🚀 Setup (do this once)

### Step 1 — Generate data.json
```bash
node generate-data.js
```
This fetches all CSVs from the source repo and merges them into one file.
Takes ~2–3 minutes once. After this, the app loads in under 2 seconds.

### Step 2 — Deploy to GitHub Pages
1. Create a new GitHub repo (e.g. `dsa-tracker`)
2. Push all files including `data.json`
3. Go to **Settings → Pages → Source → main / root**
4. Live at `https://your-username.github.io/dsa-tracker/`

---

## 🤖 Auto-updates (GitHub Actions)

The workflow in `.github/workflows/update-data.yml` automatically:
- Runs `generate-data.js` on the **1st of every month**
- Commits the fresh `data.json` to your repo
- You never have to manually rerun anything

You can also trigger it manually: **Actions tab → Update DSA Data → Run workflow**

---

## Project Structure
```
dsa-tracker/
├── index.html
├── generate-data.js          ← run once to build data.json
├── data.json                 ← generated; commit this
├── css/style.css
├── js/
│   ├── patterns.js
│   ├── data.js
│   ├── progress.js
│   ├── filters.js
│   ├── render.js
│   └── app.js
└── .github/workflows/
    └── update-data.yml       ← auto-updates monthly
```
