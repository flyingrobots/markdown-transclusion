---
id: 007
title: "Wiki-Style Transclusion Syntax"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Alternative transclusion syntax using MediaWiki-style double curly braces for compatibility with existing wiki-based documentation systems.

## User Story

As a wiki documentation maintainer, I want to use familiar `{{filename}}` syntax so that I can migrate existing wiki content without extensive rewrites.

## Acceptance Criteria

- [ ] Support `{{filename}}` as alternative to `![[filename]]`
- [ ] Support `{{:path/to/file}}` for namespaced includes
- [ ] Configurable syntax preference (Obsidian, Wiki, or both)
- [ ] Clear parsing to avoid conflicts with variable substitution
- [ ] Maintain feature parity with Obsidian syntax

## Notes

- Must not conflict with existing `{{variable}}` substitution
- Consider prefix for wiki transclusions: `{{:filename}}` vs `{{filename}}`
- May require parser mode configuration
- Migration tool could convert between syntaxes