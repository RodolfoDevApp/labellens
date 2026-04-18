# ADR-002: Mobile-first contract

## Status

Accepted for v1.

## Decision

Every vertical slice is accepted first at 360x780 and 390x844. Desktop is an expansion of the same routes and components.

## Consequences

- Primary actions live low in the viewport when possible.
- Inputs and critical buttons target at least 44px height.
- Menu totals must remain reachable without long scrolling.
- Scanner must always provide manual barcode fallback once T2 starts.
