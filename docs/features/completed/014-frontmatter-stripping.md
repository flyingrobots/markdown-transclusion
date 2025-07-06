---
id: 014
title: "Frontmatter Stripping"
status: implemented
updated: 2025-01-06T12:00:00Z
---

## Overview

Optional removal of YAML/TOML frontmatter from both transcluded files and the outer document during processing, enabling clean content composition without metadata pollution.

## User Story

As a documentation maintainer, I want to strip frontmatter from included files and the main document so that my final output contains only the actual content without metadata blocks that are only relevant for individual file management.

## Acceptance Criteria

- [x] Detects YAML frontmatter (delimited by `---`)
- [x] Detects TOML frontmatter (delimited by `+++`)
- [x] Strips frontmatter from transcluded files when `stripFrontmatter` option is enabled
- [x] Strips frontmatter from the outer document when `stripFrontmatter` option is enabled
- [x] Preserves content integrity after frontmatter removal
- [x] CLI flag `--strip-frontmatter` enables this behavior
- [x] Handles edge cases: empty frontmatter, malformed frontmatter, missing closing delimiters
- [x] Maintains line numbers for error reporting accuracy

## Notes

- Frontmatter is detected only at the beginning of files (after optional BOM)
- YAML frontmatter: starts and ends with `---` on their own lines
- TOML frontmatter: starts and ends with `+++` on their own lines
- When frontmatter is malformed, it's left intact to avoid content corruption
- This feature works at the content processing level, affecting both API and CLI usage
- Test coverage: See `tests/utils/contentProcessing.test.ts` and integration tests