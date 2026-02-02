# Active Tasks (CANONICAL)

This file contains ONLY current, actionable work.
Completed or abandoned work must be removed or archived via the monthly memory log.

## Now (top priority, max 7)
- [ ] Add integration tests for `processEstimate()` using a representative `.xlsm` workbook  
      Owner: dev  
      Exit criteria: test validates BOE output using `SupportDocuments/` fixtures

- [ ] Implement `out/test/runTest.js` so `npm test` runs locally and in CI  
      Owner: devops  
      Exit criteria: `npm test` passes in CI and locally without manual steps

- [ ] Add sample `SupportDocuments/` fixtures for tests  
      Owner: dev  
      Exit criteria: fixtures checked in; tests reference them without mocks

## Next (ready but not started)
- [ ] Add CI assertion that `npx vsce package` produces a `.vsix` artifact  
      Owner: ci  
      Notes: validation only; packaging logic already exists

- [ ] Add basic unit coverage for `scripts/memory_rollup.py`  
      Owner: dev  
      Notes: focus on `ensure` and `rollup` commands

## Parked / Blocked (explicitly waiting)
- (none)

## Rules
- Keep this list short and current.
- No design notes, no history, no commentary.
- When a task is completed:
  1) Remove it from this file
  2) Record the outcome in the monthly archive log
