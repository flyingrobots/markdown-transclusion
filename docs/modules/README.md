# Module Documentation

This directory contains comprehensive documentation for all TypeScript modules in the `src/` directory of the markdown-transclusion project.

## Documentation Structure

Each module documentation file follows a consistent template with the following sections:

1. **Overview** - Brief description and purpose
2. **Rationale** - Why this module exists and what problems it solves
3. **Architecture** - Design details and internal structure
4. **Dependencies** - Module dependencies and relationships
5. **API Reference** - Exported functions, classes, and types
6. **Data Flow** - How data moves through the module
7. **Class Diagrams** - Visual representation of classes and relationships
8. **Error Handling** - Error types and handling strategies
9. **Performance Considerations** - Performance characteristics and optimizations
10. **Test Coverage** - Test scenarios and validation plans

## Module Categories

### Core Modules
- [index.ts](./index.md) - Main API entry point
- [transclude.ts](./transclude.md) - Core transclusion functionality
- [parser.ts](./parser.md) - Transclusion reference parsing
- [resolver.ts](./resolver.md) - Path resolution logic
- [stream.ts](./stream.md) - Streaming interface

### Infrastructure Modules
- [fileReader.ts](./fileReader.md) - File reading operations
- [fileCache.ts](./fileCache.md) - File caching implementations
- [security.ts](./security.md) - Security validation
- [types.ts](./types.md) - TypeScript type definitions

### CLI Modules
- [cli.ts](./cli.md) - Command-line interface entry point
- [cliCore.ts](./cliCore.md) - Core CLI functionality

### Utility Modules
- [utils/LineTranscluder.ts](./utils/LineTranscluder.md) - Line-based transclusion processor
- [utils/cliArgs.ts](./utils/cliArgs.md) - CLI argument parsing
- [utils/contentProcessing.ts](./utils/contentProcessing.md) - Content manipulation utilities
- [utils/extensionResolver.ts](./utils/extensionResolver.md) - File extension resolution
- [utils/fileValidation.ts](./utils/fileValidation.md) - File validation utilities
- [utils/headingExtractor.ts](./utils/headingExtractor.md) - Markdown heading extraction
- [utils/logger.ts](./utils/logger.md) - Logging utilities
- [utils/outputFormatter.ts](./utils/outputFormatter.md) - Output formatting
- [utils/parserUtils.ts](./utils/parserUtils.md) - Parser helper functions
- [utils/pathResolution.ts](./utils/pathResolution.md) - Path resolution utilities
- [utils/pathTokens.ts](./utils/pathTokens.md) - Variable substitution
- [utils/result.ts](./utils/result.md) - Result type utilities
- [utils/safeFileReader.ts](./utils/safeFileReader.md) - Safe file reading
- [utils/transclusionProcessor.ts](./utils/transclusionProcessor.md) - Transclusion processing logic

## Mermaid Diagrams

All documentation includes Mermaid diagrams for visual representation of:
- Class hierarchies and relationships
- Data flow through the system
- Module dependencies
- Error handling flows

## Test Coverage Guidelines

Each module documentation includes comprehensive test plans that cover:
- Unit test scenarios
- Integration test requirements
- Edge cases and error conditions
- Performance benchmarks where applicable