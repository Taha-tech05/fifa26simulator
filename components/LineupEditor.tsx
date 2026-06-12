import { Repeat2 } from "lucide-react";
import type { Player, Squad } from "@/lib/types";
import { FormationPitch } from "./FormationPitch";
import { PlayerCard } from "./PlayerCard";

export function LineupEditor({
  squad,
  lineup,
  onLineupChange
}: {
  squad: Squad;
  lineup: string[];
  onLineupChange: (lineup: string[]) => void;
}) {
  const starters = lineup.map((id) => squad.players.find((player) => player.id === id)).filter(Boolean) as Player[];
  const bench = squad.players.filter((player) => !lineup.includes(player.id));

  function swap(outId: string, inId: string) {
    onLineupChange(lineup.map((id) => id === outId ? inId : id));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_1.15fr]">
      <FormationPitch squad={squad} lineup={lineup} />
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">{squad.team} Lineup</h3>
            <p className="text-xs text-white/55">{squad.formation} · {squad.dataQuality}</p>
          </div>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
          {starters.map((starter) => (
            <div key={starter.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-white/10 bg-black/20 p-2">
              <PlayerCard player={starter} compact />
              <select
                className="w-44 rounded-md border border-white/10 bg-panel px-2 text-xs text-white"
                value=""
                aria-label={`Swap ${starter.name}`}
                onChange={(event) => {
                  if (event.target.value) swap(starter.id, event.target.value);
                }}
              >
                <option value="">Bench swap</option>
                {bench
                  .filter((player) => player.role === starter.role || player.pos === starter.pos)
                  .concat(bench.filter((player) => player.role !== starter.role && player.pos !== starter.pos))
                  .slice(0, 14)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} · {player.pos} · {player.rating}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-amber-300/20 bg-amber-300/10 p-2 text-xs text-amber-100">
          <Repeat2 className="h-4 w-4" />
          Swaps recalculate lineup strength and the remaining xG immediately.
        </div>
      </div>
    </div>
  );
}
