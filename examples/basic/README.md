# Basic Transclusion Example

This directory contains a complete example of using markdown-transclusion to build modular documentation.

## Structure

```
basic/
├── main.md                 # Main document with transclusions
├── sections/              
│   ├── intro.md           # Introduction content
│   ├── quickstart.md      # Getting started guide
│   ├── features-en.md     # Features in English
│   ├── features-es.md     # Features in Spanish
│   ├── architecture.md    # Architecture with headings
│   ├── api.md            # API documentation
│   ├── contributing.md    # Contribution guide
│   └── examples.md       # Usage examples
└── README.md             # This file
```

## Running the Example

### Basic Processing

Process the main document:

```bash
npx markdown-transclusion main.md
```

### With English Features

```bash
npx markdown-transclusion main.md --variables lang=en
```

### With Spanish Features

```bash
npx markdown-transclusion main.md --variables lang=es
```

### Output to File

```bash
npx markdown-transclusion main.md --variables lang=en --output output-en.md
npx markdown-transclusion main.md --variables lang=es --output output-es.md
```

### Validate Only

Check that all references are valid:

```bash
npx markdown-transclusion main.md --validate-only --strict
```

## What This Demonstrates

1. **Basic Transclusion**: Including entire files with `![[filename]]`
2. **Nested Transclusion**: The quickstart.md file includes examples.md
3. **Variable Substitution**: Different language versions with `{{lang}}`
4. **Heading Extraction**: Including specific sections with `#heading`
5. **Path Resolution**: Files in subdirectories
6. **Error Handling**: References to non-existent files show error comments

## Try It Yourself

1. Edit any of the section files and re-run the command
2. Add a new section file and include it in main.md
3. Create a new language version of features (e.g., features-fr.md)
4. Add more headings to architecture.md and reference them specifically

## Integration Ideas

- Use in a build script to generate documentation
- Set up a watch task to rebuild on changes
- Integrate with a static site generator
- Use in CI/CD to validate documentation structure

## Troubleshooting

If you see "Error: File not found" messages:
- Check that you're running the command from the `examples/basic/` directory
- Verify file names match exactly (case-sensitive)
- Ensure the --base-path is set correctly if running from elsewhere

For more help, see the [main documentation](https://github.com/flyingrobots/markdown-transclusion).