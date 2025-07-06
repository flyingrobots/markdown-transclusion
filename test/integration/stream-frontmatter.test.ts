import { TransclusionTransform } from '../../src/stream';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';

describe('TransclusionStream Frontmatter Integration', () => {
  async function processStreamInput(input: string, options: any = {}): Promise<string> {
    const stream = new TransclusionTransform(options);
    const chunks: string[] = [];
    
    const readable = Readable.from([input]);
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      }
    });
    
    await pipeline(readable, stream, writable);
    return chunks.join('');
  }

  describe('YAML frontmatter stripping', () => {
    it('should strip YAML frontmatter from outer document', async () => {
      const input = `---
title: Test Document
author: John Doe
---

# Main Content
This is the content.`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Main Content\nThis is the content.');
    });

    it('should not strip frontmatter when option is disabled', async () => {
      const input = `---
title: Test Document
---

# Main Content`;

      const result = await processStreamInput(input, { stripFrontmatter: false });
      expect(result).toBe(input);
    });

    it('should handle empty YAML frontmatter', async () => {
      const input = `---
---

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Content');
    });

    it('should handle malformed YAML frontmatter (no closing delimiter)', async () => {
      const input = `---
title: Test

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe(''); // Strips everything when frontmatter doesn't close
    });
  });

  describe('TOML frontmatter stripping', () => {
    it('should strip TOML frontmatter from outer document', async () => {
      const input = `+++
title = "Test Document"
author = "John Doe"
+++

# Main Content
This is the content.`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Main Content\nThis is the content.');
    });

    it('should handle empty TOML frontmatter', async () => {
      const input = `+++
+++

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Content');
    });

    it('should handle malformed TOML frontmatter (no closing delimiter)', async () => {
      const input = `+++
title = "Test"

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe(''); // Strips everything when frontmatter doesn't close
    });
  });

  describe('frontmatter state machine edge cases', () => {
    it('should handle content without frontmatter', async () => {
      const input = `# Regular Content
No frontmatter here.`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe(input);
    });

    it('should handle frontmatter delimiters in middle of document', async () => {
      const input = `# Title

Some content.

---

More content after delimiter.`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe(input); // Should not strip --- in middle
    });

    it('should handle transition from yaml-start to inside state', async () => {
      const input = `---
title: Test
description: Multiple lines
of frontmatter content
---

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Content');
    });

    it('should handle transition from toml-start to inside state', async () => {
      const input = `+++
title = "Test"
description = """
Multiple lines
of content
"""
+++

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Content');
    });

    it('should handle frontmatter with whitespace around delimiters', async () => {
      const input = `---  
title: Test
  ---

# Content`;

      const result = await processStreamInput(input, { stripFrontmatter: true });
      expect(result).toBe('\n# Content');
    });

    it('should test the default case in frontmatter state machine', async () => {
      const input = `# Content`;
      const stream = new TransclusionTransform({ stripFrontmatter: true });
      
      // Manually set an invalid state to test default case
      (stream as any).frontmatterState = 'invalid-state';
      (stream as any).lineNumber = 2;
      
      const result = (stream as any).handleFrontmatterLine('test line');
      expect(result).toBe(false);
    });
  });

  describe('validate-only mode with frontmatter', () => {
    it('should not output content in validate-only mode', async () => {
      const input = `---
title: Test
---

# Content`;

      const result = await processStreamInput(input, { 
        stripFrontmatter: true, 
        validateOnly: true 
      });
      expect(result).toBe('');
    });
  });

  describe('error handling in frontmatter processing', () => {
    it('should handle errors in _transform method', async () => {
      const stream = new TransclusionTransform({ stripFrontmatter: true });
      const callback = jest.fn();
      
      // Mock processLine to throw an error
      const originalProcessLine = (stream as any).processLine;
      (stream as any).processLine = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await (stream as any)._transform(Buffer.from('test\n'), 'utf8', callback);
      
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
      
      // Restore original method
      (stream as any).processLine = originalProcessLine;
    });

    it('should handle errors in _flush method', async () => {
      const stream = new TransclusionTransform({ stripFrontmatter: true });
      const callback = jest.fn();
      
      // Set buffer to have content
      (stream as any).buffer = 'test content';
      
      // Mock processLine to throw an error
      (stream as any).processLine = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await (stream as any)._flush(callback);
      
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});