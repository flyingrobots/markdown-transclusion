# Contributing to markdown-transclusion

Thank you for your interest in contributing to markdown-transclusion! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 16+ (for modern stream APIs)
- npm or yarn
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/markdown-transclusion.git
   cd markdown-transclusion
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run tests to verify setup:
   ```bash
   npm test
   ```

## Project Structure

```
markdown-transclusion/
├── src/                    # Source code
│   ├── index.ts           # Main exports
│   ├── stream.ts          # Transform stream implementation
│   ├── parser.ts          # Transclusion syntax parser
│   ├── resolver.ts        # Path resolution logic
│   ├── fileReader.ts      # File reading with validation
│   ├── security.ts        # Security checks
│   ├── cli.ts            # CLI entry point
│   └── utils/            # Utility modules
│       ├── LineTranscluder.ts      # Core processing logic
│       ├── transclusionProcessor.ts # Reference processing
│       ├── pathTokens.ts           # Variable substitution
│       ├── extensionResolver.ts    # File extension handling
│       └── headingExtractor.ts     # Heading extraction
├── tests/                  # Test files
│   ├── fixtures/          # Test markdown files
│   ├── mocks/            # Mock implementations
│   ├── integration/      # Integration tests
│   └── utils/            # Utility tests
├── docs/                  # Documentation
└── dist/                  # Compiled output
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- parser.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Building

```bash
# Build TypeScript
npm run build

# Build in watch mode
npm run build:watch
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Testing Strategy

### Unit Tests

Each module should have comprehensive unit tests covering:
- Happy path scenarios
- Error conditions
- Edge cases
- Security concerns

Example test structure:
```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal input', () => {
      // Test implementation
    });
    
    it('should handle edge case', () => {
      // Test implementation
    });
    
    it('should throw on invalid input', () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

Integration tests verify end-to-end functionality:
- Stream processing
- CLI behavior
- File system operations
- Error propagation

### Mock Infrastructure

Use the provided mock utilities for isolated testing:

```typescript
import { setupTestEnv } from './tests/utils/testEnvironment';
import { MockFileSystem, MockLogger } from './tests/mocks';

const env = setupTestEnv()
  .withFiles({
    '/test/main.md': '# Main\n![[section]]',
    '/test/section.md': '## Content'
  })
  .build();
```

## Code Style

### TypeScript Guidelines

- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use enums for error codes and constants
- Document public APIs with JSDoc comments

### Naming Conventions

- **Files**: camelCase (e.g., `lineTranscluder.ts`)
- **Classes**: PascalCase (e.g., `TransclusionTransform`)
- **Functions**: camelCase (e.g., `processLine`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DEPTH`)
- **Interfaces**: PascalCase with descriptive names

### Error Handling

- Use custom error types with error codes
- Provide helpful error messages
- Include context (file path, line number)
- Follow the Result pattern where appropriate

```typescript
if (!file.exists) {
  return {
    error: {
      message: `File not found: ${path}`,
      path,
      code: 'FILE_NOT_FOUND'
    }
  };
}
```

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): description

feat(parser): add support for heading extraction
fix(stream): correct newline handling in output
docs(api): update transclude function examples
test(resolver): add tests for circular references
refactor(types): rename FileCacheEntry to CachedFileContent
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

### Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes following the code style

3. Add/update tests for your changes

4. Ensure all tests pass:
   ```bash
   npm test
   npm run lint
   ```

5. Update documentation if needed

6. Commit your changes with descriptive messages

7. Push to your fork and create a Pull Request

8. Provide a clear PR description:
   - What problem does it solve?
   - What changes were made?
   - Any breaking changes?

### PR Review Checklist

Before submitting, ensure:
- [ ] Tests pass locally
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] No linting errors
- [ ] Commit messages follow convention
- [ ] PR description is complete

## Security Considerations

When contributing, keep security in mind:

- Never allow path traversal outside base directory
- Validate all user input
- Be careful with file system operations
- Don't expose sensitive information in errors
- Test security constraints aren't bypassed

## Performance Guidelines

- Use streams for file operations
- Avoid loading entire files into memory
- Cache strategically, not by default
- Profile before optimizing
- Consider memory usage for deep recursion

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

Thank you for contributing!