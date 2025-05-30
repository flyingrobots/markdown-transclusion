---
id: 001
title: "Basic Transclusion Resolution"
status: implemented
updated: 2024-01-29T12:00:00Z
---

## Overview

Core functionality to embed content from other files using Obsidian-style `![[filename]]` syntax, enabling modular documentation workflows.

## User Story

As a technical writer, I want to embed content from other files using `![[filename]]` syntax so that I can compose documents from reusable components.

## Acceptance Criteria

- [x] Resolves `![[filename]]` to file contents
- [x] Supports relative paths from base directory
- [x] Handles missing files gracefully with error comments
- [x] Preserves original line structure for non-transclusion content

## Notes

- File extension inference: `.md` is assumed if not specified
- Error comments format: `<!-- Error: File not found: filename -->`
- Base path defaults to current working directory
- Test coverage: See `tests/transclude.test.ts` and `tests/parser.test.ts`