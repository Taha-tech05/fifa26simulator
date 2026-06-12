import fs from "node:fs";
import path from "node:path";
import htmlParser from "../node_modules/next/dist/compiled/node-html-parser/index.js";

const { parse } = htmlParser;

const URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads";
const rootDir = process.cwd();
const outputPath = path.join(rootDir, "data", "wikipedia_squads.json");

function clean(text) {
  const normalized = text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/[ÃÄÅÂ]/.test(normalized)) {
    return Buffer.from(normalized, "latin1").toString("utf8");
  }
  return normalized;
}

function normalizePosition(pos) {
  const cleaned = clean(pos).replace(/^\d+/, "");
  if (cleaned === "GK") return "GK";
  if (cleaned === "DF") return "DF";
  if (cleaned === "MF") return "MF";
  if (cleaned === "FW") return "FW";
  return cleaned || "MF";
}

function shirtName(name) {
  return clean(name)
    .replace(/\(captain\)/i, "")
    .split(" ")
    .slice(-1)[0]
    .toUpperCase();
}

function parseBirthDate(value) {
  const iso = value.match(/\((\d{4}-\d{2}-\d{2})\)/);
  if (!iso) return "";
  const [year, month, day] = iso[1].split("-");
  return `${day}/${month}/${year}`;
}

function parseCoach(wrapper) {
  let node = wrapper.nextElementSibling;
  while (node && node.tagName !== "TABLE") {
    const text = clean(node.innerText || "");
    if (text.startsWith("Coach:")) {
      return text.replace(/^Coach:\s*/, "");
    }
    node = node.nextElementSibling;
  }
  return "TBD";
}

function parseTeamTable(wrapper, team) {
  let node = wrapper.nextElementSibling;
  while (node && node.tagName !== "TABLE") {
    node = node.nextElementSibling;
  }
  if (!node) return [];

  return node.querySelectorAll("tr").slice(1).map((row) => {
    const cells = row.querySelectorAll("th,td").map((cell) => clean(cell.innerText || ""));
    if (cells.length < 7) return null;
    const [number, pos, name, dob, caps, goals, club] = cells;
    return {
      number: Number(number) || 0,
      pos: normalizePosition(pos),
      name: clean(name).replace(/\s*\(captain\)\s*/i, ""),
      shirt: shirtName(name),
      dob: parseBirthDate(dob),
      club,
      height: null,
      caps: Number(caps) || 0,
      goals: Number(goals) || 0
    };
  }).filter(Boolean);
}

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const response = await fetch(URL, {
    headers: {
      "user-agent": "fifa26simulator squad extractor (local development)"
    }
  });
  if (!response.ok) {
    throw new Error(`Wikipedia request failed: ${response.status}`);
  }

  const html = await response.text();
  const document = parse(html);
  const squads = {};
  const wrappers = document.querySelectorAll("div.mw-heading3");

  for (const wrapper of wrappers) {
    const team = clean(wrapper.innerText || "");
    if (!team || team === "Players" || team === "Outfield players" || team === "Goalkeepers" || team === "Captains") {
      continue;
    }
    const players = parseTeamTable(wrapper, team);
    if (players.length < 20) continue;
    squads[team] = {
      code: team.slice(0, 3).toUpperCase(),
      coach: parseCoach(wrapper),
      source: URL,
      players
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(squads, null, 2), "utf8");
  const teams = Object.keys(squads).sort();
  console.log(`Extracted ${teams.length} squads from Wikipedia.`);
  const incomplete = teams.filter((team) => squads[team].players.length < 23);
  if (incomplete.length) {
    console.log(`Incomplete squads: ${incomplete.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
