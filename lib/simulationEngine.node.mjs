function lineupRatingFactor(players, starterIds) {
  const starters = starterIds.map((id) => players.find((player) => player.id === id)).filter(Boolean);
  const avg = (role) => {
    const list = starters.filter((player) => player.role === role);
    const fallback = starters.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, starters.length);
    return list.length ? list.reduce((sum, player) => sum + player.rating, 0) / list.length : fallback;
  };
  return Math.max(0.72, Math.min(1.28, (avg("GK") * 0.15 + avg("DEF") * 0.3 + avg("MID") * 0.3 + avg("ATT") * 0.25) / 78));
}

function calculateXg(attackingStats, defendingStats, attackers, starterIds) {
  const factor = lineupRatingFactor(attackers, starterIds);
  const opponentWeakness = Math.max(0.55, 2.05 - defendingStats.baseDefense);
  const eloBoost = Math.max(0.82, Math.min(1.18, 1 + (attackingStats.elo - defendingStats.elo) / 2400));
  return attackingStats.baseAttack * opponentWeakness * factor * eloBoost;
}

export function simulateFullMatch({ match, homeSquad, awaySquad, homeStats, awayStats }) {
  const score = { home: 0, away: 0 };
  const homeXg = calculateXg(homeStats, awayStats, homeSquad.players, homeSquad.starters);
  const awayXg = calculateXg(awayStats, homeStats, awaySquad.players, awaySquad.starters);
  for (let minute = 1; minute <= 90; minute += 1) {
    if (Math.random() < homeXg / 90) score.home += 1;
    if (Math.random() < awayXg / 90) score.away += 1;
  }
  return { matchId: match.id, score };
}
