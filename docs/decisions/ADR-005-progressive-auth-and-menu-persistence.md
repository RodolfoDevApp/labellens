# ADR-005: Progressive auth and saved menu persistence

## Status
Accepted for T4 local implementation.

## Context
LabelLens must keep search, scan, detail, comparison and temporary menu public. Login only blocks personal persistence. The temporary menu cannot be lost when the user decides to sign in.

## Decision
T4 introduces a local development auth session and protected saved-menu endpoints:

- `POST /api/v1/auth/demo-login` returns a development bearer token.
- `GET /api/v1/auth/me` validates the current token.
- `POST /api/v1/menus` saves a menu and requires auth.
- `GET /api/v1/menus` lists saved menus for the signed-in owner.
- `GET /api/v1/menus/{menuId}` reads a saved menu for the signed-in owner.

The browser keeps the temporary draft in `localStorage`. Login and registration live in a modal surfaced from the global navbar and from any save action. The modal asks for the fields users expect: email/password for login and name/email/password for registration. If the user clicks save without a session, the save action opens the auth modal; after login/register succeeds, the same draft is saved immediately without route changes. The draft remains editable after saving.

The `/menu` route is not another copy of the drawer. It is the user-facing menu/account surface: current menu preview, print/PDF preview, saved menus and login/register access.

## Consequences
- T4 validates progressive auth behavior without blocking public value.
- Owner checks exist at the route boundary before Cognito integration.
- The local bearer token is intentionally a development adapter. It is not production security.
- Cognito can replace the demo auth adapter later while preserving the frontend flow and API shape.
