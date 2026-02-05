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
