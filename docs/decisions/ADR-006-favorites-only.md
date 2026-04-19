# ADR-006: Favorites only in v1

## Status
Accepted

## Context
The useful repeat-action in the current app is not inventory or custom meal composition. It is reusing foods and packaged products the user already searched or scanned.

The implemented data model supports source references, nutrition per 100 g and default grams. It does not support custom preparation steps, ingredient editing, stock on hand, expiration dates or serving conversion.

## Decision
- Keep **Favorites** in v1.
- Save favorites from search and barcode scan.
- Store source, sourceId, displayName, default grams and nutrition facts.
- Show favorites behind a modal button in `/search` and `/scan`.
- Load favorites 10 at a time inside the modal.
- Do not use inventory language.
- Do not expose custom composition flows in v1.

## Consequences
The slice stays aligned with the actual API and the current UI: find or scan an item, save it, then reuse it quickly in a menu by grams.
