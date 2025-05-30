---
id: 011
title: "Line Range Selection"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Ability to transclude specific line ranges from files, enabling precise content extraction without relying on heading structure.

## User Story

As a code documentation author, I want to include specific line ranges from files so that I can embed code snippets or specific paragraphs without including entire sections.

## Acceptance Criteria

- [ ] Support `![[file:10-20]]` syntax for line ranges
- [ ] Support `![[file:10]]` for single line
- [ ] Support `![[file:10-]]` for "from line 10 to end"
- [ ] Support `![[file:-20]]` for "from start to line 20"
- [ ] Clear error messages for invalid ranges

## Notes

- Line numbers should be 1-based (matching editor conventions)
- Consider supporting relative line numbers: `![[file:+5]]` for 5 lines after current
- Could combine with heading syntax: `![[file#heading:1-5]]`
- Performance consideration: Avoid loading entire file if possible
- Test coverage needed for edge cases (empty files, out of bounds)