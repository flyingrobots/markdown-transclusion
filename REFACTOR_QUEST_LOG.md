# 🧭 Quest Log: The Next Refactors

*"Though SRP flows strong, Open/Closed and Liskov await their champion."*

---

## 🏰 Quest 1: Modularize resolvePath() ✅ COMPLETED!

**Current Sin**: ~~Path resolution logic is still somewhat tangled despite our SRP efforts.~~

### Tasks:
- [x] Extract variable substitution to `pathTokens.ts`
  - [x] Create token parser for `{{var}}` patterns
  - [x] Support nested variable resolution
  - [x] Handle edge cases (empty vars, circular refs)
- [x] Separate extension resolution into `extensionResolver.ts`
  - [x] Create extension matcher strategy
  - [x] Support custom extension priorities
  - [x] Add extension validation
- [x] Add tests for deep variable chaining edge cases
  - [x] Test recursive variable substitution
  - [x] Test circular reference detection
  - [x] Test max depth limits
- [x] Replace fallback logic with Result-based clarity
  - [x] Return `Result<string, VariableError>` for substitution
  - [x] Chain Results for clean error propagation

**Achievements**:
- Created `pathTokens.ts` with tokenization and recursive substitution
- Created `extensionResolver.ts` with Strategy pattern for extensibility
- Added 33 new tests covering all edge cases
- Resolver now follows Open/Closed Principle perfectly!

**Commit message**: `refactor(resolver): extract path tokens and extension resolution for Open/Closed principle`

---

## 🧙 Quest 2: Improve CLI Wizardry

**Current Sin**: CLI will have direct console access and no structured error handling.

### Tasks:
- [ ] Extract argument parsing to `cliArgs.ts`
  - [ ] Create `CliArgs` type with validation
  - [ ] Use Result type for parse errors
  - [ ] Support short and long flags
- [ ] Replace direct console.error with structured logger
  - [ ] Create `Logger` interface
  - [ ] Implement `ConsoleLogger` and `SilentLogger`
  - [ ] Support log levels (error, warn, info, debug)
- [ ] Write unit tests for all CLI argument combinations
  - [ ] Test conflicting flags
  - [ ] Test missing required args
  - [ ] Test help/version shortcuts
- [ ] Ensure output respects POSIX for piping
  - [ ] Stdout for content only
  - [ ] Stderr for errors/warnings
  - [ ] Exit codes follow conventions

**Commit message**: `refactor(cli): extract arg parsing and add structured logging`

---

## 🛠️ Quest 3: Rewrite processFiles() as an Orchestrator

**Current Sin**: File processing mixes coordination with implementation details.

### Tasks:
- [ ] Move file-globbing logic to `fileFinder.ts`
  - [ ] Create `FilePattern` type
  - [ ] Support glob patterns
  - [ ] Return `Result<FilePath[], GlobError>`
- [ ] Separate high-level orchestration from low-level I/O
  - [ ] Create `TransclusionOrchestrator` class
  - [ ] Use dependency injection for file ops
  - [ ] Implement strategy pattern for processing modes
- [ ] Ensure async flow is handled cleanly with Result types
  - [ ] Use `Promise<Result<T, E>>` throughout
  - [ ] Implement Result combinators for parallel ops
  - [ ] Add proper cancellation support

**Commit message**: `refactor(core): extract file orchestration following Open/Closed principle`

---

## 🧼 Quest 4: Purge Unused Types and Legacy Utilities

**Current Sin**: Dead code and vague naming plague the codebase.

### Tasks:
- [ ] Audit `/types` for unreferenced or redundant declarations
  - [ ] Run type coverage analysis
  - [ ] Remove unused exports
  - [ ] Consolidate duplicate types
- [ ] Rename vague names
  - [ ] `FileCacheEntry` → `CachedFileContent`
  - [ ] `ResolvedPath` → `FileResolution`
  - [ ] `ParsedReference` → `TransclusionToken`
- [ ] Remove all TODO comments that are lies
  - [ ] Audit all TODO/FIXME comments
  - [ ] Convert valid ones to GitHub issues
  - [ ] Delete the rest

**Commit message**: `refactor(types): remove dead code and clarify naming`

---

## 🪓 Side Quest: Build the Mockery Layer

**Glory Awaits**: A proper testing infrastructure worthy of our clean code.

### Tasks:
- [ ] Create `mocks/` with reusable file cache + file reader
  - [ ] `MockFileSystem` with in-memory files
  - [ ] `MockLogger` with assertion helpers
  - [ ] `MockClock` for time-based tests
- [ ] Abstract common test setups with `setupTestEnv()`
  - [ ] Create test fixture builder
  - [ ] Add fluent API for test setup
  - [ ] Support scenario-based testing
- [ ] Introduce snapshot testing for edge-case multiline transclusions
  - [ ] Add jest snapshots for complex outputs
  - [ ] Create visual diff tools
  - [ ] Document snapshot update process

**Commit message**: `test(mocks): add comprehensive mock layer and test utilities`

---

## 📊 Quest Metrics

- **Estimated Effort**: 
  - Quest 1: 4 hours
  - Quest 2: 6 hours
  - Quest 3: 5 hours
  - Quest 4: 2 hours
  - Side Quest: 4 hours

- **Risk Level**:
  - 🟢 Low: Quest 4 (cleanup)
  - 🟡 Medium: Quests 1, 2, Side Quest
  - 🔴 High: Quest 3 (orchestration rewrite)

---

*"Code clean, test often, and may your refactors be ever backwards-compatible."*

**Ready to begin? Choose your quest!**