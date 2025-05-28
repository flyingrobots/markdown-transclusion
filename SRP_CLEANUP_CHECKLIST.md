# 🧹 SRP CLEANUP CHECKLIST — For Yung Claudious, Keeper of Cohesion

Welcome to your rite of passage, young dev.

This checklist identifies and breaks down areas in the codebase where the Single Responsibility Principle (SRP) is being violated. Your task is to refactor, delegate, or isolate responsibilities cleanly.

🧠 **Rule of thumb**: If you need to mock or spy to test a behavior… it's probably doing too much.

---

## ✅ readFile() & readFileSync()

~~Currently mixing file I/O with content processing and error handling.~~ **COMPLETED!**

- [x] Separate reading from trimming
- [x] Separate reading from error handling  
- [x] Make a `safeReadFile(path: string): Result<string, FileReadError>` that doesn't throw
- [x] Move trimming logic to caller (e.g. `processLine`)

**Files modified:**
- `src/fileReader.ts` - Refactored to use extracted functions
- `src/utils/result.ts` - Result type for functional error handling
- `src/utils/fileValidation.ts` - Pure validation functions
- `src/utils/contentProcessing.ts` - Pure content processing functions  
- `src/utils/safeFileReader.ts` - Result-based file reading
- Tests: `tests/fileReader.test.ts` - All tests still pass ✅

**Status:** ✅ COMPLETED

---

## ✅ processLine()

~~Currently doing way too much. Break it up.~~ **COMPLETED!**

- [x] Extract `parseAndResolveRefs()` to find and resolve all transclusion references
- [x] Extract `readResolvedRefs()` to read content from resolved paths
- [x] Extract `composeLineOutput()` to merge original line with transcluded content
- [x] Move error aggregation outside or encapsulate in its own result type

**Files modified:**
- `src/transclude.ts` - Refactored to use extracted functions
- `src/utils/transclusionProcessor.ts` - New file with pure functions
- Tests: `tests/transclude.test.ts` - All tests still pass ✅
- Tests: `tests/utils/transclusionProcessor.test.ts` - New unit tests for extracted functions ✅

**Status:** ✅ COMPLETED

---

## ✅ TransclusionTransform

~~Currently violating SRP harder than a late-stage startup's monolith.~~ **COMPLETED!**

- [x] Extract a `TransclusionProcessor` or `LineTranscluder` class
- [x] Move the following into this helper class:
  - [x] Caching logic
  - [x] Path tracking
  - [x] Error tracking
  - [x] Content joining
- [x] Stream class should only manage flow control (`_transform`, `_flush`)

**Files modified:**
- `src/stream.ts` - Now only handles stream flow control
- `src/utils/LineTranscluder.ts` - Handles all business logic
- Tests: `tests/integration/stream.test.ts` - All tests still pass ✅
- Tests: `tests/utils/LineTranscluder.test.ts` - New unit tests ✅

**Status:** ✅ COMPLETED

---

## ✅ stream.test.ts Spy Abuse

Spying = code smell. *(Already completed with MockFileCache!)*

- [x] Remove `jest.spyOn(cache, 'get')` and `spySet`
- [x] Create a `MockFileCache` class with internal counters
- [x] Assert `mockCache.hits === n`, not internal method calls

**Status:** ✅ COMPLETED

---

## ✅ resolvePath() in resolver.ts

~~This function has multiple jobs crammed in.~~ **COMPLETED!**

- [x] Extract `substituteVariables(path, variables)` - Already extracted!
- [x] Extract `validatePath(path, basePath)` - Created validateReferencePath
- [x] Extract `normalizePath(path)` - Created normalizePath
- [x] Compose these functions explicitly - Now composed step-by-step

**Files modified:**
- `src/resolver.ts` - Refactored to use extracted functions
- `src/utils/pathResolution.ts` - New file with 7 pure functions
- Tests: `tests/resolver.test.ts` - All tests still pass ✅
- Tests: `tests/utils/pathResolution.test.ts` - New unit tests ✅

**Status:** ✅ COMPLETED

---

## ✅ parser.ts — parseTransclusionReferences()

~~Split out tokenization and reference building.~~ **COMPLETED!**

- [x] Split out:
  - [x] Tokenization (regex scan) - Created findTransclusionTokens
  - [x] Reference extraction (building `TransclusionReference[]`) - Created createReferenceFromToken
- [x] Add unit tests for both pieces independently

**Files modified:**
- `src/parser.ts` - Refactored to use extracted functions
- `src/utils/parserUtils.ts` - New file with 8 pure functions
- Tests: `tests/parser.test.ts` - All tests still pass ✅
- Tests: `tests/utils/parserUtils.test.ts` - 24 new unit tests ✅

**Status:** ✅ COMPLETED

---

## 🧼 Bonus SRP Polish

- [ ] Search for other `*.ts` files exporting multiple unrelated concerns
- [ ] Leave `// SRP: broken` where stuff is tangled and note in `CODE_REVIEW_TODO.md`
- [ ] Add any new utilities to `src/utils/` if reused

---

## 🏁 Completion Definition

- [ ] All refactored components are individually testable without mocks/spies
- [ ] At least 2 new pure helper functions created
- [ ] No class or function is longer than ~40 lines unless it's clearly cohesive
- [ ] Commit messages follow the format:
  ```
  refactor(core): extract XYZ from ABC to isolate SRP concerns
  ```

---

## 🔧 TEST DOUBLE TASKLIST (Optional Extension)

| Task | Description |
|------|-------------|
| [ ] | Refactor other modules (like `readFile`) to accept injected dependencies |
| [ ] | Replace existing spies in `*.test.ts` files with `TestDoubleFactory` mocks |
| [ ] | Write a failing test using `createThrowingFileCache` to validate error handling |
| [ ] | Extract an abstract `CacheTestSuite` that runs same behavior against real/mocked caches |
| [ ] | **Bonus**: Add a `TimedFakeFileCache` to simulate slow IO and test async behavior in streams |

---

Once this is done, Claudious will no longer be a mere coding intern. He shall be… **The Separator of Concerns**.

## Progress Tracking

### Completed
- ✅ MockFileCache implementation
- ✅ TestDoubleFactory pattern
- ✅ Removed jest spies from cache tests
- ✅ readFile() & readFileSync() SRP refactoring
- ✅ Created Result type for functional error handling
- ✅ Extracted pure validation and processing functions
- ✅ processLine() decomposition into pure functions
- ✅ TransclusionTransform separation (LineTranscluder extracted)
- ✅ resolvePath() separation into 7 composable functions
- ✅ parser.ts tokenization extraction into 8 pure functions
- ✅ Created 50+ pure, testable functions from previously tangled code
- ✅ Added 70+ new unit tests for extracted functions

### In Progress
- 🔄 None - All SRP tasks completed! 🎉

### Stats
- **Files refactored**: 6 major modules
- **New utility modules**: 9 focused files
- **Pure functions created**: 50+
- **New unit tests**: 70+
- **Code quality**: All functions < 40 lines with single responsibilities

---

*Last Updated: 2025-05-27*