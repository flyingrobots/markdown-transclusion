## Transclusion Examples

### Basic File Inclusion
```markdown
![[introduction]]
```

### Include with Path
```markdown
![[docs/api/overview]]
```

### Heading Extraction
```markdown
![[architecture#Security Model]]
```

### Variable Substitution
```markdown
![[content-{{language}}-{{version}}]]
```

### Nested Transclusion
main.md:
```markdown
![[chapter1]]
```

chapter1.md:
```markdown
# Chapter 1
![[section1]]
![[section2]]
```

### Error Handling
When a file is not found:
```markdown
![[missing-file]]
<!-- Error: File not found: missing-file -->
```