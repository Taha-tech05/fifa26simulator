"use client";

import Link from "next/link";
import { ArrowLeft, Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import fixturesData from "@/data/fixtures.json";
import squadsData from "@/data/squads.json";
import statsData from "@/data/team_stats.json";
import type { Fixture, Player, Squad, TeamStats } from "@/lib/types";
import {
  applySubstitution,
  createMatchContext,
  currentXg,
  simulateMinute,
  summarizeResult,
  type SimulationContext
} from "@/lib/simulationEngine";
import { storeResult } from "@/lib/storage";
import { updateElo } from "@/lib/eloRating";
import { TeamBadge } from "./TeamBadge";
import { LineupEditor } from "./LineupEditor";
import { StrengthBars } from "./StrengthBars";
import { InjuryAdvisor, type AdvisorSuggestion } from "./InjuryAdvisor";

const fixtures = fixturesData as { matches: Fixture[] };
const squads = squadsData as Record<string, Squad>;
const stats = statsData as Record<string, TeamStats>;

type InjuryPause = {
  teamSide: "home" | "away";
  team: string;
  player: Player;
  bench: Player[];
  minute: number;
};

export function MatchScreen({ matchId }: { matchId: number }) {
  const match = fixtures.matches.find((item) => item.id === matchId);
  const homeSquad = match ? squads[match.home] : undefined;
  const awaySquad = match ? squads[match.away] : undefined;
  const homeStats = match ? stats[match.home] : undefined;
  const awayStats = match ? stats[match.away] : undefined;
  const [homeLineup, setHomeLineup] = useState(() => homeSquad?.starters ?? []);
  const [awayLineup, setAwayLineup] = useState(() => awaySquad?.starters ?? []);
  const [context, setContext] = useState<SimulationContext | null>(null);
  const [minute, setMinute] = useState(0);
  const [running, setRunning] = useState(false);
  const [injury, setInjury] = useState<InjuryPause | null>(null);
  const [suggestion, setSuggestion] = useState<AdvisorSuggestion | undefined>();
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const requestedSuggestion = useRef<string | null>(null);

  useEffect(() => {
    if (!match || !homeSquad || !awaySquad || !homeStats || !awayStats) return;
    setContext(createMatchContext({ match, homeSquad, awaySquad, homeStats, awayStats, homeLineup, awayLineup }));
  }, [match, homeSquad, awaySquad, homeStats, awayStats]);

  const xg = useMemo(() => context ? currentXg({ ...context, homeLineup, awayLineup }) : { home: 0, away: 0 }, [context, homeLineup, awayLineup]);

  useEffect(() => {
    if (!running || !context || injury || finished) return;
    const timer = window.setInterval(() => {
      setMinute((current) => {
        const nextMinute = current + 1;
        if (nextMinute > 90) {
          setRunning(false);
          setFinished(true);
          const result = summarizeResult(context);
          storeResult(result);
          return current;
        }
        setContext((currentContext) => {
          if (!currentContext) return currentContext;
          const outcome = simulateMinute({ ...currentContext, homeLineup, awayLineup }, nextMinute);
          if (outcome.pausedForInjury) {
            setRunning(false);
            setInjury(outcome.pausedForInjury);
          }
          return outcome.context;
        });
        return nextMinute;
      });
    }, 380);
    return () => window.clearInterval(timer);
  }, [running, context, injury, finished, homeLineup, awayLineup]);

  useEffect(() => {
    if (!injury || !context || requestedSuggestion.current === `${injury.minute}-${injury.player.id}`) return;
    requestedSuggestion.current = `${injury.minute}-${injury.player.id}`;
    setAdvisorLoading(true);
    setSuggestion(undefined);
    fetch("/api/injury-advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        injured_player: injury.player,
        bench: injury.bench,
        match_state: {
          minute: injury.minute,
          score: `${context.score.home}-${context.score.away}`,
          formation: injury.teamSide === "home" ? homeSquad?.formation : awaySquad?.formation,
          team: injury.team
        }
      })
    })
      .then((response) => response.json())
      .then((data) => {
        setSuggestion({
          suggested_player: data.suggested_player ?? injury.bench[0]?.name,
          reason: data.reason ?? "Best available like-for-like replacement based on position and rating.",
          source: data.source,
          error: data.error
        });
      })
      .catch(() => {
        setSuggestion({
          suggested_player: injury.bench[0]?.name,
          reason: "Gemini was unavailable, so the simulator selected the strongest available bench option.",
          source: "fallback-error"
        });
      })
      .finally(() => setAdvisorLoading(false));
  }, [injury, context, homeSquad?.formation, awaySquad?.formation]);

  if (!match || !homeSquad || !awaySquad || !homeStats || !awayStats) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="rounded-md border border-white/10 bg-panel p-6">
          <h1 className="text-2xl font-black">Match data unavailable</h1>
          <Link href="/" className="mt-4 inline-block text-emerald-200">Back to tournament</Link>
        </div>
      </main>
    );
  }

  const result = context ? summarizeResult(context) : null;
  const actualA = context ? context.score.home > context.score.away ? 1 : context.score.home === context.score.away ? 0.5 : 0 : 0.5;
  const elo = updateElo(homeStats.elo, awayStats.elo, actualA);

  function finishNow() {
    if (!context) return;
    let next = context;
    for (let m = minute + 1; m <= 90; m += 1) {
      const outcome = simulateMinute({ ...next, homeLineup, awayLineup }, m);
      next = outcome.context;
    }
    setContext(next);
    setMinute(90);
    setRunning(false);
    setFinished(true);
    storeResult(summarizeResult(next));
  }

  function completeSub(player: Player) {
    if (!context || !injury) return;
    const next = applySubstitution(context, injury.teamSide, injury.player.id, player.id, injury.minute);
    setContext(next);
    if (injury.teamSide === "home") setHomeLineup(next.homeLineup);
    else setAwayLineup(next.awayLineup);
    setInjury(null);
    setRunning(true);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Tournament
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setRunning((value) => !value)}
              disabled={finished || Boolean(injury)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 font-black text-black disabled:opacity-50"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : minute === 0 ? "Start Match" : "Resume"}
            </button>
            <button
              onClick={finishNow}
              disabled={finished || Boolean(injury)}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
              Finish
            </button>
          </div>
        </div>

        <section className="rounded-md border border-white/10 bg-panel/80 p-4">
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <TeamBadge team={match.home} code={homeStats.code} />
              <div className="mt-3"><StrengthBars stats={homeStats} /></div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black tabular-nums">
                {context?.score.home ?? 0} - {context?.score.away ?? 0}
              </div>
              <div className="mt-2 text-sm text-white/55">{minute}' · xG {xg.home.toFixed(2)} - {xg.away.toFixed(2)}</div>
              <div className="mt-2 h-1.5 w-64 overflow-hidden rounded bg-white/10">
                <div className="h-full bg-emerald-300 transition-all" style={{ width: `${Math.min(100, (minute / 90) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right">
              <TeamBadge team={match.away} code={awayStats.code} />
              <div className="mt-3"><StrengthBars stats={awayStats} /></div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-white/45">Match {match.id} · {match.date} · {match.venue}</p>
        </section>

        {injury ? (
          <InjuryAdvisor
            injured={injury.player}
            bench={injury.bench}
            suggestion={suggestion}
            loading={advisorLoading}
            onAccept={completeSub}
            onManual={completeSub}
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-white/10 bg-panel/70 p-4">
            <h2 className="mb-3 text-lg font-black">Live Events</h2>
            <div className="max-h-[520px] min-h-[280px] space-y-2 overflow-auto">
              {context?.events.length ? context.events.slice().reverse().map((event) => (
                <div key={event.id} className="grid grid-cols-[3rem_1fr] rounded-md border border-white/10 bg-black/20 p-2">
                  <span className="font-black text-emerald-200">{event.minute}'</span>
                  <span className="text-sm">
                    {event.type === "goal" ? "Goal" : event.type === "yellow" ? "Yellow card" : event.type === "red" ? "Red card" : event.type === "injury" ? "Injury" : "Sub"} · {event.player} ({event.team}) {event.detail ? `· ${event.detail}` : ""}
                  </span>
                </div>
              )) : (
                <div className="grid h-64 place-items-center rounded-md border border-dashed border-white/10 text-white/45">
                  Waiting for kickoff
                </div>
              )}
            </div>
            {finished && result ? (
              <div className="mt-4 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm">
                Final stats: possession {result.stats.possessionHome}% - {100 - result.stats.possessionHome}%, shots {result.stats.shotsHome} - {result.stats.shotsAway}, cards {result.stats.cardsHome} - {result.stats.cardsAway}. Elo preview: {homeStats.elo}→{elo.a}, {awayStats.elo}→{elo.b}.
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <LineupEditor squad={homeSquad} lineup={homeLineup} onLineupChange={setHomeLineup} />
            <LineupEditor squad={awaySquad} lineup={awayLineup} onLineupChange={setAwayLineup} />
          </section>
        </div>
      </div>
    </main>
  );
}
