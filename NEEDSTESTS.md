# Test Coverage Needs

Based on the coverage report, here are the areas that need additional test coverage to reach 95% thresholds:

## Critical Files Needing Tests

### 1. `src/cli.ts` (0% coverage)
- [ ] Test help display (`--help`, `-h`)
- [ ] Test version display (`--version`, `-v`)
- [ ] Test reading from stdin
- [ ] Test reading from file
- [ ] Test writing to stdout
- [ ] Test writing to output file
- [ ] Test error handling for missing files
- [ ] Test strict mode exit codes
- [ ] Test validate-only mode
- [ ] Test variable substitution via CLI
- [ ] Test base path option
- [ ] Test log level options

### 2. `src/utils/logger.ts` (15.25% coverage)
**Uncovered lines: 36-72, 80-107, 115-172, 187-197**
- [ ] Test LoggerFactory creation
- [ ] Test different log levels (ERROR, WARN, INFO, DEBUG)
- [ ] Test log level filtering
- [ ] Test formatted output with colors
- [ ] Test error logging with stack traces
- [ ] Test info and debug message formatting
- [ ] Test timestamp formatting
- [ ] Test logger instance management

### 3. `src/utils/result.ts` (39.28% coverage)
**Uncovered lines: 27, 34, 44-47, 57-60, 70-73, 80-83, 90-93**
- [ ] Test Result.ok() creation
- [ ] Test Result.error() creation
- [ ] Test map() transformation
- [ ] Test flatMap() transformation
- [ ] Test mapError() transformation
- [ ] Test unwrap() method
- [ ] Test unwrapOr() method
- [ ] Test match() pattern matching

### 4. `src/utils/transclusionProcessor.ts` (64.44% coverage)
**Uncovered lines: 54-108, 138**
- [ ] Test processVariables() with nested variables
- [ ] Test processVariables() with circular references
- [ ] Test processVariables() with missing variables
- [ ] Test formatBytes() helper function
- [ ] Test performance metrics calculation
- [ ] Test error accumulation during processing

### 5. `src/utils/LineTranscluder.ts` (83.33% coverage)
**Uncovered lines: 61-67, 101-112**
- [ ] Test max file size limit enforcement
- [ ] Test performance tracking and metrics
- [ ] Test memory usage tracking
- [ ] Test cache hit/miss statistics

### 6. `src/utils/safeFileReader.ts` (85.1% coverage)
**Uncovered lines: 80-90, 117, 150-160**
- [ ] Test Windows path normalization
- [ ] Test path traversal with backslashes
- [ ] Test BOM handling for different encodings
- [ ] Test file size validation edge cases

### 7. `src/fileCache.ts` (86.95% coverage)
**Uncovered lines: 9-25**
- [ ] Test MemoryFileCache implementation
- [ ] Test cache expiration
- [ ] Test cache size limits
- [ ] Test concurrent access patterns

### 8. `src/utils/cliArgs.ts` (89.92% coverage)
**Uncovered lines: 54, 117-118, 141, 154, 167, 189, 211, 258, 270, 291-292, 300**
- [ ] Test error messages for invalid arguments
- [ ] Test multiple variable parsing
- [ ] Test conflicting options
- [ ] Test default values

### 9. `src/stream.ts` (90.9% coverage)
**Uncovered lines: 37, 48, 58**
- [ ] Test stream error handling
- [ ] Test transform stream edge cases
- [ ] Test backpressure handling

### 10. Minor Coverage Gaps

#### `src/utils/pathTokens.ts` (91.22% coverage)
**Uncovered lines: 120-130**
- [ ] Test complex nested variable substitution

#### `src/utils/fileValidation.ts` (92.59% coverage)
**Uncovered lines: 40, 64**
- [ ] Test binary file detection edge cases

#### `src/resolver.ts` (97.36% coverage)
**Uncovered lines: 80**
- [ ] Test heading resolution error case

#### `src/security.ts` (94.23% coverage)
**Uncovered lines: 27-31**
- [ ] Test path validation error messages

#### `src/utils/contentProcessing.ts` (85.71% coverage)
**Uncovered lines: 16, 21**
- [ ] Test line ending normalization edge cases

## Integration Tests Needed

### CLI Integration Tests
- [ ] Test piping with other commands
- [ ] Test signal handling (SIGINT, SIGTERM)
- [ ] Test large file processing
- [ ] Test concurrent file access
- [ ] Test with symbolic links
- [ ] Test with different file encodings

## Property-Based Tests Needed

### Additional Edge Cases
- [ ] Test with extremely long file paths
- [ ] Test with unicode in file paths
- [ ] Test with special characters in headings
- [ ] Test with malformed transclusion syntax

## Performance Tests Needed

- [ ] Benchmark large file processing
- [ ] Test memory usage with circular references
- [ ] Test cache effectiveness
- [ ] Test streaming performance

## Priority Order

1. **High Priority** (blocking CI):
   - CLI tests (currently causing failures)
   - Logger tests (very low coverage)
   - Result utility tests (core functionality)

2. **Medium Priority** (core functionality):
   - TransclusionProcessor variable handling
   - SafeFileReader edge cases
   - Stream error handling

3. **Low Priority** (nice to have):
   - Performance metrics
   - Cache optimization tests
   - Integration test improvements