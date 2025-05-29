# System Architecture

## Overview

The markdown-transclusion system is built on a modular architecture with clear separation of concerns:

```mermaid
graph TB
    subgraph "Input Layer"
        A["CLI Arguments"] --> B["CLI Core"]
        C["File Input"] --> D["Stream Transform"]
        E["String Input"] --> F["Convenience Functions"]
    end
    
    subgraph "Processing Core"
        B --> G["LineTranscluder"]
        D --> G
        F --> G
        
        G --> H["Parser"]
        H --> I["Resolver"]
        I --> J["File Reader"]
        J --> K["Security Validator"]
        K --> G
    end
    
    subgraph "Output Layer"
        G --> L["Error Accumulator"]
        G --> M["Content Composer"]
        L --> N["Error Comments"]
        M --> O["Final Output"]
    end
    
    style G fill:#fff3e0
    style K fill:#ffcdd2
    style O fill:#c8e6c9
```

## Components

### Parser
Identifies transclusion syntax patterns in the markdown text.

### Resolver
Resolves file paths and handles path security validation.

### File Reader
Reads file contents with support for caching and error handling.

### Transcluder
Orchestrates the transclusion process with recursive processing.

### Stream
Provides efficient line-by-line processing for large files.

## Data Flow

1. Input markdown is processed line by line
2. Each line is parsed for transclusion references
3. References are resolved to file paths
4. Files are read and processed recursively
5. Content is composed and output

## Security Model

All file access is restricted to the configured base path to prevent unauthorized file access.