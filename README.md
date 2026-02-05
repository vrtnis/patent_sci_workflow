# Patent Workflow Extractor MVP

Deterministic, testable extraction of methods-style workflows from granted patents. This is **not** a chatbot and **not** RAG. It compiles stable JSON contracts plus a human-readable `report.md`.

## What it does
Input:
- A granted patent number (preferred) **or** a local fixture.

Output:
1. Ordered workflow steps with evidence snippets
2. Extracted parameters (ranges/units + step association when possible)
3. Reproducibility gaps (missing units, ambiguous quantifiers, missing conditions)
4. A `report.md` summary

Artifacts are written to `./artifacts/<jobId>/`.

## Setup
```bash
npm install
```

Set the PatentsView key (optional, only needed for live API fetches):
```bash
export PATENTSVIEW_API_KEY="your_key_here"
```

## Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and compile by patent number or fixture.

## API
### POST /api/compile
Input:
```json
{ "patentNumber": "12345678" }
```
OR
```json
{ "fixtureName": "fix-enum-001" }
```

Behavior:
- If `patentNumber` is provided, the app fetches claims + description from PatentsView and caches under `./cache/patentsview/<patentNumber>.json`.
- If the API key is missing or the fetch fails, it falls back to `tests/fixtures/`.

Response:
```json
{ "jobId": "..." }
```

### GET /api/job/[jobId]
Response:
```json
{
  "jobId": "...",
  "reportMd": "...",
  "workflow": [],
  "parameters": [],
  "gaps": [],
  "sourceMeta": {
    "source": "PatentsView",
    "status": "cached",
    "patentNumber": "...",
    "fetchedAt": "..."
  }
}
```

## Artifacts
Each compile writes:
- `workflow.json`
- `parameters.json`
- `gaps.json`
- `report.md`
- `diagram.mmd` (Mermaid flowchart)

## Fixtures (offline mode)
Fixtures live in `tests/fixtures/`.

Add a new fixture from PatentsView:
```bash
npm run add-fixture-from-patentsview -- <PATENT_NUMBER>
```
This saves `tests/fixtures/<PATENT_NUMBER>.json` and adds a structural test file to keep outputs stable.

### Synthetic fixtures (OpenAI)
Generate edge-case fixtures with GPT-5.2 using structured outputs:

```bash
export OPENAI_API_KEY="your_key_here"
npm run fixtures:generate -- --type edge-mix --count 5
```

If you run these via Codex automations, you can also set `OPENAI_API_KEY` in a local `.env` file in the repo. The generators will load it automatically.

Supported types:
- `weird-claim-numbering`
- `abc-steps`
- `ranges-units`
- `ambiguous-quantifiers`
- `missing-units`
- `missing-conditions`
- `edge-mix`
- `all` (cycles through each type)

Optional flags:
- `--model gpt-5.2`
- `--batch 2026-02-05`
- `--temperature 0.4`

Synthetic fixtures are saved as `tests/fixtures/SYN-<type>-<batch>-NN.json` and automatically validated in `tests/synthetic_fixtures.test.ts`.

### Synthetic fixture packs (with a guaranteed failure)
Generate a pack in `tests/fixtures/synth/<timestamp>/` with a targeted challenge fixture + test:

```bash
export OPENAI_API_KEY="your_key_here"
npm run gen:fixtures -- --count 20 --include-failing 1 --type edge-mix
```

`.env` is also supported for automation runs.

This writes:
- `tests/fixtures/synth/<timestamp>/` JSON fixtures + `manifest.json`
- `tests/fixtures/synth/<timestamp>/challenge-<timestamp>.test.ts` (targeted failing test)

The challenge fixture uses a range notation the extractor does not currently handle, so the test fails predictably until the extractor is updated.

## Testing
```bash
npm test
```

CI-style run (typecheck + tests + summary report):
```bash
npm run ci
```
This writes `artifacts/build_report.md`.

## Project structure
- `src/compiler/` deterministic extraction pipeline
- `src/app/` Next.js App Router UI + API routes
- `tools/` PatentsView fetcher and automation scripts
- `tests/` fixtures + unit tests

## License
MIT
