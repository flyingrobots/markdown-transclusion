---
id: 006
title: "Heading-Specific Transclusion"
status: implemented
updated: 2025-01-13T00:00:00Z
---

## Overview

Ability to transclude specific sections of a document by referencing headings, allowing fine-grained content reuse without duplicating entire files.

## User Story

As a documentation author, I want to embed specific sections of files so that I can reuse parts of documents without duplication.

## Acceptance Criteria

- [x] Support `![[file#heading]]` syntax
- [x] Match headings case-insensitively
- [x] Extract content from heading until next heading of same or higher level
- [x] Handle headings with special characters and spaces
- [x] Error gracefully when heading not found

## Notes

- Example: `![[api-reference#Authentication]]` includes only Authentication section
- Should support all heading levels (h1-h6)
- Consider supporting heading ranges: `![[file#start:end]]`
- Related to existing `headingExtractor.ts` utility

## Implementation Details

The heading-specific transclusion feature has been implemented with the following components:

1. **Parser Support** (`parser.ts` and `parserUtils.ts`):
   - The `findTransclusionTokens` function already parses the `#heading` syntax
   - Tokens include optional `heading` property when `#` is present

2. **Heading Extraction** (`headingExtractor.ts`):
   - `extractHeadingContent()` - Extracts content from a specific heading to the next same/higher level heading
   - `hasHeadingAnchor()` - Checks if a reference includes a heading anchor
   - `splitReference()` - Splits reference into path and heading parts
   - Case-insensitive matching implemented
   - Handles special characters and spaces in headings

3. **Processing Integration** (`transclusionProcessor.ts`):
   - `readResolvedRefs()` integrates heading extraction after file content is read
   - Returns `HEADING_NOT_FOUND` error when heading doesn't exist
   - Maintains same error handling patterns as other transclusion errors

4. **Test Coverage**:
   - Unit tests for `headingExtractor.ts` functions
   - Unit tests for `transclusionProcessor.readResolvedRefs()` with heading extraction
   - Integration tests in `heading-transclusion.test.ts` covering:
     - Basic heading extraction
     - Nested headings
     - Case-insensitive matching
     - Error handling for missing headings
     - Special characters in headings
     - Recursive transclusions with headings
     - Performance with large documents