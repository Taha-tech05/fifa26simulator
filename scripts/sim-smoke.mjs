import { simulateFullMatch } from "../lib/simulationEngine.node.mjs";
import fs from "node:fs";

const fixtures = JSON.parse(fs.readFileSync("data/fixtures.json", "utf8"));
const squads = JSON.parse(fs.readFileSync("data/squads.json", "utf8"));
const stats = JSON.parse(fs.readFileSync("data/team_stats.json", "utf8"));

const match = fixtures.matches.find((item) => item.home === "Brazil" && item.away === "Morocco") || fixtures.matches[0];
const runs = Array.from({ length: 100 }, () =>
  simulateFullMatch({
    match,
    homeSquad: squads[match.home],
    awaySquad: squads[match.away],
    homeStats: stats[match.home],
    awayStats: stats[match.away]
  })
);

const avgHome = runs.reduce((sum, run) => sum + run.score.home, 0) / runs.length;
const avgAway = runs.reduce((sum, run) => sum + run.score.away, 0) / runs.length;
console.log(`${match.home} vs ${match.away}: ${runs.length} runs, avg ${avgHome.toFixed(2)}-${avgAway.toFixed(2)}`);
