---
created: 2025-05-26T18:57
updated: 2025-01-29T12:00:00Z
---
# Technical Design Document: `markdown-transclusion`

## Executive Summary

**Package Name**: `markdown-transclusion`  
**Version**: 1.0.0  
**Purpose**: Stream-based library for resolving transclusion references in Markdown documents  
**Target Users**: Technical writers, documentation teams, knowledge management systems

markdown-transclusion is a focused, zero-dependency Node.js library that implements Obsidian-style transclusion syntax for composable documentation workflows. Built on Node.js streams for memory efficiency and designed with security-first principles, it enables modular content management while maintaining compatibility with standard Markdown toolchains.

## Problem Statement

Modern documentation workflows increasingly rely on modular, composable content structures. However, existing Markdown parsers and processors do not natively support transclusion - the ability to embed one document's content within another through reference syntax.

**Current Pain Points:**
- Manual copy-paste leads to content duplication and sync issues
- No standardized way to compose documents from modular components  
- Translation workflows require maintaining separate copies of shared content
- Version control becomes complex with duplicated content across files
- Obsidian's `![[transclusion]]` syntax is proprietary and not portable

## Solution Overview

A focused, single-purpose library that resolves transclusion references in Markdown documents, transforming modular source files into flattened output suitable for standard Markdown processors.

```mermaid
graph LR
    A["Source.md with ![[transclusions]]"] --> B["markdown-transclusion"] 
    B --> C["Flattened.md"]
    
    D["sections/intro.md"] --> B
    E["sections/conclusion.md"] --> B
    F["sections/nested.md"] --> B
```

----

# Global Architecture

## System Overview

The markdown-transclusion system follows a layered architecture optimized for streaming processing, modularity, and extensibility.

```mermaid
flowchart TB
    subgraph "Entry Points"
        CLI["CLI Interface<br/>(cli.ts)"]
        API["Programmatic API<br/>(index.ts)"]
        STREAM["Stream API<br/>(stream.ts)"]
    end
    
    subgraph "Core Processing Layer"
        TRANS["TransclusionTransform<br/>(Transform Stream)"]
        LINE["LineTranscluder<br/>(Line Processor)"]
        PROC["TransclusionProcessor<br/>(Reference Handler)"]
    end
    
    subgraph "Service Layer"
        PARSE["Parser<br/>(Syntax Detection)"]
        RESOLVE["Resolver<br/>(Path Resolution)"]
        SEC["Security<br/>(Path Validation)"]
        CACHE["FileCache<br/>(Performance)"]
    end
    
    subgraph "Utility Layer"
        PATH["Path Utils<br/>(Resolution)"]
        VAR["Variable Utils<br/>(Substitution)"]
        HEAD["Heading Utils<br/>(Extraction)"]
        ERR["Error Utils<br/>(Formatting)"]
    end
    
    subgraph "I/O Layer"
        READ["FileReader<br/>(Safe I/O)"]
        FS["Node.js fs<br/>(File System)"]
    end
    
    CLI --> TRANS
    API --> TRANS
    STREAM --> TRANS
    
    TRANS --> LINE
    LINE --> PROC
    
    PROC --> PARSE
    PROC --> RESOLVE
    PROC --> SEC
    PROC --> CACHE
    
    RESOLVE --> PATH
    RESOLVE --> VAR
    
    READ --> FS
    
    style TRANS fill:#fff3e0
    style LINE fill:#e3f2fd
    style SEC fill:#ffcdd2
```

## Component Architecture

### 1. Entry Point Layer

Three distinct entry points cater to different use cases:

- **CLI Interface** (`cli.ts`): Unix-style command-line tool with pipeline support
- **Programmatic API** (`index.ts`): High-level convenience functions
- **Stream API** (`stream.ts`): Low-level Transform stream for advanced integrations

### 2. Core Processing Engine

```mermaid
classDiagram
    class TransclusionTransform {
        -buffer: string
        -lineTranscluder: LineTranscluder
        +errors: TransclusionError[]
        +_transform(chunk, encoding, callback)
        +_flush(callback)
    }
    
    class LineTranscluder {
        -options: TransclusionOptions
        -visitedPaths: Set~string~
        -processedFiles: Set~string~
        +processLine(line): Promise~Result~
        +getProcessedFiles(): string[]
    }
    
    class TransclusionProcessor {
        +processTransclusions(line, options): Promise~ProcessResult~
        +readResolvedRefs(refs, options): Promise~RefContent[]~
        +composeLineOutput(line, contents): string
    }
    
    TransclusionTransform --> LineTranscluder
    LineTranscluder --> TransclusionProcessor
```

### 3. Service Components

Each service component has a single, well-defined responsibility:

- **Parser**: Identifies `![[reference]]` patterns using regex
- **Resolver**: Resolves file paths with security checks and extension inference
- **Security**: Validates paths against traversal attacks
- **FileCache**: Optional caching layer for performance optimization

### 4. Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Stream
    participant LineProc as Line Processor
    participant Parser
    participant Resolver
    participant Security
    participant FileReader
    participant Cache
    
    User->>Stream: Input markdown
    Stream->>LineProc: Process line
    LineProc->>Parser: Find transclusions
    
    alt Has transclusion
        Parser->>Resolver: Resolve path
        Resolver->>Security: Validate path
        Security->>Cache: Check cache
        
        alt Cache miss
            Cache->>FileReader: Read file
            FileReader->>Cache: Store content
        end
        
        Cache->>LineProc: Return content
        LineProc->>LineProc: Process recursively
    end
    
    LineProc->>Stream: Output line
    Stream->>User: Processed markdown
```

## Technology Stack

### Runtime Environment
- **Node.js 18.18.0+**: Required for modern stream APIs and native async/await
- **TypeScript 5.x**: Full type safety and modern JavaScript features
- **Zero Runtime Dependencies**: Enhanced security and minimal attack surface

### Development Stack
- **Jest**: Testing framework with coverage reporting
- **ESLint**: Code quality and consistency
- **TypeScript Compiler**: Build toolchain
- **Node.js Built-ins Only**: `fs`, `path`, `stream`, `crypto`

### Architecture Patterns
- **Transform Streams**: Memory-efficient processing
- **Async/Await**: Non-blocking I/O operations
- **Functional Core**: Pure functions for business logic
- **Dependency Injection**: Testable, modular design
- **Result Pattern**: Explicit error handling

## Design Principles & Rationale

### 1. Stream-First Architecture

**Principle**: Process documents as streams, never loading entire files into memory.

**Rationale**: 
- Handles files of any size with constant memory usage
- Enables real-time processing in CI/CD pipelines
- Compatible with Unix philosophy and shell pipelines
- Natural backpressure handling for slow consumers

### 2. Zero Dependencies

**Principle**: No external runtime dependencies.

**Rationale**:
- Minimizes security vulnerabilities
- Simplifies deployment and maintenance
- Faster installation in CI/CD environments
- Reduces supply chain attack vectors

### 3. Security by Design

**Principle**: All file access must be validated and sandboxed.

**Rationale**:
- Prevents directory traversal attacks
- Enforces base directory boundaries
- Validates all user input
- Clear security error codes for auditing

### 4. Progressive Enhancement

**Principle**: Core functionality works simply, advanced features are opt-in.

**Rationale**:
- Low barrier to entry for new users
- Performance optimizations only when needed
- Predictable default behavior
- Gradual learning curve

### 5. Explicit Error Handling

**Principle**: Errors are first-class citizens, not exceptions.

**Rationale**:
- Graceful degradation by default
- Detailed error context for debugging
- Machine-readable error codes
- Optional strict mode for CI/CD

### 6. Modular Composition

**Principle**: Small, focused modules with single responsibilities.

**Rationale**:
- Easier to test and maintain
- Enables feature toggles
- Supports tree shaking
- Clear dependency graph

----

# System Components

## Core Algorithm

The transclusion resolution algorithm processes input line-by-line, maintaining state for recursive processing and circular reference detection.

```mermaid
flowchart TD
    A["Input Line"] --> B{"Contains ![[ref]]?"}
    B -->|"No"| H["Output line as-is"]
    B -->|"Yes"| C["Parse all references"]
    
    C --> D["For each reference"]
    D --> VS["Variable Substitution<br/>{{lang}} → en"]
    VS --> E["Resolve file path"]
    E --> SEC["Security validation"]
    
    SEC --> F{"Path safe?"}
    F -->|"No"| ERR["Security error<br/>Add to errors[]"]
    F -->|"Yes"| G{"File exists?"}
    
    G -->|"No"| ERR2["File not found<br/>Add to errors[]"]
    G -->|"Yes"| CIRC{"Circular ref?"}
    
    CIRC -->|"Yes"| ERR3["Circular error<br/>Add to errors[]"]
    CIRC -->|"No"| CACHE{"Check cache"}
    
    CACHE -->|"Hit"| USE["Use cached content"]
    CACHE -->|"Miss"| READ["Read file content"]
    
    READ --> STORE["Store in cache<br/>(if enabled)"]
    STORE --> REC["Process recursively"]
    USE --> REC
    
    REC --> TRACK["Add to processedFiles[]"]
    TRACK --> COMP["Compose output"]
    
    ERR --> COMP
    ERR2 --> COMP
    ERR3 --> COMP
    H --> COMP
    
    COMP --> OUT["Return processed line"]
    
    style VS fill:#fff9c4
    style SEC fill:#ffcdd2
    style CACHE fill:#e1f5fe
    style ERR fill:#ffccbc
    style ERR2 fill:#ffccbc
    style ERR3 fill:#ffccbc
    style OUT fill:#c8e6c9
```

## Security Architecture

Security is enforced at multiple layers to prevent malicious file access:

```mermaid
flowchart TB
    A["User Input:<br/>![[../../secret.md]]"] --> B["Input Sanitization"]
    
    B --> B1["Remove null bytes"]
    B1 --> B2["Normalize Unicode"]
    B2 --> B3["Trim whitespace"]
    
    B3 --> C["Path Validation"]
    
    C --> C1{"Contains ../ ?"}
    C1 -->|"Yes"| D1["PATH_TRAVERSAL<br/>Error 1002"]
    
    C1 -->|"No"| C2{"Is absolute?"}
    C2 -->|"Yes"| D2["ABSOLUTE_PATH<br/>Error 1003"]
    
    C2 -->|"No"| C3{"Is UNC path?"}
    C3 -->|"Yes"| D3["UNC_PATH<br/>Error 1004"]
    
    C3 -->|"No"| E["Path Resolution"]
    
    E --> F["Resolve to absolute"]
    F --> G["Normalize path"]
    G --> H{"Within basePath?"}
    
    H -->|"No"| D4["OUTSIDE_BASE<br/>Error 1005"]
    H -->|"Yes"| I["✅ Path is safe"]
    
    style D1 fill:#ffcdd2
    style D2 fill:#ffcdd2
    style D3 fill:#ffcdd2
    style D4 fill:#ffcdd2
    style I fill:#c8e6c9
```

## Caching Architecture

The caching system is designed for performance while maintaining predictability:

```mermaid
flowchart LR
    subgraph "Cache Layer"
        direction TB
        INT["Cache Interface"]
        NOOP["NoopFileCache<br/>(Disabled)"]
        MEM["MemoryFileCache<br/>(In-Memory)"]
        CUSTOM["Custom Implementation<br/>(Redis, etc.)"]
    end
    
    subgraph "Auto-Enable Logic"
        A1["maxDepth > 1"] --> EN["Enable MemoryCache"]
        A2["Recursive refs"] --> EN
        A3["No user cache"] --> EN
    end
    
    subgraph "Size Management"
        CHECK["Check file size"]
        CHECK --> SM{"Size < maxEntry?"}
        SM -->|"Yes"| STORE["Store in cache"]
        SM -->|"No"| SKIP["Skip caching"]
    end
    
    INT --> NOOP
    INT --> MEM
    INT --> CUSTOM
    
    style INT fill:#e3f2fd
    style EN fill:#fff9c4
    style STORE fill:#c8e6c9
    style SKIP fill:#ffccbc
```

## Error Handling Architecture

Errors are accumulated and reported without interrupting processing flow:

```mermaid
classDiagram
    class TransclusionError {
        +message: string
        +path: string
        +line?: number
        +code?: string
    }
    
    class SecurityError {
        +code: number
        +message: string
    }
    
    class FileReaderError {
        +code: number
        +path: string
        +message: string
    }
    
    class ErrorAccumulator {
        -errors: TransclusionError[]
        +add(error): void
        +getErrors(): TransclusionError[]
        +hasErrors(): boolean
    }
    
    TransclusionError <|-- SecurityError
    TransclusionError <|-- FileReaderError
    ErrorAccumulator --> TransclusionError
```

----

# Feature Specifications

The following table provides an overview of all features, their implementation status, and links to detailed specifications.

| ID | Feature Title | Status | Specification |
|----|--------------|--------|---------------|
| 001 | [Basic Transclusion Resolution](feature-specs/001-basic-transclusion.md) | implemented | Core `![[filename]]` syntax support |
| 002 | [Recursive Transclusion](feature-specs/002-recursive-transclusion.md) | implemented | Nested transclusions with cycle detection |
| 003 | [Path Resolution](feature-specs/003-path-resolution.md) | implemented | Flexible path and extension handling |
| 004 | [Error Handling & Debugging](feature-specs/004-error-handling.md) | implemented | Comprehensive error reporting |
| 005 | [Variable Substitution](feature-specs/005-variable-substitution.md) | implemented | Dynamic `{{variable}}` replacement |
| 006 | [Heading-Specific Transclusion](feature-specs/006-heading-extraction.md) | planned | Extract sections via `#heading` |
| 007 | [Wiki-Style Transclusion Syntax](feature-specs/007-wiki-style-syntax.md) | planned | MediaWiki compatibility |
| 008 | [Auto-Fix Suggestions](feature-specs/008-auto-fix-suggestions.md) | planned | Smart error recovery |
| 009 | [Per-File Configuration](feature-specs/009-per-file-config.md) | planned | Frontmatter settings |
| 010 | [Mermaid Diagram Validation](feature-specs/010-diagram-validation.md) | planned | Validate diagrams |
| 011 | [Line Range Selection](feature-specs/011-line-range-selection.md) | planned | Line-based extraction |
| 012 | [Transclusion Aliases](feature-specs/012-transclusion-aliases.md) | planned | Path shortcuts |
| 013 | [Conditional Content Blocks](feature-specs/013-conditional-blocks.md) | planned | IF/ELSE logic |

## Feature Integration Architecture

Features are integrated through a plugin-like architecture:

```mermaid
flowchart TB
    subgraph "Feature Pipeline"
        REF["Reference Found"]
        
        subgraph "Feature Chain"
            F1["Variable Substitution<br/>(Feature 005)"]
            F2["Path Resolution<br/>(Feature 003)"]
            F3["Security Check"]
            F4["File Reading"]
            F5["Heading Extraction<br/>(Feature 006)"]
            F6["Recursive Processing<br/>(Feature 002)"]
        end
        
        OUT["Processed Content"]
    end
    
    REF --> F1
    F1 --> F2
    F2 --> F3
    F3 --> F4
    F4 --> F5
    F5 --> F6
    F6 --> OUT
    
    style F1 fill:#c8e6c9
    style F2 fill:#c8e6c9
    style F5 fill:#fff9c4
```

----

# API Design

The API is designed with progressive disclosure - simple use cases are simple, complex use cases are possible.

## API Layers

```mermaid
graph TB
    subgraph "High Level API"
        T1["transclude(markdown)"]
        T2["transcludeFile(path)"]
    end
    
    subgraph "Stream API"
        S1["createTransclusionStream()"]
        S2["new TransclusionTransform()"]
    end
    
    subgraph "Low Level API"
        L1["processLine()"]
        L2["parseTransclusionReferences()"]
        L3["resolvePath()"]
        L4["validatePath()"]
    end
    
    T1 --> S1
    T2 --> S1
    S1 --> S2
    S2 --> L1
    L1 --> L2
    L1 --> L3
    L3 --> L4
    
    style T1 fill:#e3f2fd
    style T2 fill:#e3f2fd
```

## Core Interfaces

```typescript
interface TransclusionOptions {
  basePath?: string;              // Base directory for resolution
  extensions?: string[];          // File extensions to try
  maxDepth?: number;              // Recursion limit
  variables?: Record<string, string>;  // Variable substitutions
  strict?: boolean;               // Fail on errors
  validateOnly?: boolean;         // Validation mode
  cache?: FileCache;              // Custom cache implementation
}

interface TransclusionResult {
  content: string;                // Processed content
  errors: TransclusionError[];    // Accumulated errors
  processedFiles: string[];       // All files processed
}

interface TransclusionError {
  message: string;                // Human-readable message
  path: string;                   // File that caused error
  line?: number;                  // Line number if applicable
  code?: string;                  // Machine-readable code
}
```

## Stream Processing

```typescript
// Primary stream interface
function createTransclusionStream(
  options?: TransclusionOptions
): TransclusionTransform;

// Transform stream with error accumulation
class TransclusionTransform extends Transform {
  errors: TransclusionError[];
  
  constructor(options?: TransclusionOptions);
  _transform(chunk: Buffer, encoding: string, callback: Function): void;
  _flush(callback: Function): void;
}
```

## CLI Interface

The CLI follows Unix conventions for seamless integration:

```bash
# Basic usage
markdown-transclusion input.md

# With options
markdown-transclusion input.md \
  --base-path ./docs \
  --variables "lang=en,version=2.0" \
  --output processed.md

# Pipeline usage
cat template.md | markdown-transclusion > output.md

# Validation mode
markdown-transclusion docs/**/*.md --validate-only
```

### CLI Architecture

```mermaid
flowchart LR
    subgraph "Input Sources"
        STDIN["stdin"]
        FILE["File argument"]
    end
    
    subgraph "CLI Core"
        ARGS["Argument Parser"]
        OPT["Options Builder"]
        EXEC["Executor"]
    end
    
    subgraph "Output Targets"
        STDOUT["stdout"]
        OUTFILE["Output file"]
        ERRORS["stderr"]
    end
    
    STDIN --> ARGS
    FILE --> ARGS
    ARGS --> OPT
    OPT --> EXEC
    EXEC --> STDOUT
    EXEC --> OUTFILE
    EXEC --> ERRORS
```

----

# Implementation Details

## Stream Processing Architecture

The stream implementation ensures memory efficiency and composability:

```mermaid
stateDiagram-v2
    [*] --> Buffering: Input chunk
    
    Buffering --> LineDetection: Complete line found
    Buffering --> Buffering: Incomplete line
    
    LineDetection --> ParseLine: Process line
    
    ParseLine --> CheckRefs: Has ![[ref]]
    ParseLine --> PassThrough: No transclusion
    
    CheckRefs --> ProcessRef: For each ref
    ProcessRef --> Substitute: Apply variables
    Substitute --> Resolve: Resolve path
    Resolve --> Validate: Security check
    
    Validate --> ReadFile: Valid path
    Validate --> ErrorComment: Invalid path
    
    ReadFile --> CheckCircular: Content loaded
    CheckCircular --> Recursive: Not circular
    CheckCircular --> ErrorComment: Circular ref
    
    Recursive --> ProcessRef: More refs
    Recursive --> ComposeOutput: Done
    
    PassThrough --> Output: Emit line
    ErrorComment --> Output: Emit with error
    ComposeOutput --> Output: Emit processed
    
    Output --> Buffering: More input
    Output --> [*]: Stream end
```

## Module Dependencies

```mermaid
graph TD
    subgraph "Public API"
        index["index.ts"]
        stream["stream.ts"]
        cli["cli.ts"]
    end
    
    subgraph "Core Modules"
        trans["transclude.ts"]
        parse["parser.ts"]
        resolve["resolver.ts"]
        sec["security.ts"]
        cache["fileCache.ts"]
        read["fileReader.ts"]
    end
    
    subgraph "Utilities"
        line["LineTranscluder.ts"]
        proc["transclusionProcessor.ts"]
        path["pathResolution.ts"]
        vars["pathTokens.ts"]
        head["headingExtractor.ts"]
    end
    
    index --> trans
    index --> stream
    stream --> line
    cli --> stream
    
    trans --> line
    line --> proc
    proc --> parse
    proc --> resolve
    proc --> read
    
    resolve --> path
    resolve --> vars
    resolve --> sec
    
    read --> cache
    
    style index fill:#e3f2fd
    style stream fill:#e3f2fd
    style cli fill:#e3f2fd
```

## Performance Characteristics

- **Memory**: O(1) - Constant memory usage via streaming
- **Time Complexity**: O(n*m) where n = lines, m = transclusions per line
- **I/O**: Async/non-blocking file operations
- **Cache Hit Rate**: Typically >90% for recursive documents
- **Throughput**: ~1GB/min on modern SSDs

## File Structure

```
markdown-transclusion/
├── src/
│   ├── index.ts              # Public API exports
│   ├── cli.ts                # CLI entry point
│   ├── stream.ts             # Transform stream implementation
│   ├── transclude.ts         # High-level convenience functions
│   ├── parser.ts             # Transclusion syntax parser
│   ├── resolver.ts           # Path resolution logic
│   ├── security.ts           # Security validation
│   ├── fileReader.ts         # Safe file I/O
│   ├── fileCache.ts          # Cache implementations
│   ├── types.ts              # TypeScript definitions
│   └── utils/
│       ├── LineTranscluder.ts      # Line-by-line processor
│       ├── transclusionProcessor.ts # Reference processor
│       ├── pathResolution.ts       # Path utilities
│       ├── pathTokens.ts           # Variable substitution
│       ├── headingExtractor.ts     # Heading extraction
│       ├── extensionResolver.ts    # Extension handling
│       ├── contentProcessing.ts    # Content manipulation
│       ├── logger.ts               # Logging utilities
│       └── result.ts               # Result type utilities
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── fixtures/             # Test documents
│   └── mocks/                # Test doubles
├── docs/
│   ├── README.md             # Documentation index
│   ├── api.md                # API reference
│   ├── contributing.md       # Contribution guide
│   ├── tech-plan.md          # This document
│   └── feature-specs/        # Feature specifications
├── examples/
│   └── basic/                # Usage examples
└── package.json
```

----

# Testing Strategy

## Test Architecture

```mermaid
graph TB
    subgraph "Test Pyramid"
        U["Unit Tests<br/>(~200 tests)"]
        I["Integration Tests<br/>(~50 tests)"]
        E["E2E Tests<br/>(~20 tests)"]
        P["Performance Tests<br/>(~10 tests)"]
    end
    
    subgraph "Test Types"
        U1["Module isolation"]
        U2["Edge cases"]
        U3["Error conditions"]
        
        I1["Stream composition"]
        I2["File operations"]
        I3["CLI behavior"]
        
        E1["Real documents"]
        E2["Complex scenarios"]
        E3["Security validation"]
        
        P1["Memory usage"]
        P2["Throughput"]
        P3["Recursion depth"]
    end
    
    U --> U1
    U --> U2
    U --> U3
    
    I --> I1
    I --> I2
    I --> I3
    
    E --> E1
    E --> E2
    E --> E3
    
    P --> P1
    P --> P2
    P --> P3
```

## Test Coverage Strategy

- **Unit Tests**: Each module tested in isolation with mocks
- **Integration Tests**: Real file system with controlled fixtures
- **Property-Based Tests**: Fuzzing for parser and security modules
- **Performance Tests**: Memory profiling and throughput benchmarks
- **Security Tests**: Penetration testing for path traversal

----

# Deployment & Operations

## Package Distribution

```mermaid
flowchart LR
    subgraph "Source"
        TS["TypeScript Source"]
        TESTS["Test Suite"]
        DOCS["Documentation"]
    end
    
    subgraph "Build"
        TSC["TypeScript Compiler"]
        JEST["Jest Test Runner"]
        LINT["ESLint"]
    end
    
    subgraph "Artifacts"
        JS["JavaScript (ES2022)"]
        DTS["Type Definitions"]
        MAP["Source Maps"]
    end
    
    subgraph "Distribution"
        NPM["npm Registry"]
        GH["GitHub Releases"]
        CDN["CDN (unpkg)"]
    end
    
    TS --> TSC
    TESTS --> JEST
    TS --> LINT
    
    TSC --> JS
    TSC --> DTS
    TSC --> MAP
    
    JS --> NPM
    DTS --> NPM
    JS --> GH
    JS --> CDN
```

## Integration Patterns

### CI/CD Pipeline Integration
```yaml
# GitHub Actions example
- name: Process documentation
  run: |
    npx markdown-transclusion docs/index.md \
      --variables "version=${{ github.ref_name }}" \
      --strict \
      --output dist/docs.md
```

### Build Tool Integration
```javascript
// Webpack loader example
module.exports = {
  module: {
    rules: [{
      test: /\.md$/,
      use: ['markdown-transclusion-loader']
    }]
  }
};
```

### API Integration
```typescript
// Express middleware example
app.use('/docs/:file', async (req, res) => {
  const result = await transcludeFile(
    path.join(DOCS_DIR, req.params.file),
    { variables: req.query }
  );
  
  if (result.errors.length > 0) {
    return res.status(400).json({ errors: result.errors });
  }
  
  res.type('text/markdown').send(result.content);
});
```

----

# Future Architecture Considerations

## Planned Architectural Enhancements

1. **Plugin System**: Enable third-party feature extensions
2. **Async Iterator API**: Support for async generators
3. **Worker Thread Support**: Parallel processing for large documents
4. **WebAssembly Module**: Browser-compatible version
5. **Language Server Protocol**: IDE integration support

## Scalability Roadmap

```mermaid
flowchart TB
    subgraph "Current (v1.x)"
        C1["Single-threaded"]
        C2["File-based"]
        C3["Node.js only"]
    end
    
    subgraph "Next (v2.x)"
        N1["Worker threads"]
        N2["Remote sources"]
        N3["Browser support"]
    end
    
    subgraph "Future (v3.x)"
        F1["Distributed processing"]
        F2["Real-time collaboration"]
        F3["AI-powered suggestions"]
    end
    
    C1 --> N1
    C2 --> N2
    C3 --> N3
    
    N1 --> F1
    N2 --> F2
    N3 --> F3
```

----

*This technical design document represents the foundational architecture for the markdown-transclusion library. It follows industry best practices for Node.js stream processing, security-first design, and modular architecture patterns.*