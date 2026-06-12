export type Role = "GK" | "DEF" | "MID" | "ATT";

export type Player = {
  id: string;
  number: number;
  name: string;
  shirt: string;
  pos: string;
  role: Role;
  club: string;
  rating: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physicality: number;
};

export type Squad = {
  team: string;
  code: string;
  coach: string;
  dataQuality: "provided" | "ratings-derived" | "missing";
  formation: string;
  starters: string[];
  players: Player[];
};

export type TeamStats = {
  team: string;
  code: string;
  elo: number;
  attack: number;
  midfield: number;
  defense: number;
  baseAttack: number;
  baseDefense: number;
  form: number;
};

export type Fixture = {
  id: number;
  phase: string;
  group: string | null;
  date: string;
  timeUtc: string | null;
  home: string;
  away: string;
  venue: string;
  status: "upcoming" | "locked";
};

export type MatchEvent = {
  id: string;
  minute: number;
  type: "goal" | "yellow" | "red" | "injury" | "substitution";
  team: string;
  player: string;
  detail?: string;
};

export type MatchResult = {
  matchId: number;
  score: { home: number; away: number };
  stats: {
    possessionHome: number;
    shotsHome: number;
    shotsAway: number;
    cardsHome: number;
    cardsAway: number;
  };
  winner?: string;
  events: MatchEvent[];
};

export type Lineups = {
  home: string[];
  away: string[];
};
