---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[BUG] '
labels: ['bug']
assignees: ''
---

## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Create file `example.md` with content:
   ```markdown
   # Test
   ![[missing.md]]
   ```
2. Run command: `markdown-transclusion example.md`
3. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
What actually happened. Include any error messages or unexpected output.

## Input Files
**Main file (example.md):**
```markdown
<!-- Paste the content of your main file here -->
```

**Referenced files:**
```markdown
<!-- Include content of any files being transcluded -->
```

## Command Used
```bash
# Exact command you ran
markdown-transclusion example.md --flag value
```

## Error Output
```
Paste any error messages or unexpected output here
```

## Environment
- **OS:** [e.g. macOS 14.1, Ubuntu 22.04, Windows 11]
- **Node.js version:** [e.g. 18.19.0]
- **markdown-transclusion version:** [e.g. 1.1.2]
- **Installation method:** [npm, yarn, pnpm, etc.]

## Additional Context
- Does this work in a different environment?
- Is this a regression (did it work in a previous version)?
- Any relevant project structure or file organization details?

## Possible Solution
If you have ideas about what might be causing the issue or how to fix it.