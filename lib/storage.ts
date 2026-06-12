import type { MatchResult } from "./types";

export type StoredTournament = {
  results: Record<number, MatchResult>;
  completed: number[];
};

const STORAGE_KEY = "fifa26-tournament-state";

export function loadTournament(): StoredTournament {
  if (typeof window === "undefined") return { results: {}, completed: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { results: {}, completed: [] };
  try {
    const parsed = JSON.parse(raw) as StoredTournament;
    return { results: parsed.results ?? {}, completed: parsed.completed ?? [] };
  } catch {
    return { results: {}, completed: [] };
  }
}

export function saveTournament(state: StoredTournament) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function storeResult(result: MatchResult) {
  const state = loadTournament();
  state.results[result.matchId] = result;
  state.completed = [...new Set([...state.completed, result.matchId])].sort((a, b) => a - b);
  saveTournament(state);
}

export function clearTournament() {
  window.localStorage.removeItem(STORAGE_KEY);
}
