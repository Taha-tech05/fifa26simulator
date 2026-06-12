import type { TeamStats } from "@/lib/types";

export function StrengthBars({ stats }: { stats: TeamStats }) {
  const rows = [
    ["Attack", stats.attack, "bg-rose-400"],
    ["Midfield", stats.midfield, "bg-sky-400"],
    ["Defense", stats.defense, "bg-emerald-400"]
  ] as const;
  return (
    <div className="space-y-2">
      {rows.map(([label, value, color]) => (
        <div key={label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs">
          <span className="text-white/60">{label}</span>
          <span className="h-2 overflow-hidden rounded bg-white/10">
            <span className={`block h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
          </span>
          <span className="text-right font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}
