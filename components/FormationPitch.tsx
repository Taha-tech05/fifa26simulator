import type { Player, Squad } from "@/lib/types";

const slots = [
  { role: "GK", x: 50, y: 88 },
  { role: "DEF", x: 20, y: 66 },
  { role: "DEF", x: 40, y: 68 },
  { role: "DEF", x: 60, y: 68 },
  { role: "DEF", x: 80, y: 66 },
  { role: "MID", x: 27, y: 43 },
  { role: "MID", x: 50, y: 48 },
  { role: "MID", x: 73, y: 43 },
  { role: "ATT", x: 24, y: 18 },
  { role: "ATT", x: 50, y: 13 },
  { role: "ATT", x: 76, y: 18 }
];

export function FormationPitch({
  squad,
  lineup,
  onSelect
}: {
  squad: Squad;
  lineup: string[];
  onSelect?: (player: Player) => void;
}) {
  const players = lineup.map((id) => squad.players.find((player) => player.id === id)).filter(Boolean) as Player[];
  return (
    <div className="pitch-lines relative aspect-[3/4] min-h-[360px] overflow-hidden rounded-md border border-white/15 bg-pitch shadow-glow">
      <div className="absolute inset-x-8 top-1/2 h-px bg-white/25" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      {players.slice(0, 11).map((player, index) => {
        const slot = slots[index] ?? slots[slots.length - 1];
        return (
          <button
            key={`${player.id}-${index}`}
            onClick={() => onSelect?.(player)}
            className="absolute w-24 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-black/55 px-2 py-1 text-center shadow backdrop-blur transition hover:bg-black/75"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            title={`${player.name} (${player.pos})`}
          >
            <span className="block truncate text-[11px] font-bold">{player.shirt || player.name}</span>
            <span className="text-[10px] text-emerald-200">{player.pos} {player.rating}</span>
          </button>
        );
      })}
    </div>
  );
}
