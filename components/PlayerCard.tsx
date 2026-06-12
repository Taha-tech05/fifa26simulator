import type { Player } from "@/lib/types";

export function PlayerCard({ player, compact = false }: { player: Player; compact?: boolean }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{player.name}</p>
          <p className="truncate text-xs text-white/55">{player.pos} · {player.club}</p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-emerald-400 text-sm font-black text-black">
          {player.rating}
        </div>
      </div>
      {!compact ? (
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-white/60">
          <span>PAC {player.pace}</span>
          <span>SHO {player.shooting}</span>
          <span>PAS {player.passing}</span>
          <span>DEF {player.defending}</span>
          <span>PHY {player.physicality}</span>
          <span>{player.role}</span>
        </div>
      ) : null}
    </div>
  );
}
