import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

type AdvisorRequest = {
  injured_player: { name: string; position?: string; pos?: string; rating: number };
  bench: { name: string; position?: string; pos?: string; rating: number }[];
  match_state: {
    minute: number;
    score: string;
    formation: string;
    team: string;
  };
};

type AdvisorResponse = {
  suggested_player: string;
  reason: string;
  source: "gemini" | "fallback-no-key" | "fallback-error";
  error?: string;
};

function fallback(body: AdvisorRequest) {
  const injuredPos = body.injured_player.position ?? body.injured_player.pos;
  const sameRole = body.bench.filter((player) => (player.position ?? player.pos) === injuredPos);
  const pool = sameRole.length ? sameRole : body.bench;
  const suggested = pool.sort((a, b) => b.rating - a.rating)[0];
  return {
    suggested_player: suggested?.name ?? body.bench[0]?.name ?? "No substitute available",
    reason: suggested
      ? `${suggested.name} is the strongest available ${injuredPos ?? "replacement"} option and keeps ${body.match_state.team}'s ${body.match_state.formation} structure intact at ${body.match_state.minute}'.`
      : "No bench player was available in the current match state.",
    source: "fallback-no-key" as const
  };
}

export async function POST(request: Request) {
  const body = await request.json() as AdvisorRequest;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback(body) satisfies AdvisorResponse);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = [
      "You are a football tactical assistant inside a World Cup simulator.",
      "Return only compact JSON with keys suggested_player and reason.",
      "Choose one bench player. Prefer matching position, rating, and match context.",
      JSON.stringify(body)
    ].join("\n");
    const response = await model.generateContent(prompt);
    const text = response.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text) as { suggested_player?: string; reason?: string };
    if (!parsed.suggested_player || !parsed.reason) {
      return NextResponse.json(fallback(body) satisfies AdvisorResponse);
    }
    return NextResponse.json({
      suggested_player: parsed.suggested_player,
      reason: parsed.reason,
      source: "gemini" as const
    } satisfies AdvisorResponse);
  } catch {
    const message = "Unknown Gemini request failure";
    return NextResponse.json({ ...fallback(body), source: "fallback-error" as const, error: message } satisfies AdvisorResponse);
  }
}
