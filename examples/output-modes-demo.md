# Output Modes Demo

This document demonstrates the different output modes available in markdown-transclusion.

## Default Mode

By default, the tool follows the Unix principle of "silence is golden":

```bash
# Only errors are shown, content goes to stdout
markdown-transclusion document.md

# No output unless there's an error
markdown-transclusion document.md > output.md
```

## Verbose Mode

The `--verbose` flag provides detailed human-readable progress information:

```bash
# Shows detailed processing information
markdown-transclusion document.md --verbose

# Example output (to stderr):
# [INFO] Starting transclusion processing
# [INFO] Input: document.md
# [INFO] Reading file: chapters/chapter1.md
# [INFO] Reading file: chapters/chapter2.md
# [INFO] Processing complete
# [INFO] Files processed: 3
# [INFO] Transclusions resolved: 2
# [INFO] Warnings: 0
# [INFO] Errors: 0
# [INFO] Duration: 125ms
```

## Porcelain Mode

The `--porcelain` flag provides machine-readable output for scripting:

```bash
# Tab-separated values for easy parsing
markdown-transclusion document.md --porcelain

# Example output (to stderr):
# READ	chapters/chapter1.md
# READ	chapters/chapter2.md
# COMPLETE	3	2	0	0	125

# Parse errors in scripts:
markdown-transclusion document.md --porcelain 2>&1 | awk -F'\t' '$1=="ERROR" {print $3}'
```

## Progress Mode

The `--progress` flag shows real-time progress bars:

```bash
# Shows progress bar during processing
markdown-transclusion large-document.md --progress

# Example output (to stderr):
# Processing large-document.md...
# [████████████████████░░░░░░░░░░░░░░░░░░░] 50% Processing: chapter5.md
# ✓ Processing complete: 10 files, 8 transclusions (500ms)
```

## Combining with Other Options

All output modes work with existing options:

```bash
# Verbose validation
markdown-transclusion docs.md --validate-only --verbose

# Porcelain dry run
markdown-transclusion template.md --dry-run --porcelain

# Progress with strict mode
markdown-transclusion book.md --strict --progress --output book-compiled.md
```

## Output Separation

Following Unix conventions:
- **Content** always goes to stdout
- **Metadata/Progress** always goes to stderr

This allows proper piping and redirection:

```bash
# Pipe content while seeing progress
markdown-transclusion doc.md --progress | pandoc -o output.pdf

# Save both content and metadata
markdown-transclusion doc.md --verbose > content.md 2> process.log

# Ignore metadata
markdown-transclusion doc.md --verbose 2>/dev/null > output.md
```