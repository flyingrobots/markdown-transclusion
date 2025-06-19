# Heading Range Extraction Demo

This demonstrates the new heading range extraction feature (F021).

## Basic Range Extraction

Extract content between two headings:
```markdown
![[api-docs#Authentication:Authorization]]
```

## Extract to End

Extract from a heading to the end of the document:
```markdown
![[api-docs#Rate Limiting:]]
```

## Extract from Beginning

Extract from the beginning up to a specific heading:
```markdown
![[api-docs#:Authentication]]
```

## Mixed Heading Levels

Works with different heading levels:
```markdown
![[tutorial#Getting Started:##Advanced Topics]]
```

## Example Use Cases

1. **Documentation Composition**: Extract specific sections from larger docs
2. **API Reference**: Include only relevant endpoints
3. **Tutorial Segments**: Pull specific chapters or sections
4. **Release Notes**: Extract version-specific changes

## Syntax Summary

| Syntax | Description |
|--------|-------------|
| `![[file#heading]]` | Single heading extraction (existing) |
| `![[file#start:end]]` | Extract from start to end heading |
| `![[file#start:]]` | Extract from start to end of document |
| `![[file#:end]]` | Extract from beginning to end heading |

## Error Handling

- If start heading is not found: `<!-- Error: Start heading "Name" not found -->`
- Compatible with all existing features (variables, recursive transclusion, etc.)