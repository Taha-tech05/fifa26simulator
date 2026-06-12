# FIFA 2026 Simulator

A Next.js app that simulates the 2026 World Cup with squad-aware ratings, live match events, lineup editing, and an AI injury advisor powered by Gemini.

## What this project does

- Shows a tournament bracket and lets you open individual matches.
- Simulates each minute of a match with goals, cards, injuries, substitutions, xG, and final stats.
- Uses squad and rating data to build playable rosters for the participating teams.
- Calls a Gemini-backed injury advisor when a match pauses for an injury.
- Falls back to local substitution logic when Gemini is unavailable.

## Main parts

- `app/page.tsx`: tournament home screen.
- `app/match/[id]/page.tsx`: match page for a specific fixture.
- `components/Bracket.tsx`: tournament overview and entry point to matches.
- `components/MatchScreen.tsx`: live match simulation UI.
- `components/InjuryAdvisor.tsx`: injury pause UI and substitution suggestion display.
- `app/api/injury-advisor/route.ts`: Gemini API route for substitution advice.
- `lib/simulationEngine.ts`: match simulation logic.
- `scripts/preprocess.mjs`: generates the data files in `data/`.

## Data flow

1. Raw source files such as `ea_sports_fc25_full.csv`, `eloratings.csv`, `results.csv`, `squads.json`, and `world_cup_2026.json` are read by `scripts/preprocess.mjs`.
2. The preprocessing script writes generated app data into `data/fixtures.json`, `data/squads.json`, `data/team_stats.json`, and `data/coverage.json`.
3. The UI reads those generated files to render the bracket and the match screen.
4. During a match, the simulator can pause for an injury and request substitution advice from `/api/injury-advisor`.

## Requirements

- Node.js 18 or newer.
- npm.
- A Gemini API key if you want the AI injury advisor to work.

## Setup

Create a `.env` file in the project root with:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If you do not add a key, the app still runs, but the injury advisor falls back to local logic.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The `predev` script runs `scripts/preprocess.mjs` before Next.js starts, so the generated data files are refreshed automatically.

3. Open the app in your browser:

```text
http://localhost:3000
```

## Other useful commands

- `npm run build`: generates a production build. This also runs preprocessing first.
- `npm run start`: starts the production server after building.
- `npm run test:sim`: runs the simulation smoke test script.
- `npm run extract:wikipedia-squads`: extracts squad data from Wikipedia sources when needed.

## How to use the app

1. Open the tournament bracket on the home page.
2. Pick a fixture to open the match screen.
3. Start the match and let the minute-by-minute simulation run.
4. If an injury happens, the app pauses and shows the injury advisor.
5. Accept the suggestion or choose a manual substitution.

## Notes

- Generated files live in `data/` and should be refreshed through the preprocessing script rather than edited by hand.
- `.next/`, `node_modules/`, `.env`, and other local build files are ignored by git.
- If Gemini fails, the UI will still continue with fallback substitution logic.