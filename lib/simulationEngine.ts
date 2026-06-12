import { calculateXg } from "./xgCalculator";
import type { Fixture, MatchEvent, MatchResult, Player, Squad, TeamStats } from "./types";

export type SimulationContext = {
  match: Fixture;
  homeSquad: Squad;
  awaySquad: Squad;
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeLineup: string[];
  awayLineup: string[];
  score: { home: number; away: number };
  events: MatchEvent[];
  redCards: { home: number; away: number };
};

export type MinuteOutcome = {
  context: SimulationContext;
  events: MatchEvent[];
  pausedForInjury?: {
    teamSide: "home" | "away";
    team: string;
    player: Player;
    bench: Player[];
    minute: number;
  };
};

function eventId(type: string, minute: number) {
  return `${type}-${minute}-${Math.random().toString(36).slice(2, 8)}`;
}

function chance(probability: number) {
  return Math.random() < probability;
}

function pickWeighted(players: Player[], weight: (player: Player) => number) {
  const weighted = players.map((player) => ({ player, weight: Math.max(1, weight(player)) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.player;
  }
  return weighted[0]?.player ?? players[0];
}

export function createMatchContext(params: {
  match: Fixture;
  homeSquad: Squad;
  awaySquad: Squad;
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeLineup?: string[];
  awayLineup?: string[];
}): SimulationContext {
  return {
    match: params.match,
    homeSquad: params.homeSquad,
    awaySquad: params.awaySquad,
    homeStats: params.homeStats,
    awayStats: params.awayStats,
    homeLineup: params.homeLineup ?? params.homeSquad.starters,
    awayLineup: params.awayLineup ?? params.awaySquad.starters,
    score: { home: 0, away: 0 },
    events: [],
    redCards: { home: 0, away: 0 }
  };
}

export function currentXg(context: SimulationContext) {
  return {
    home: calculateXg({
      attackingStats: context.homeStats,
      defendingStats: context.awayStats,
      attackers: context.homeSquad.players,
      starterIds: context.homeLineup,
      redCardPenalty: Math.max(0.62, 1 - context.redCards.home * 0.16)
    }),
    away: calculateXg({
      attackingStats: context.awayStats,
      defendingStats: context.homeStats,
      attackers: context.awaySquad.players,
      starterIds: context.awayLineup,
      redCardPenalty: Math.max(0.62, 1 - context.redCards.away * 0.16)
    })
  };
}

export function simulateMinute(context: SimulationContext, minute: number): MinuteOutcome {
  const next: SimulationContext = {
    ...context,
    score: { ...context.score },
    redCards: { ...context.redCards },
    events: [...context.events]
  };
  const minuteEvents: MatchEvent[] = [];
  const xg = currentXg(context);

  const runTeam = (side: "home" | "away") => {
    const squad = side === "home" ? context.homeSquad : context.awaySquad;
    const lineupIds = side === "home" ? context.homeLineup : context.awayLineup;
    const starters = lineupIds.map((id) => squad.players.find((player) => player.id === id)).filter(Boolean) as Player[];
    const teamName = side === "home" ? context.match.home : context.match.away;
    const goalProbability = (side === "home" ? xg.home : xg.away) / 90;
    if (chance(goalProbability)) {
      const scorer = pickWeighted(starters, (player) => player.role === "ATT" ? player.shooting + 22 : player.role === "MID" ? player.shooting + 10 : player.shooting);
      next.score[side] += 1;
      minuteEvents.push({ id: eventId("goal", minute), minute, type: "goal", team: teamName, player: scorer.name });
    }
    if (chance(0.008)) {
      const booked = pickWeighted(starters, (player) => player.physicality + (player.role === "DEF" ? 18 : 0));
      minuteEvents.push({ id: eventId("yellow", minute), minute, type: "yellow", team: teamName, player: booked.name });
    }
    if (chance(0.001)) {
      const sentOff = pickWeighted(starters, (player) => player.physicality + (player.role === "DEF" ? 24 : 0));
      next.redCards[side] += 1;
      minuteEvents.push({ id: eventId("red", minute), minute, type: "red", team: teamName, player: sentOff.name });
    }
  };

  runTeam("home");
  runTeam("away");

  if (minute > 20 && chance(0.4)) {
    const teamSide: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const squad = teamSide === "home" ? context.homeSquad : context.awaySquad;
    const lineupIds = teamSide === "home" ? context.homeLineup : context.awayLineup;
    const starters = lineupIds.map((id) => squad.players.find((player) => player.id === id)).filter(Boolean) as Player[];
    const injured = pickWeighted(starters, (player) => 100 - player.physicality + (player.role === "MID" ? 8 : 0));
    const injuryEvent: MatchEvent = {
      id: eventId("injury", minute),
      minute,
      type: "injury",
      team: teamSide === "home" ? context.match.home : context.match.away,
      player: injured.name,
      detail: injured.pos
    };
    minuteEvents.push(injuryEvent);
    next.events = [...next.events, ...minuteEvents];
    const bench = squad.players
      .filter((player) => !lineupIds.includes(player.id))
      .sort((a, b) => (a.role === injured.role ? -8 : 0) + b.rating - a.rating)
      .slice(0, 9);
    return {
      context: next,
      events: minuteEvents,
      pausedForInjury: {
        teamSide,
        team: injuryEvent.team,
        player: injured,
        bench,
        minute
      }
    };
  }

  next.events = [...next.events, ...minuteEvents];
  return { context: next, events: minuteEvents };
}

export function applySubstitution(context: SimulationContext, side: "home" | "away", outId: string, inId: string, minute: number) {
  const lineupKey = side === "home" ? "homeLineup" : "awayLineup";
  const squad = side === "home" ? context.homeSquad : context.awaySquad;
  const incoming = squad.players.find((player) => player.id === inId);
  const outgoing = squad.players.find((player) => player.id === outId);
  const lineup = context[lineupKey].map((id) => id === outId ? inId : id);
  const event: MatchEvent = {
    id: eventId("substitution", minute),
    minute,
    type: "substitution",
    team: side === "home" ? context.match.home : context.match.away,
    player: incoming?.name ?? "Substitute",
    detail: outgoing ? `for ${outgoing.name}` : undefined
  };
  return {
    ...context,
    [lineupKey]: lineup,
    events: [...context.events, event]
  };
}

export function summarizeResult(context: SimulationContext): MatchResult {
  const shotsHome = Math.max(context.score.home, Math.round(currentXg(context).home * 4 + Math.random() * 5));
  const shotsAway = Math.max(context.score.away, Math.round(currentXg(context).away * 4 + Math.random() * 5));
  const possessionBase = 50 + (context.homeStats.midfield - context.awayStats.midfield) * 0.7 + (Math.random() * 10 - 5);
  return {
    matchId: context.match.id,
    score: context.score,
    winner: context.score.home === context.score.away ? undefined : context.score.home > context.score.away ? context.match.home : context.match.away,
    events: context.events,
    stats: {
      possessionHome: Math.max(35, Math.min(65, Math.round(possessionBase))),
      shotsHome,
      shotsAway,
      cardsHome: context.events.filter((event) => event.team === context.match.home && (event.type === "yellow" || event.type === "red")).length,
      cardsAway: context.events.filter((event) => event.team === context.match.away && (event.type === "yellow" || event.type === "red")).length
    }
  };
}
