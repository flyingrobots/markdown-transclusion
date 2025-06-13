# markdown-transclusion Documentation

This directory contains comprehensive documentation for the markdown-transclusion library.

## Documentation Structure

- **[API Reference](api.md)** - Complete API documentation with examples
- **[Contributing Guide](contributing.md)** - Development setup and contribution guidelines
- **[Technical Design](tech-plan.md)** - Architecture, design decisions, and implementation details
- **[Feature Specifications](feature-specs/)** - Detailed specifications for all features

## Feature Roadmap

The following table provides an overview of all features and their current status:

| ID | Feature Title | Status | Description |
|----|--------------|--------|-------------|
| 001 | [Basic Transclusion Resolution](feature-specs/001-basic-transclusion.md) | ✅ implemented | Core `![[filename]]` syntax support |
| 002 | [Recursive Transclusion](feature-specs/002-recursive-transclusion.md) | ✅ implemented | Nested transclusions with cycle detection |
| 003 | [Path Resolution](feature-specs/003-path-resolution.md) | ✅ implemented | Flexible path and extension handling |
| 004 | [Error Handling & Debugging](feature-specs/004-error-handling.md) | ✅ implemented | Comprehensive error reporting |
| 005 | [Variable Substitution](feature-specs/005-variable-substitution.md) | ✅ implemented | Dynamic `{{variable}}` replacement |
| 006 | [Heading-Specific Transclusion](feature-specs/006-heading-extraction.md) | ✅ implemented | Extract specific sections via `#heading` |
| 007 | [Wiki-Style Transclusion Syntax](feature-specs/007-wiki-style-syntax.md) | 🔄 planned | MediaWiki `{{filename}}` compatibility |
| 008 | [Auto-Fix Suggestions](feature-specs/008-auto-fix-suggestions.md) | 🔄 planned | Smart error recovery suggestions |
| 009 | [Per-File Configuration](feature-specs/009-per-file-config.md) | 🔄 planned | Frontmatter-based settings |
| 010 | [Mermaid Diagram Validation](feature-specs/010-diagram-validation.md) | 🔄 planned | Validate embedded diagrams |
| 011 | [Line Range Selection](feature-specs/011-line-range-selection.md) | 🔄 planned | Include specific line ranges |
| 012 | [Transclusion Aliases](feature-specs/012-transclusion-aliases.md) | 🔄 planned | Reusable path shortcuts |
| 013 | [Conditional Content Blocks](feature-specs/013-conditional-blocks.md) | 🔄 planned | IF/ELSE content logic |

## Quick Links

### For Users
- [Installation & Quick Start](../README.md#installation)
- [CLI Usage](../README.md#cli-usage)
- [Transclusion Syntax](../README.md#transclusion-syntax)
- [Examples](../examples/basic/)

### For Developers
- [Development Setup](contributing.md#development-setup)
- [Testing Strategy](contributing.md#testing-strategy)
- [Architecture Overview](tech-plan.md#architecture--design)
- [Security Model](tech-plan.md#security-model)

### For Contributors
- [Code Style Guide](contributing.md#code-style)
- [Pull Request Process](contributing.md#pull-request-process)
- [Adding New Features](contributing.md#adding-new-features)
- [Feature Specification Template](feature-specs/)

## Documentation Principles

1. **Modular Structure**: Each feature has its own specification file
2. **Clear Status Tracking**: Implemented vs planned features are clearly marked
3. **User Story Driven**: Features defined by user needs and acceptance criteria
4. **Cross-Referenced**: Extensive linking between related documentation
5. **Example-Rich**: Code examples and usage scenarios throughout

## Updating Documentation

When implementing a new feature:
1. Update the feature spec status from `planned` to `implemented`
2. Add the current ISO timestamp to the `updated` field
3. Check off completed acceptance criteria
4. Update this README's roadmap table
5. Add any relevant implementation notes

When planning a new feature:
1. Create a new spec file with the next available ID number
2. Use the standard template structure
3. Set status as `planned` or `experimental`
4. Add to the roadmap table in this README
5. Link from relevant sections in other docs