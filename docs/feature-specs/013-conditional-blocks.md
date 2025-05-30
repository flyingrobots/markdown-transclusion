---
id: 013
title: "Conditional Content Blocks"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Support for conditional inclusion of content blocks based on variables, enabling more sophisticated content variations beyond file-level conditions.

## User Story

As a technical writer, I want to conditionally include or exclude content blocks so that I can maintain single-source documentation for multiple audiences or environments.

## Acceptance Criteria

- [ ] Support `<!-- IF condition -->` and `<!-- ENDIF -->` markers
- [ ] Support basic operators: equals, not equals, exists
- [ ] Support `<!-- ELSE -->` and `<!-- ELSEIF -->` branches
- [ ] Nest conditions up to reasonable depth
- [ ] Strip conditional markers from output

## Notes

- Example syntax:
  ```markdown
  <!-- IF {{env}} == "production" -->
  ![[production-warning]]
  <!-- ELSEIF {{env}} == "staging" -->
  ![[staging-notice]]
  <!-- ELSE -->
  ![[dev-instructions]]
  <!-- ENDIF -->
  ```
- Security: Prevent code injection through conditions
- Performance: Compile conditions for repeated evaluation
- Consider inline syntax for simple conditions
- Integration with existing variable system