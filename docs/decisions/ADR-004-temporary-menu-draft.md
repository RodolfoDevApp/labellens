# ADR-004: Temporary menu draft

## Status
Accepted

## Context
Search, scanner, detail and temporary menu must work without login. Login should only block personal persistence. The menu draft must survive route changes between `/search`, `/scan` and `/menu` so the first-minute flow does not feel fragile.

## Decision
Use a device-local temporary menu draft for anonymous users. The web app stores the active draft in localStorage and recalculates totals through the API when needed.

## Consequences
A user can search a USDA food, scan a packaged product, add grams to meals and only sign in when they want to save the menu or a favorite.
