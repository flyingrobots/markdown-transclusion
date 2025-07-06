import { 
  stripBOM, 
  processFileContent, 
  trimForTransclusion,
  detectFrontmatter,
  stripFrontmatter
} from '../../src/utils/contentProcessing';

describe('contentProcessing', () => {
  describe('stripBOM', () => {
    it('should strip UTF-8 BOM', () => {
      const contentWithBOM = '\uFEFFHello World';
      const result = stripBOM(contentWithBOM);
      expect(result).toBe('Hello World');
    });

    it('should strip UTF-16 BE BOM', () => {
      const contentWithBOM = '\uFEFEHello World';
      const result = stripBOM(contentWithBOM);
      expect(result).toBe('Hello World');
    });

    it('should strip UTF-16 LE BOM', () => {
      const contentWithBOM = '\uFFFEHello World';
      const result = stripBOM(contentWithBOM);
      expect(result).toBe('Hello World');
    });

    it('should not modify content without BOM', () => {
      const normalContent = 'Hello World';
      const result = stripBOM(normalContent);
      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const result = stripBOM('');
      expect(result).toBe('');
    });

    it('should handle single character that is BOM', () => {
      expect(stripBOM('\uFEFF')).toBe('');
      expect(stripBOM('\uFEFE')).toBe('');
      expect(stripBOM('\uFFFE')).toBe('');
    });

    it('should only strip BOM at the beginning', () => {
      const content = 'Hello\uFEFFWorld';
      const result = stripBOM(content);
      expect(result).toBe('Hello\uFEFFWorld');
    });

    it('should handle strings starting with characters similar to BOM values', () => {
      // Test edge case where first char has code point close to BOM values
      const content = String.fromCharCode(0xFEFD) + 'Hello';
      const result = stripBOM(content);
      expect(result).toBe(String.fromCharCode(0xFEFD) + 'Hello');
    });

    it('should strip only the first BOM when multiple BOMs present', () => {
      const content = '\uFEFF\uFEFFDouble BOM';
      const result = stripBOM(content);
      expect(result).toBe('\uFEFFDouble BOM');
    });
  });

  describe('processFileContent', () => {
    it('should convert buffer to string with default UTF-8 encoding', () => {
      const content = 'Hello World';
      const buffer = Buffer.from(content, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('Hello World');
    });

    it('should strip UTF-8 BOM from buffer content', () => {
      const contentWithBOM = '\uFEFFHello World';
      const buffer = Buffer.from(contentWithBOM, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('Hello World');
    });

    it('should strip UTF-16 BE BOM from buffer content', () => {
      const contentWithBOM = '\uFEFEHello World';
      const buffer = Buffer.from(contentWithBOM, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('Hello World');
    });

    it('should strip UTF-16 LE BOM from buffer content', () => {
      const contentWithBOM = '\uFFFEHello World';
      const buffer = Buffer.from(contentWithBOM, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('Hello World');
    });

    it('should handle different encodings', () => {
      const content = 'Hello World';
      const buffer = Buffer.from(content, 'utf16le');
      const result = processFileContent(buffer, 'utf16le');
      expect(result).toBe('Hello World');
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('', 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('');
    });

    it('should handle buffer with only BOM', () => {
      const buffer = Buffer.from('\uFEFF', 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('');
    });

    it('should preserve special characters after BOM stripping', () => {
      const content = '\uFEFF你好世界\n\tSpecial chars: €£¥';
      const buffer = Buffer.from(content, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('你好世界\n\tSpecial chars: €£¥');
    });

    it('should handle latin1 encoding', () => {
      const content = 'Café';
      const buffer = Buffer.from(content, 'latin1');
      const result = processFileContent(buffer, 'latin1');
      expect(result).toBe('Café');
    });

    it('should handle multi-line content with BOM', () => {
      const content = '\uFEFFLine 1\nLine 2\nLine 3';
      const buffer = Buffer.from(content, 'utf8');
      const result = processFileContent(buffer);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('trimForTransclusion', () => {
    it('should trim whitespace from both ends', () => {
      const content = '  \n\tHello World\n\t  ';
      const result = trimForTransclusion(content);
      expect(result).toBe('Hello World');
    });

    it('should preserve internal whitespace', () => {
      const content = '  Hello   World  ';
      const result = trimForTransclusion(content);
      expect(result).toBe('Hello   World');
    });

    it('should handle empty string', () => {
      const result = trimForTransclusion('');
      expect(result).toBe('');
    });

    it('should handle string with only whitespace', () => {
      const result = trimForTransclusion('   \n\t\r\n   ');
      expect(result).toBe('');
    });

    it('should handle string without whitespace', () => {
      const result = trimForTransclusion('NoWhitespace');
      expect(result).toBe('NoWhitespace');
    });

    it('should trim various types of whitespace characters', () => {
      // Including: space, tab, newline, carriage return, form feed, vertical tab
      const content = ' \t\n\r\f\vContent\v\f\r\n\t ';
      const result = trimForTransclusion(content);
      expect(result).toBe('Content');
    });

    it('should handle multi-line content correctly', () => {
      const content = '\n\n  # Heading\n\n  Content here\n\n';
      const result = trimForTransclusion(content);
      expect(result).toBe('# Heading\n\n  Content here');
    });

    it('should handle Unicode whitespace', () => {
      // JavaScript's trim() removes many Unicode spaces including U+2000-U+2003 AND U+00A0
      const content = '\u00A0\u2000\u2001Content\u2002\u2003\u00A0';
      const result = trimForTransclusion(content);
      // All these Unicode spaces are removed by trim()
      expect(result).toBe('Content');
    });
  });

  describe('detectFrontmatter', () => {
    it('should detect YAML frontmatter', () => {
      const content = '---\ntitle: Test\nauthor: John\n---\n\n# Content\n\nSome content here.';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(true);
      expect(result.type).toBe('yaml');
      expect(result.startDelimiter).toBe('---');
      expect(result.endDelimiter).toBe('---');
      expect(result.startLine).toBe(0);
      expect(result.endLine).toBe(3);
      expect(result.contentStartIndex).toBe(content.indexOf('# Content'));
    });

    it('should detect TOML frontmatter', () => {
      const content = '+++\ntitle = "Test"\nauthor = "John"\n+++\n\n# Content\n\nSome content here.';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(true);
      expect(result.type).toBe('toml');
      expect(result.startDelimiter).toBe('+++');
      expect(result.endDelimiter).toBe('+++');
      expect(result.startLine).toBe(0);
      expect(result.endLine).toBe(3);
      expect(result.contentStartIndex).toBe(content.indexOf('# Content'));
    });

    it('should not detect frontmatter when no delimiter at start', () => {
      const content = '# Title\n\nContent without frontmatter.';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(false);
      expect(result.type).toBe(null);
      expect(result.contentStartIndex).toBe(0);
    });

    it('should not detect malformed frontmatter without closing delimiter', () => {
      const content = '---\ntitle: Test\nauthor: John\n\n# Content';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(false);
      expect(result.type).toBe(null);
      expect(result.contentStartIndex).toBe(0);
    });

    it('should handle empty frontmatter', () => {
      const content = '---\n---\n\n# Content';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(true);
      expect(result.type).toBe('yaml');
      expect(result.contentStartIndex).toBe(content.indexOf('# Content'));
    });

    it('should handle frontmatter with spaces around delimiters', () => {
      const content = '---  \ntitle: Test\n  ---\n\n# Content';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(true);
      expect(result.type).toBe('yaml');
    });

    it('should handle CRLF line endings', () => {
      const content = '---\r\ntitle: Test\r\n---\r\n\r\n# Content';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(true);
      expect(result.type).toBe('yaml');
    });

    it('should handle empty content', () => {
      const result = detectFrontmatter('');
      
      expect(result.hasFrontmatter).toBe(false);
      expect(result.type).toBe(null);
      expect(result.contentStartIndex).toBe(0);
    });

    it('should handle content with only delimiter', () => {
      const result = detectFrontmatter('---');
      
      expect(result.hasFrontmatter).toBe(false);
      expect(result.type).toBe(null);
    });

    it('should not detect --- in middle of content as frontmatter', () => {
      const content = '# Title\n\nSome content.\n\n---\n\nMore content';
      const result = detectFrontmatter(content);
      
      expect(result.hasFrontmatter).toBe(false);
      expect(result.type).toBe(null);
    });
  });

  describe('stripFrontmatter', () => {
    it('should strip YAML frontmatter', () => {
      const content = '---\ntitle: Test\nauthor: John\n---\n\n# Content\n\nSome content here.';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Content\n\nSome content here.');
    });

    it('should strip TOML frontmatter', () => {
      const content = '+++\ntitle = "Test"\nauthor = "John"\n+++\n\n# Content\n\nSome content here.';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Content\n\nSome content here.');
    });

    it('should not modify content without frontmatter', () => {
      const content = '# Title\n\nContent without frontmatter.';
      const result = stripFrontmatter(content);
      
      expect(result).toBe(content);
    });

    it('should not modify malformed frontmatter', () => {
      const content = '---\ntitle: Test\nauthor: John\n\n# Content';
      const result = stripFrontmatter(content);
      
      expect(result).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = '---\n---\n\n# Content';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Content');
    });

    it('should handle frontmatter without trailing newline', () => {
      const content = '---\ntitle: Test\n---\n# Content';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Content');
    });

    it('should handle CRLF line endings', () => {
      const content = '---\r\ntitle: Test\r\n---\r\n\r\n# Content';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Content');
    });

    it('should preserve content structure after stripping', () => {
      const content = '---\ntitle: Test\n---\n\n# Heading 1\n\nParagraph 1\n\n## Heading 2\n\nParagraph 2';
      const result = stripFrontmatter(content);
      
      expect(result).toBe('# Heading 1\n\nParagraph 1\n\n## Heading 2\n\nParagraph 2');
    });

    it('should handle complex YAML frontmatter', () => {
      const content = `---
title: "Complex Document"
author: "John Doe"
date: 2024-01-01
tags:
  - markdown
  - test
  - frontmatter
meta:
  description: "A test document"
  keywords: ["test", "example"]
---

# Main Content

This is the actual content.`;
      
      const result = stripFrontmatter(content);
      expect(result).toBe('# Main Content\n\nThis is the actual content.');
    });

    it('should handle complex TOML frontmatter', () => {
      const content = `+++
title = "Complex Document"
author = "John Doe"
date = 2024-01-01
tags = ["markdown", "test", "frontmatter"]

[meta]
description = "A test document"
keywords = ["test", "example"]
+++

# Main Content

This is the actual content.`;
      
      const result = stripFrontmatter(content);
      expect(result).toBe('# Main Content\n\nThis is the actual content.');
    });
  });

  describe('integration scenarios', () => {
    it('should process buffer with BOM and trim result', () => {
      const content = '\uFEFF  \n\tHello World\n\t  ';
      const buffer = Buffer.from(content, 'utf8');
      
      const processed = processFileContent(buffer);
      const trimmed = trimForTransclusion(processed);
      
      expect(trimmed).toBe('Hello World');
    });

    it('should handle real-world markdown file content', () => {
      const markdownWithBOM = '\uFEFF# Title\n\nSome content here.\n\n## Section\n\nMore content.\n';
      const buffer = Buffer.from(markdownWithBOM, 'utf8');
      
      const processed = processFileContent(buffer);
      expect(processed).toBe('# Title\n\nSome content here.\n\n## Section\n\nMore content.\n');
      
      const trimmed = trimForTransclusion(processed);
      expect(trimmed).toBe('# Title\n\nSome content here.\n\n## Section\n\nMore content.');
    });

    it('should handle edge case with BOM-like content in the middle', () => {
      const content = 'Start ' + String.fromCharCode(0xFEFF) + ' Middle ' + String.fromCharCode(0xFEFE) + ' End';
      const buffer = Buffer.from(content, 'utf8');
      
      const processed = processFileContent(buffer);
      // Should not strip BOM-like characters in the middle
      expect(processed).toBe(content);
    });

    it('should handle markdown with BOM and frontmatter', () => {
      const content = '\uFEFF---\ntitle: Test\n---\n\n# Content';
      const buffer = Buffer.from(content, 'utf8');
      
      const processed = processFileContent(buffer);
      expect(processed).toBe('---\ntitle: Test\n---\n\n# Content');
      
      const stripped = stripFrontmatter(processed);
      expect(stripped).toBe('# Content');
    });

    it('should handle full workflow: BOM removal, frontmatter stripping, and trimming', () => {
      const content = '\uFEFF---\ntitle: Test\n---\n\n  # Content\n\n  ';
      const buffer = Buffer.from(content, 'utf8');
      
      const processed = processFileContent(buffer);
      const frontmatterStripped = stripFrontmatter(processed);
      const trimmed = trimForTransclusion(frontmatterStripped);
      
      expect(trimmed).toBe('# Content');
    });
  });
});