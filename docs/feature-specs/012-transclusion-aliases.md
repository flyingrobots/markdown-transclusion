---
id: 012
title: "Transclusion Aliases"
status: planned
updated: 2024-01-29T12:00:00Z
---

## Overview

Support for defining reusable aliases for complex transclusion paths, reducing repetition and improving maintainability.

## User Story

As a documentation maintainer, I want to define aliases for frequently used transclusion paths so that I can simplify references and make refactoring easier.

## Acceptance Criteria

- [ ] Define aliases in frontmatter or config file
- [ ] Use aliases with `![[&alias-name]]` syntax
- [ ] Support parameterized aliases with variables
- [ ] Validate alias definitions for circular references
- [ ] Clear error messages for undefined aliases

## Notes

- Example frontmatter:
  ```yaml
  aliases:
    api-intro: "api/v2/introduction"
    footer: "shared/footers/{{lang}}-footer"
  ```
- Usage: `![[&api-intro]]` instead of `![[api/v2/introduction]]`
- Consider scope: file-level vs project-level aliases
- Integration with VS Code for autocomplete
- Migration tool to convert paths to aliases