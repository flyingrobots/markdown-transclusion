# API Documentation

## JavaScript API

### Basic Usage

```javascript
import { processLine, createTransclusionStream } from 'markdown-transclusion';

// Process a single line
const result = await processLine('Check out ![[guide]]', {
  basePath: './docs'
});

// Use with streams
const stream = createTransclusionStream({
  basePath: './docs',
  variables: { version: '1.0' }
});
```

## REST Endpoints

*Note: This example demonstrates API documentation formatting only — no actual REST endpoints are implemented in markdown-transclusion.*

### POST /api/transclude

Process markdown content with transclusions.

**Request Body:**
```json
{
  "content": "# Doc\n![[section]]",
  "options": {
    "basePath": "/docs",
    "variables": {
      "lang": "en"
    }
  }
}
```

**Response:**
```json
{
  "output": "# Doc\nSection content here",
  "errors": []
}
```

### GET /api/validate/:file

Validate transclusion references in a file.

**Query Parameters:**
- `basePath` - Base directory path
- `strict` - Whether to fail on any error

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "references": [
    {
      "path": "section.md",
      "exists": true,
      "line": 2
    }
  ]
}
```

## GraphQL Schema

*Note: This example demonstrates GraphQL schema formatting only — no actual GraphQL endpoint is implemented.*

```graphql
type TransclusionResult {
  output: String!
  errors: [TransclusionError!]!
}

type TransclusionError {
  message: String!
  path: String!
  line: Int
  code: String!
}

type Query {
  transclude(
    content: String!
    basePath: String!
    variables: JSON
  ): TransclusionResult!
}
```

## Webhook Integration

*Note: This example shows hypothetical webhook configuration — not an actual feature.*

Configure webhooks to process markdown on file changes:

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["file.created", "file.updated"],
  "config": {
    "basePath": "/docs",
    "processPattern": "*.md"
  }
}
```