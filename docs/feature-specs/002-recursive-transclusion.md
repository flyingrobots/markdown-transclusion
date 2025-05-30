---
id: 002
title: "Recursive Transclusion"
status: implemented
updated: 2024-01-29T12:00:00Z
---

## Overview

Support for transclusions within transcluded files, allowing deeply nested modular content structures with automatic cycle detection.

## User Story

As a documentation maintainer, I want embedded files to support their own transclusions so that I can create deeply modular content hierarchies.

## Acceptance Criteria

- [x] Recursively processes transclusions in embedded content
- [x] Detects and prevents circular references
- [x] Maintains proper error reporting through recursion chain

## Notes

- Maximum recursion depth configurable via `maxDepth` option (default: 10)
- Circular references produce descriptive error showing the reference chain
- Automatic caching enabled when `maxDepth > 1` for performance
- Test coverage: See `tests/transclude.test.ts` for circular reference tests