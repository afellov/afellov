// Regenerates assets/commits.svg from afellov's latest public commits.
// Runs in CI (see .github/workflows/commits.yml). No dependencies.

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "afellov";
const MAX_ROWS = 5;
const CARD_W = 820;
const TOP_BAR = 46;
const HEAD_Y = 78;
const ROW_Y = 118;
const ROW_STEP = 30;

const ORANGE = "#f79649";
const HASH = "#c98a55";
const TEXT = "#e8d6c2";
const DIM = "#93a6c2";
const TIME = "#7f92ae";
const MONO =
  "SFMono-Regular, ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(scriptDir, "../assets/commits.svg");

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function trim(message, max = 58) {
  const line = message.split("\n")[0].trim();
  return line.length > max ? line.slice(0, max - 1).trimEnd() + "…" : line;
}

function timeAgo(date) {
  const sec = Math.max(1, (Date.now() - date.getTime()) / 1000);
  const min = sec / 60;
  const hour = min / 60;
  const day = hour / 24;
  if (min < 60) return `${Math.max(1, Math.round(min))}m ago`;
  if (hour < 24) return `${Math.round(hour)}h ago`;
  if (day < 7) return `${Math.round(day)}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

async function latestCommits() {
  const res = await fetch(
    `https://api.github.com/search/commits?q=author:${USER}&sort=author-date&order=desc&per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": `${USER}-profile-readme`,
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  // Skip the profile repo itself and near-identical "Update README" spam,
  // so the card shows actual project work.
  const seen = new Set();
  const commits = [];

  for (const item of items) {
    if (item.repository?.full_name === `${USER}/${USER}`) continue;

    const message = item.commit.message.split("\n")[0].trim();
    const key = message.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    commits.push({
      sha: String(item.sha).slice(0, 7),
      message: trim(message),
      ago: timeAgo(new Date(item.commit.author.date)),
    });

    if (commits.length === MAX_ROWS) break;
  }

  if (commits.length === 0) throw new Error("No commits returned");
  return commits;
}

function render(commits) {
  const height = ROW_Y + ROW_STEP * (commits.length - 1) + 48;
  const rows = commits
    .map(
      (c, i) => `    <g>
      <text x="30" y="${ROW_Y + i * ROW_STEP}" fill="${ORANGE}">*</text>
      <text x="50" y="${ROW_Y + i * ROW_STEP}" fill="${HASH}">${esc(c.sha)}</text>
      <text x="142" y="${ROW_Y + i * ROW_STEP}" fill="${TEXT}">${esc(c.message)}</text>
      <text x="${CARD_W - 30}" y="${ROW_Y + i * ROW_STEP}" text-anchor="end" font-size="12" fill="${TIME}">${esc(c.ago)}</text>
    </g>`
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${height}" viewBox="0 0 ${CARD_W} ${height}" role="img" aria-labelledby="t">
  <title id="t">afellov — recent commits</title>
  <defs>
    <linearGradient id="border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity=".55"/>
      <stop offset=".5" stop-color="#ea9b58" stop-opacity=".18"/>
      <stop offset="1" stop-color="${ORANGE}" stop-opacity=".45"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0a1830"/>
      <stop offset="1" stop-color="#0c1d38"/>
    </linearGradient>
    <radialGradient id="glow" cx=".1" cy="0" r="1">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity=".10"/>
      <stop offset=".55" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="1" y="1" width="${CARD_W - 2}" height="${height - 2}" rx="14" fill="#0d1f3d" stroke="url(#border)" stroke-width="2"/>
  <rect x="1" y="1" width="${CARD_W - 2}" height="${height - 2}" rx="14" fill="url(#glow)"/>

  <path d="M1 ${TOP_BAR + 1} H${CARD_W - 1}" stroke="${ORANGE}" stroke-opacity=".16"/>
  <path d="M15 1 H${CARD_W - 15} A14 14 0 0 1 ${CARD_W - 1} 15 V${TOP_BAR + 1} H1 V15 A14 14 0 0 1 15 1 Z" fill="url(#bar)" opacity=".8"/>

  <circle cx="26" cy="24" r="4.5" fill="${ORANGE}"/>
  <circle cx="42" cy="24" r="4.5" fill="#c47a3e"/>
  <circle cx="58" cy="24" r="4.5" fill="#7a4a2a"/>

  <text x="${CARD_W / 2}" y="29" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#b78a63" letter-spacing=".6">afel@github: ~/projects</text>
  <text x="${CARD_W - 22}" y="29" text-anchor="end" font-family="${MONO}" font-size="11" fill="#6d7f9c">git</text>

  <g font-family="${MONO}" font-size="14">
    <text x="30" y="${HEAD_Y}" fill="${ORANGE}">$</text>
    <text x="48" y="${HEAD_Y}" fill="${TEXT}">git log --oneline</text>
${rows}
  </g>
</svg>
`;
}

try {
  const commits = await latestCommits();
  await mkdir(dirname(outFile), { recursive: true });
  const tmp = `${outFile}.tmp`;
  await writeFile(tmp, render(commits), "utf8");
  await rename(tmp, outFile);
  console.log(`Wrote ${outFile} (${commits.length} commits)`);
} catch (error) {
  // Keep the previous card instead of shipping a broken one.
  console.error(`commits card not updated: ${error.message}`);
  process.exit(0);
}
