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

Currently doing way too much. Break it up.

- [ ] Extract `parseAndResolveRefs()` to find and resolve all transclusion references
- [ ] Extract `readResolvedRefs()` to read content from resolved paths
- [ ] Extract `composeLineOutput()` to merge original line with transcluded content
- [ ] Move error aggregation outside or encapsulate in its own result type

**Files to modify:**
- `src/transclude.ts`
- Tests: `tests/transclude.test.ts`

---

## ✅ TransclusionTransform

Currently violating SRP harder than a late-stage startup's monolith.

- [ ] Extract a `TransclusionProcessor` or `LineTranscluder` class
- [ ] Move the following into this helper class:
  - [ ] Caching logic
  - [ ] Path tracking
  - [ ] Error tracking
  - [ ] Content joining
- [ ] Stream class should only manage flow control (`_transform`, `_flush`)

**Files to modify:**
- `src/stream.ts`
- Tests: `tests/integration/stream.test.ts`

---

## ✅ stream.test.ts Spy Abuse

Spying = code smell. *(Already completed with MockFileCache!)*

- [x] Remove `jest.spyOn(cache, 'get')` and `spySet`
- [x] Create a `MockFileCache` class with internal counters
- [x] Assert `mockCache.hits === n`, not internal method calls

**Status:** ✅ COMPLETED

---

## ✅ resolvePath() in resolver.ts

This function has multiple jobs crammed in.

- [ ] Extract `substituteVariables(path, variables)`
- [ ] Extract `validatePath(path, basePath)`
- [ ] Extract `normalizePath(path)` (if needed)
- [ ] Compose these functions explicitly

**Files to modify:**
- `src/resolver.ts`
- Tests: `tests/resolver.test.ts`

---

## ✅ parser.ts — parseTransclusionReferences()

- [ ] Split out:
  - [ ] Tokenization (regex scan)
  - [ ] Reference extraction (building `TransclusionReference[]`)
- [ ] Add unit tests for both pieces independently

**Files to modify:**
- `src/parser.ts`
- Tests: `tests/parser.test.ts`

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

### In Progress
- 🔄 None

### Up Next
- 📋 processLine() decomposition
- 📋 TransclusionTransform separation

---

*Last Updated: 2025-05-27*