# Copilot Instructions for mytoolbox 🧰

## Summary
- This repository is a **VS Code extension** that processes a target Excel macro workbook (.xlsm) and SupportDocuments to produce a BOE/estimate audit. Key entrypoint: `src/extension.ts` (command: `mytoolbox.buildEstimate`).

## Big picture (what the code does) ⚙️
- Activation: user runs the command `mytoolbox.buildEstimate` from the command palette. See `package.json` contributes & activationEvents.
- Workflow: `extension` locates a single `.xlsm` in the workspace root and a `SupportDocuments` folder; it then calls `processEstimate(xlsmPath, supportPath)` in `src/dataProcessor.ts`.
- Data flow: `dataProcessor` reads the workbook with **ExcelJS**, expects header row at **Row 8**, turns rows after row 8 into objects keyed by normalized headers and performs:
  - Market truth lookup from `SupportDocuments/marketTruth.json` (optional; missing = $0 fallback)
  - Unit price matching for `Std Item #` (increments `stats.matches`)
  - Treats `Std Item # === "9999"` as non-standard (increments `stats.nonStandard`)
  - Uses `Sanitizer.linguisticSweep()` for text hygiene and `Sanitizer.isEnvironmentalItem()` to apply the "Zero-Tree" policy
  - Logs processing summary via `PostMortemLogger.logSession()` (Output channel: **WSDOT Estimator Audit**)

## Important files & symbols (quick reference) 🔎
- `src/extension.ts` — activation & command wiring
- `src/dataProcessor.ts` — core processing logic and Row 8 protocol
- `src/sanitizer.ts` — linguistic and environmental rules (e.g., replace `Dam` → `Fish Passage Structure`)
- `src/logger.ts` — where session post-mortem output goes (uses a VS Code Output Channel)
- `src/sectionAggregator.ts` — WSDOT section detection & sectional totaling rules
- `src/testBridge.ts` — developer utility to validate the processing bridge and Row 8 assumptions

## Project-specific conventions & gotchas ⚠️
- Row 8 Protocol: Row 8 is the canonical header row. Code assumes headers live there and data starts at Row 9.
- Header normalization: headers collapse multiple spaces and are used as object keys (e.g., `Std Item #`, `Item Quantity`, `Item Unit Cost`). Code expects these exact labels.
- Non-data rows: Rows without a `Std Item #` are treated as section headers (not data rows). Do not move header row or change row indexing without updating `dataProcessor` tests.
- Support files: `SupportDocuments/StandardItemReport(.csv|.xlsx)`, `NonStandardItemReport(.csv|.xlsx)` are required. If not present, processing aborts and a critical error is logged and shown to the user.
- Market truth: `marketTruth.json` is optional; absence produces a warning and all unit costs default to 0.
- Environmental "Zero-Tree" policy is applied using a small heuristic (section header match or keyword list). See `Sanitizer.isEnvironmentalItem()` for exact logic.

## Build / run / test workflows 🧪
- Compile (TypeScript → JS bundle): `npm run compile` (runs `node esbuild.js`).
- Continuous development: `npm run watch` (esbuild `--watch`).
- Tests: `npm test` uses `vscode-test` (current tests are placeholders in `src/test`). Add integration tests that simulate `processEstimate()` for coverage.
- Run the extension in VS Code dev host to trace processing and view the `WSDOT Estimator Audit` output channel.

## Suggestions for code-modifying agents (do this first) 💡
- If you change parsing rules (Row 8, header names, or section detection), update:
  - `src/dataProcessor.ts` (parsing logic)
  - `src/sectionAggregator.ts` (section list & aggregation rules)
  - `src/test/` to include a sample workbook or mocked ExcelJS workbook validating new rules
- Prefer small, targeted edits that keep the Row 8 protocol intact unless you also update `testBridge.ts` and the user-facing error messages in `extension.ts`.

## Example patterns (copyable) 🧾
- Header detection: Row 8 is enumerated and normalized; sample usage in `dataProcessor.ts`:
  - header keys: `Std Item #`, `Item Quantity`, `Item Unit Cost`, `Item Description`
- Market truth usage: a JSON map with unit prices: `{ "1234": 12.34, "5678": 5.0 }` stored in `SupportDocuments/marketTruth.json`.

## When to open an issue or ask the maintainer ❗
- If a change would modify user-visible behavior: section totals, zero-tree policy, or how missing support docs are handled — ask before changing.
- If you want to add a new required support file or change file naming conventions, update the README and `extension` error messages.

---

If any section is unclear or you want me to add short examples/tests for a particular change, tell me which part to expand and I’ll iterate. ✅
