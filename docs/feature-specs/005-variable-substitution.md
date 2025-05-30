---
id: 005
title: "Variable Substitution"
status: implemented
updated: 2024-01-29T12:00:00Z
---

## Overview

Dynamic file reference resolution through variable placeholders, enabling conditional transclusion for multilingual documentation and environment-specific content.

## User Story

As a multilingual content creator, I want language-aware transclusion so that I can maintain translations efficiently.

## Acceptance Criteria

- [x] Supports `{{variable}}` syntax in transclusion paths
- [x] Variables resolved before file lookup
- [x] Multiple variables can be used in single reference
- [x] Undefined variables left as-is or error in strict mode

## Notes

- Example: `![[intro-{{lang}}]]` resolves to `intro-en.md` when `lang=en`
- Variables passed via `variables` option in API or `--variables` in CLI
- Originally labeled "Conditional Transclusion" (F5) in tech spec
- Test coverage: See `tests/utils/pathTokens.test.ts`