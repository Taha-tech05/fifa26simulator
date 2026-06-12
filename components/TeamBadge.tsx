const flagMap: Record<string, string> = {
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  Scotland: "🏴",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  "United States": "🇺🇸",
  Uruguay: "🇺🇾"
};

export function TeamBadge({ team, code }: { team: string; code?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="text-xl" aria-hidden>{flagMap[team] ?? "🏆"}</span>
      <span className="min-w-0 truncate font-semibold">{team}</span>
      {code ? <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/55">{code}</span> : null}
    </span>
  );
}
