### Core Features

- **Recursive Transclusion**: Included files can include other files
- **Circular Reference Detection**: Prevents infinite loops automatically
- **Heading Extraction**: Include only specific sections using `#heading`
- **Variable Substitution**: Dynamic file names with `{{variable}}` syntax
- **Stream Processing**: Efficient handling of large documents
- **Error Recovery**: Graceful handling of missing files

### Advanced Features

- Maximum depth control to prevent deep recursion
- Custom file extensions support
- Validation mode for CI/CD pipelines
- Comprehensive error reporting
- Path traversal protection for security