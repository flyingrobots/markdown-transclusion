---
id: 003
title: "Path Resolution"
status: implemented
updated: 2024-01-29T12:00:00Z
---

## Overview

Flexible path resolution system supporting relative paths, nested directories, and configurable file extensions for organizing content in logical structures.

## User Story

As a content author, I want flexible path resolution for embedded files so that I can organize content in logical directory structures.

## Acceptance Criteria

- [x] Supports relative paths: `![[../shared/header]]`
- [x] Supports nested paths: `![[sections/intro/overview]]`
- [x] Configurable base path for resolution
- [x] File extension inference (.md assumed if not specified)

## Notes

- Extension resolution order configurable via `extensions` option
- Default extensions: `['md', 'markdown']`
- Paths resolved relative to parent file when processing nested transclusions
- Security: Path traversal protection prevents access outside base directory
- Test coverage: See `tests/resolver.test.ts`