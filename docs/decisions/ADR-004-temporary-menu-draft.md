# ADR-004: Temporary menu draft stays local until login

## Status
Accepted for v1 T3.

## Context
The product contract says search, scanner, detail, comparison and temporary menu must work without login. Login should only block personal persistence. The menu draft must survive route changes between `/search`, `/scan` and `/menu` so the first-minute flow does not feel fragile.

## Decision
The web app stores the temporary menu draft in `localStorage` under `labellens.menuDraft.v1`.

- Search and scanner share the same draft through the `useMenuDraft` hook.
- The draft is device-local and not treated as saved account data.
- Grams are editable inline and clamped to a safe range.
- Totals recalculate immediately from source values per 100 g.
- Missing values remain missing; they are not guessed.
- A future authenticated save will POST the current draft to `/api/v1/menus`.

## Consequences
This keeps T3 useful before auth. Clearing browser storage clears the temporary menu. That is acceptable because the draft is not a persisted personal menu yet.
