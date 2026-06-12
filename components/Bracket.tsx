"use client";

import Link from "next/link";
import { RotateCcw, Trophy } from "lucide-react";
import fixturesData from "@/data/fixtures.json";
import squadsData from "@/data/squads.json";
import statsData from "@/data/team_stats.json";
import coverageData from "@/data/coverage.json";
import type { Fixture, MatchResult, Squad, TeamStats } from "@/lib/types";
import { clearTournament, loadTournament } from "@/lib/storage";
import { TeamBadge } from "./TeamBadge";
import { StrengthBars } from "./StrengthBars";
import { useEffect, useMemo, useState } from "react";

const fixtures = fixturesData as { tournament: string; groups: { group: string; teams: string[] }[]; matches: Fixture[] };
const squads = squadsData as Record<string, Squad>;
const stats = statsData as Record<string, TeamStats>;
const coverage = coverageData as { team: string; dataQuality: string; playerCount: number }[];

function resultFor(results: Record<number, MatchResult>, id: number) {
  return results[id];
}

export function Bracket() {
  const [state, setState] = useState(() => ({ results: {}, completed: [] as number[] }));

  useEffect(() => {
    setState(loadTournament());
  }, []);

  const nextMatch = fixtures.matches.find((match) => match.phase === "Group Stage" && !state.completed.includes(match.id));
  const dataGaps = coverage.filter((row) => row.dataQuality !== "provided");

  const standings = useMemo(() => {
    const table: Record<string, Record<string, { team: string; played: number; points: number; gf: number; ga: number }>> = {};
    for (const group of fixtures.groups) {
      table[group.group] = Object.fromEntries(group.teams.map((team) => [team, { team, played: 0, points: 0, gf: 0, ga: 0 }]));
    }
    for (const match of fixtures.matches.filter((item) => item.group)) {
      const result = resultFor(state.results, match.id);
      if (!result || !match.group) continue;
      const home = table[match.group]?.[match.home];
      const away = table[match.group]?.[match.away];
      if (!home || !away) continue;
      home.played += 1;
      away.played += 1;
      home.gf += result.score.home;
      home.ga += result.score.away;
      away.gf += result.score.away;
      away.ga += result.score.home;
      if (result.score.home > result.score.away) home.points += 3;
      else if (result.score.home < result.score.away) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    }
    return table;
  }, [state.results]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Interactive simulator</p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">FIFA World Cup 2026 Simulator</h1>
            <p className="mt-2 max-w-3xl text-white/65">
              48 teams, 12 groups, real fixture data, squad-aware ratings, per-minute events, and Gemini substitution advice when an injury stops play.
            </p>
          </div>
          <div className="flex gap-2">
            {nextMatch ? (
              <Link href={`/match/${nextMatch.id}`} className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-3 font-black text-black">
                <Trophy className="h-5 w-5" />
                Simulate Next Match
              </Link>
            ) : null}
            <button
              onClick={() => {
                clearTournament();
                setState({ results: {}, completed: [] });
              }}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-3 font-semibold text-white/80"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {dataGaps.length ? (
          <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
            Data note: {dataGaps.length} teams use ratings-derived or missing roster data because full provided squads were not available. Missing roster teams will still display generated fallback players when EA nationality data exists.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3">
            <h2 className="text-xl font-black">Match Queue</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {fixtures.matches.slice(0, 88).map((match) => {
                const result = resultFor(state.results, match.id);
                const locked = match.phase !== "Group Stage";
                return (
                  <Link
                    key={match.id}
                    href={locked ? "#" : `/match/${match.id}`}
                    className={`rounded-md border p-3 transition ${result ? "border-emerald-300/30 bg-emerald-300/10" : locked ? "border-white/10 bg-white/[0.03] opacity-70" : "border-white/10 bg-panel/80 hover:border-emerald-300/40"}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-white/50">
                      <span>Match {match.id} · {match.group ? `Group ${match.group}` : match.phase}</span>
                      <span>{result ? "simulated" : locked ? "locked" : "upcoming"}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TeamBadge team={match.home} code={stats[match.home]?.code} />
                      <span className="rounded bg-black/35 px-2 py-1 font-black">
                        {result ? `${result.score.home} - ${result.score.away}` : "vs"}
                      </span>
                      <span className="justify-self-end text-right"><TeamBadge team={match.away} code={stats[match.away]?.code} /></span>
                    </div>
                    <p className="mt-2 truncate text-xs text-white/45">{match.date} · {match.venue}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <h2 className="text-xl font-black">Groups & Strength</h2>
            {fixtures.groups.map((group) => (
              <div key={group.group} className="rounded-md border border-white/10 bg-panel/80 p-3">
                <h3 className="font-black">Group {group.group}</h3>
                <div className="mt-2 space-y-3">
                  {group.teams.map((team) => {
                    const row = standings[group.group][team];
                    return (
                      <div key={team} className="rounded-md bg-black/20 p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <TeamBadge team={team} code={squads[team]?.code} />
                          <span className="text-xs text-white/60">{row.points} pts · {row.gf - row.ga >= 0 ? "+" : ""}{row.gf - row.ga}</span>
                        </div>
                        {stats[team] ? <StrengthBars stats={stats[team]} /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </main>
  );
}
