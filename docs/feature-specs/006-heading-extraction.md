---
id: 006
title: "Heading-Specific Transclusion"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Ability to transclude specific sections of a document by referencing headings, allowing fine-grained content reuse without duplicating entire files.

## User Story

As a documentation author, I want to embed specific sections of files so that I can reuse parts of documents without duplication.

## Acceptance Criteria

- [ ] Support `![[file#heading]]` syntax
- [ ] Match headings case-insensitively
- [ ] Extract content from heading until next heading of same or higher level
- [ ] Handle headings with special characters and spaces
- [ ] Error gracefully when heading not found

## Notes

- Example: `![[api-reference#Authentication]]` includes only Authentication section
- Should support all heading levels (h1-h6)
- Consider supporting heading ranges: `![[file#start:end]]`
- Related to existing `headingExtractor.ts` utility