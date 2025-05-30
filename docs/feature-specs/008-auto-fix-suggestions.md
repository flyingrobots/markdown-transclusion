---
id: 008
title: "Auto-Fix Suggestions"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Intelligent error recovery system that suggests corrections for common transclusion errors like typos, wrong paths, or missing extensions.

## User Story

As a content author, I want helpful suggestions when transclusions fail so that I can quickly fix reference errors without manual searching.

## Acceptance Criteria

- [ ] Suggest similar filenames when file not found (fuzzy matching)
- [ ] Detect and suggest case sensitivity fixes
- [ ] Recommend adding/removing file extensions
- [ ] Show nearby valid paths for wrong directories
- [ ] Provide CLI flag to auto-apply safe fixes

## Notes

- Example: "Did you mean 'intro.md' instead of 'inrto.md'?"
- Levenshtein distance for similarity matching
- Could integrate with VS Code extension for IDE support
- Safety: Only auto-fix with explicit user consent
- Consider caching common mistakes for performance