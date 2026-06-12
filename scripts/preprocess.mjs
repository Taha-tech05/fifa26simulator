import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });

const aliases = {
  "United States": "USA",
  "South Korea": "Korea Republic",
  "Czech Republic": "Czechia",
  "Ivory Coast": "Cote d'Ivoire",
  "DR Congo": "Congo DR",
  "Bosnia and Herzegovina": "Bosnia",
  "Curaçao": "Curacao",
  "CuraÃ§ao": "Curacao"
};

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((h, i) => [h, record[i] ?? ""])));
}

function normalTeam(team) {
  return team.replace(" (H)", "").replace("CuraÃ§ao", "Curaçao");
}

function ratingNumber(value, fallback = 68) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function groupPosition(pos) {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB", "DF"].includes(pos)) return "DEF";
  if (["CM", "CDM", "CAM", "LM", "RM", "MF"].includes(pos)) return "MID";
  return "ATT";
}

function pickRatingByRole(player, role) {
  if (role === "GK") return ratingNumber(player.Overall, 68);
  if (role === "DEF") {
    return Math.round((ratingNumber(player.Defending) * 0.55) + (ratingNumber(player.Physicality) * 0.2) + (ratingNumber(player.Overall) * 0.25));
  }
  if (role === "MID") {
    return Math.round((ratingNumber(player.Passing) * 0.35) + (ratingNumber(player.Dribbling) * 0.25) + (ratingNumber(player.Overall) * 0.4));
  }
  return Math.round((ratingNumber(player.Shooting) * 0.4) + (ratingNumber(player.Pace) * 0.2) + (ratingNumber(player.Overall) * 0.4));
}

const fcRows = parseCsv(fs.readFileSync(path.join(root, "ea_sports_fc25_full.csv"), "utf8"));
const eloRows = parseCsv(fs.readFileSync(path.join(root, "eloratings.csv"), "utf8"));
const resultsRows = parseCsv(fs.readFileSync(path.join(root, "results.csv"), "utf8"));
const localSquads = JSON.parse(fs.readFileSync(path.join(root, "squads.json"), "utf8"));
const wikipediaSquadsPath = path.join(dataDir, "wikipedia_squads.json");
const wikipediaSquads = fs.existsSync(wikipediaSquadsPath)
  ? JSON.parse(fs.readFileSync(wikipediaSquadsPath, "utf8"))
  : {};
const sourceSquads = { ...localSquads, ...wikipediaSquads };
const fixtureSource = JSON.parse(fs.readFileSync(path.join(root, "world_cup_2026.json"), "utf8"));

const fixtureTeams = [...new Set(fixtureSource.groups.flatMap((group) => group.teams.map(normalTeam)))].sort();
const playersByNation = new Map();
for (const row of fcRows) {
  const nation = row.Nationality;
  if (!playersByNation.has(nation)) playersByNation.set(nation, []);
  playersByNation.get(nation).push(row);
}
for (const list of playersByNation.values()) {
  list.sort((a, b) => ratingNumber(b.Overall) - ratingNumber(a.Overall));
}

const latestElo = {};
for (const row of eloRows) {
  latestElo[row.team] = ratingNumber(row.rating, 1500);
}

const recentResults = resultsRows
  .filter((row) => Number(row.date.slice(0, 4)) >= 2016)
  .filter((row) => fixtureTeams.includes(row.home_team) || fixtureTeams.includes(row.away_team));

function buildFixtureList() {
  const groupMatches = fixtureSource.groups.flatMap((group) =>
    group.fixtures.map((fixture) => ({
      id: fixture.match,
      phase: "Group Stage",
      group: group.group,
      date: fixture.date,
      timeUtc: fixture.time_utc ?? null,
      home: fixture.home,
      away: fixture.away,
      venue: fixture.venue,
      status: "upcoming"
    }))
  );
  const knockoutMatches = Object.entries(fixtureSource.knockout_stage).flatMap(([phase, matches]) =>
    matches.map((fixture) => ({
      id: fixture.match,
      phase: phase.replaceAll("_", " "),
      group: null,
      date: fixture.date,
      timeUtc: null,
      home: fixture.home,
      away: fixture.away,
      venue: fixture.venue,
      status: "locked"
    }))
  );
  return [...groupMatches, ...knockoutMatches].sort((a, b) => a.id - b.id);
}

function syntheticPlayers(team) {
  const source = playersByNation.get(team) || playersByNation.get(aliases[team]) || [];
  return source.slice(0, 26).map((row, index) => ({
    id: `${team}-${index + 1}`,
    number: index + 1,
    name: row.Name,
    shirt: row.Name.split(" ").slice(-1)[0].toUpperCase(),
    pos: row.Position,
    role: groupPosition(row.Position),
    club: row.Club,
    rating: ratingNumber(row.Overall),
    pace: ratingNumber(row.Pace),
    shooting: ratingNumber(row.Shooting),
    passing: ratingNumber(row.Passing),
    defending: ratingNumber(row.Defending),
    physicality: ratingNumber(row.Physicality)
  }));
}

function placeholderPlayers(team) {
  const shape = [
    ["GK", "GK", 66], ["RB", "DEF", 65], ["CB", "DEF", 67], ["CB", "DEF", 66], ["LB", "DEF", 65],
    ["CDM", "MID", 66], ["CM", "MID", 67], ["CM", "MID", 66], ["RW", "ATT", 66], ["ST", "ATT", 68], ["LW", "ATT", 66],
    ["GK", "GK", 63], ["CB", "DEF", 64], ["FB", "DEF", 63], ["CM", "MID", 64], ["CAM", "MID", 65],
    ["W", "ATT", 64], ["ST", "ATT", 65], ["DF", "DEF", 62], ["MF", "MID", 62], ["FW", "ATT", 63]
  ];
  return shape.map(([pos, role, rating], index) => ({
    id: `${team}-placeholder-${index + 1}`,
    number: index + 1,
    name: `${team} Player ${index + 1}`,
    shirt: `PLAYER ${index + 1}`,
    pos,
    role,
    club: "Roster data missing",
    rating,
    pace: rating,
    shooting: role === "ATT" ? rating : rating - 4,
    passing: role === "MID" ? rating : rating - 2,
    defending: role === "DEF" ? rating : rating - 6,
    physicality: rating
  }));
}

function curatePlayers(team) {
  const sourceTeam = sourceSquads[team] ? team : aliases[team];
  const manual = sourceSquads[sourceTeam]?.players ?? [];
  const ea = playersByNation.get(team) || playersByNation.get(aliases[team]) || [];
  return manual.map((player, index) => {
    const byName = ea.find((candidate) => candidate.Name.toLowerCase() === player.name.toLowerCase());
    const byPosition = ea.find((candidate) => groupPosition(candidate.Position) === groupPosition(player.pos));
    const row = byName || byPosition;
    const role = groupPosition(player.pos);
    return {
      id: `${team}-${player.number ?? index + 1}`,
      number: player.number ?? index + 1,
      name: player.name,
      shirt: player.shirt ?? player.name.split(" ").slice(-1)[0].toUpperCase(),
      pos: player.pos,
      role,
      club: player.club,
      rating: row ? pickRatingByRole(row, role) : 68,
      pace: row ? ratingNumber(row.Pace) : 68,
      shooting: row ? ratingNumber(row.Shooting) : 62,
      passing: row ? ratingNumber(row.Passing) : 65,
      defending: row ? ratingNumber(row.Defending) : 62,
      physicality: row ? ratingNumber(row.Physicality) : 68
    };
  });
}

function starterIds(players) {
  const groups = {
    GK: players.filter((p) => p.role === "GK").sort((a, b) => b.rating - a.rating),
    DEF: players.filter((p) => p.role === "DEF").sort((a, b) => b.rating - a.rating),
    MID: players.filter((p) => p.role === "MID").sort((a, b) => b.rating - a.rating),
    ATT: players.filter((p) => p.role === "ATT").sort((a, b) => b.rating - a.rating)
  };
  const selected = [
    ...groups.GK.slice(0, 1),
    ...groups.DEF.slice(0, 4),
    ...groups.MID.slice(0, 3),
    ...groups.ATT.slice(0, 3)
  ];
  const selectedIds = new Set(selected.map((p) => p.id));
  if (selected.length < 11) {
    players
      .filter((p) => !selectedIds.has(p.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 11 - selected.length)
      .forEach((p) => selected.push(p));
  }
  return selected.slice(0, 11).map((p) => p.id);
}

function teamStats(team, players) {
  const attack = average(players.filter((p) => p.role === "ATT").slice(0, 6).map((p) => p.rating), 68);
  const midfield = average(players.filter((p) => p.role === "MID").slice(0, 8).map((p) => p.rating), 68);
  const defense = average(players.filter((p) => p.role === "DEF" || p.role === "GK").slice(0, 8).map((p) => p.rating), 68);
  const elo = latestElo[team] || latestElo[aliases[team]] || 1500;
  return {
    team,
    code: sourceSquads[team]?.code || sourceSquads[aliases[team]]?.code || team.slice(0, 3).toUpperCase(),
    elo,
    attack: Math.round(attack),
    midfield: Math.round(midfield),
    defense: Math.round(defense),
    baseAttack: Number((0.75 + (attack - 60) / 35).toFixed(3)),
    baseDefense: Number((0.75 + (defense - 60) / 35).toFixed(3)),
    form: recentForm(team)
  };
}

function recentForm(team) {
  const rows = recentResults.filter((row) => row.home_team === team || row.away_team === team).slice(-20);
  if (!rows.length) return 0.5;
  let points = 0;
  for (const row of rows) {
    const home = row.home_team === team;
    const gf = Number(home ? row.home_score : row.away_score);
    const ga = Number(home ? row.away_score : row.home_score);
    points += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
  return Number((points / (rows.length * 3)).toFixed(3));
}

function average(values, fallback) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

const squads = {};
const teamStatsMap = {};
const coverage = [];
for (const team of fixtureTeams) {
  const hasManual = Boolean(sourceSquads[team] || sourceSquads[aliases[team]]);
  let players = hasManual ? curatePlayers(team) : syntheticPlayers(team);
  if (players.length < 18) {
    const filler = syntheticPlayers(team).filter((player) => !players.some((p) => p.name === player.name));
    players = [...players, ...filler].slice(0, 26);
  }
  if (players.length < 18) {
    players = placeholderPlayers(team);
  }
  players = players.slice(0, 26);
  squads[team] = {
    team,
    code: sourceSquads[team]?.code || sourceSquads[aliases[team]]?.code || team.slice(0, 3).toUpperCase(),
    coach: sourceSquads[team]?.coach || sourceSquads[aliases[team]]?.coach || "TBD",
    dataQuality: hasManual ? "provided" : syntheticPlayers(team).length ? "ratings-derived" : "missing",
    formation: "4-3-3",
    starters: starterIds(players),
    players
  };
  coverage.push({ team, dataQuality: squads[team].dataQuality, playerCount: players.length });
  teamStatsMap[team] = teamStats(team, players);
}

const fixtures = {
  tournament: fixtureSource.tournament,
  groups: fixtureSource.groups.map((group) => ({
    group: group.group,
    teams: group.teams.map(normalTeam)
  })),
  matches: buildFixtureList()
};

fs.writeFileSync(path.join(dataDir, "fixtures.json"), JSON.stringify(fixtures, null, 2));
fs.writeFileSync(path.join(dataDir, "squads.json"), JSON.stringify(squads, null, 2));
fs.writeFileSync(path.join(dataDir, "team_stats.json"), JSON.stringify(teamStatsMap, null, 2));
fs.writeFileSync(path.join(dataDir, "coverage.json"), JSON.stringify(coverage, null, 2));

const missing = coverage.filter((row) => row.dataQuality === "missing");
console.log(`Generated ${fixtureTeams.length} teams, ${fixtures.matches.length} fixtures.`);
if (missing.length) {
  console.log(`Missing playable rosters: ${missing.map((row) => row.team).join(", ")}`);
}
