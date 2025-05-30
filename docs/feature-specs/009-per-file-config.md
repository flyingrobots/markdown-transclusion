---
id: 009
title: "Per-File Configuration"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Support for file-specific transclusion settings through frontmatter or inline directives, allowing fine-tuned control over processing behavior.

## User Story

As a documentation team lead, I want to configure transclusion behavior per file so that different documents can have appropriate processing rules.

## Acceptance Criteria

- [ ] Read configuration from YAML frontmatter
- [ ] Support inline configuration comments
- [ ] Override global settings at file level
- [ ] Configure max depth, extensions, base path per file
- [ ] Security: Validate and sanitize configuration values

## Notes

- Example frontmatter:
  ```yaml
  ---
  transclusion:
    maxDepth: 3
    basePath: ./includes
    strict: true
  ---
  ```
- Consider `.transclusionrc` files for directory-level config
- Security implications: Prevent path traversal via config
- Cache configuration parsing for performance