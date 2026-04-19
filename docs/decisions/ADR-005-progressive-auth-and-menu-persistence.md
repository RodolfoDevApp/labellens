# ADR-005: Progressive auth and menu persistence

## Status
Accepted

## Context
LabelLens must keep search, scan, detail and temporary menu public. Login only blocks personal persistence. The temporary menu cannot be lost when the user decides to sign in.

## Decision
Use progressive auth:

- Anonymous users can search, scan, inspect details and build a temporary menu.
- Saving menus and favorites requires auth.
- After login/register, pending save actions continue with the same draft/item.
- Backend owner checks use the authenticated user id.

## Consequences
The app keeps the first-minute flow open while still protecting personal data. `/menu` is the account/menu surface: current menu preview, saved menus, week board and login/register access.
