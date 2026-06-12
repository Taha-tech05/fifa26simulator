"use client";

import { Check, UserRoundSearch } from "lucide-react";
import type { Player } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";

export type AdvisorSuggestion = {
  suggested_player: string;
  reason: string;
  source?: "gemini" | "fallback-no-key" | "fallback-error";
  error?: string;
};

export function InjuryAdvisor({
  injured,
  bench,
  suggestion,
  loading,
  onAccept,
  onManual
}: {
  injured: Player;
  bench: Player[];
  suggestion?: AdvisorSuggestion;
  loading: boolean;
  onAccept: (player: Player) => void;
  onManual: (player: Player) => void;
}) {
  const suggested = suggestion
    ? bench.find((player) => player.name === suggestion.suggested_player) ?? bench[0]
    : bench[0];

  return (
    <div className="rounded-md border border-amber-300/40 bg-[#20180b] p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Injury pause</p>
          <h3 className="mt-1 text-xl font-black">{injured.name} ({injured.pos})</h3>
        </div>
        <div className="rounded bg-amber-300 px-2 py-1 text-xs font-black text-black">AI Tactical Advisor</div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
        <PlayerCard player={injured} />
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          {loading ? (
            <p className="text-sm text-white/70">Asking Gemini for the best substitution...</p>
          ) : (
            <>
              <p className="text-sm text-white/60">Suggested</p>
              {suggested ? <p className="text-lg font-black text-emerald-200">{suggested.name} ({suggested.pos}) · {suggested.rating}</p> : null}
              <p className="mt-2 text-sm leading-6 text-white/75">
                {suggestion?.reason ?? "Using the highest-rated available bench option while the advisor response loads."}
              </p>
              {suggestion?.source ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                  Source: {suggestion.source}
                </p>
              ) : null}
              {suggestion?.error ? <p className="mt-2 text-xs text-red-300">{suggestion.error}</p> : null}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={!suggested}
          onClick={() => suggested && onAccept(suggested)}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Accept Suggestion
        </button>
        <div className="flex items-center gap-2">
          <UserRoundSearch className="h-4 w-4 text-white/60" />
          <select
            className="rounded-md border border-white/10 bg-panel px-3 py-2 text-sm"
            value=""
            onChange={(event) => {
              const player = bench.find((item) => item.id === event.target.value);
              if (player) onManual(player);
            }}
          >
            <option value="">Pick manually</option>
            {bench.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} · {player.pos} · {player.rating}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
