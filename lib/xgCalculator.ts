import type { Player, TeamStats } from "./types";

const ROLE_WEIGHTS = {
  GK: 0.15,
  DEF: 0.3,
  MID: 0.3,
  ATT: 0.25
};

export function lineupRatingFactor(players: Player[], starterIds: string[]) {
  const starters = starterIds.map((id) => players.find((player) => player.id === id)).filter(Boolean) as Player[];
  const byRole = {
    GK: starters.filter((player) => player.role === "GK"),
    DEF: starters.filter((player) => player.role === "DEF"),
    MID: starters.filter((player) => player.role === "MID"),
    ATT: starters.filter((player) => player.role === "ATT")
  };
  const roleAverage = (role: keyof typeof byRole) => {
    const list = byRole[role];
    const fallback = starters.length ? starters.reduce((sum, player) => sum + player.rating, 0) / starters.length : 68;
    return list.length ? list.reduce((sum, player) => sum + player.rating, 0) / list.length : fallback;
  };
  const weighted =
    roleAverage("GK") * ROLE_WEIGHTS.GK +
    roleAverage("DEF") * ROLE_WEIGHTS.DEF +
    roleAverage("MID") * ROLE_WEIGHTS.MID +
    roleAverage("ATT") * ROLE_WEIGHTS.ATT;
  return Math.max(0.72, Math.min(1.28, weighted / 78));
}

export function calculateXg(params: {
  attackingStats: TeamStats;
  defendingStats: TeamStats;
  attackers: Player[];
  starterIds: string[];
  redCardPenalty?: number;
}) {
  const factor = lineupRatingFactor(params.attackers, params.starterIds);
  const opponentWeakness = Math.max(0.55, 2.05 - params.defendingStats.baseDefense);
  const eloBoost = Math.max(0.82, Math.min(1.18, 1 + (params.attackingStats.elo - params.defendingStats.elo) / 2400));
  const formBoost = 0.92 + params.attackingStats.form * 0.16;
  const redCardPenalty = params.redCardPenalty ?? 1;
  return Number((params.attackingStats.baseAttack * opponentWeakness * factor * eloBoost * formBoost * redCardPenalty).toFixed(3));
}
