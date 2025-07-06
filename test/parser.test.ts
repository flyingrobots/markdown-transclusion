import { parseTransclusionReferences, hasOpenCodeFence, maskCodeBlocks } from '../src/parser';

describe('parseTransclusionReferences', () => {
  describe('basic patterns', () => {
    it('should parse simple transclusion', () => {
      const line = '![[file]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[file]]',
        path: 'file',
        startIndex: 0,
        endIndex: 9
      });
    });

    it('should parse transclusion with path', () => {
      const line = '![[path/to/file]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[path/to/file]]',
        path: 'path/to/file',
        startIndex: 0,
        endIndex: 17
      });
    });

    it('should parse transclusion with extension', () => {
      const line = '![[file.md]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[file.md]]',
        path: 'file.md',
        startIndex: 0,
        endIndex: 12
      });
    });

    it('should parse transclusion with heading', () => {
      const line = '![[file#heading]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[file#heading]]',
        path: 'file',
        startIndex: 0,
        endIndex: 17,
        heading: 'heading'
      });
    });

    it('should parse transclusion with complex heading', () => {
      const line = '![[api-reference#authentication]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[api-reference#authentication]]',
        path: 'api-reference',
        startIndex: 0,
        endIndex: 33,
        heading: 'authentication'
      });
    });
  });

  describe('multiple transclusions', () => {
    it('should parse multiple transclusions on same line', () => {
      const line = '![[header]] some text ![[footer]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        original: '![[header]]',
        path: 'header',
        startIndex: 0,
        endIndex: 11
      });
      expect(refs[1]).toEqual({
        original: '![[footer]]',
        path: 'footer',
        startIndex: 22,
        endIndex: 33
      });
    });

    it('should parse adjacent transclusions', () => {
      const line = '![[one]]![[two]]![[three]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(3);
      expect(refs[0].path).toBe('one');
      expect(refs[1].path).toBe('two');
      expect(refs[2].path).toBe('three');
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace in paths', () => {
      const line = '![[  file  ]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('file');
    });

    it('should handle whitespace around transclusions', () => {
      const line = '  ![[file]]  ';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        original: '![[file]]',
        path: 'file',
        startIndex: 2,
        endIndex: 11
      });
    });

    it('should trim whitespace in headings', () => {
      const line = '![[file#  heading  ]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].heading).toBe('heading');
    });
  });

  describe('code block ignoring', () => {
    it('should ignore transclusions in inline code', () => {
      const line = 'Text `![[file]]` more text';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(0);
    });

    it('should ignore transclusions in multiple inline code blocks', () => {
      const line = '`![[one]]` text ![[real]] text `![[two]]`';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('real');
    });

    it('should process transclusions outside inline code', () => {
      const line = '![[before]] `code` ![[after]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(2);
      expect(refs[0].path).toBe('before');
      expect(refs[1].path).toBe('after');
    });
  });

  describe('HTML comment ignoring', () => {
    it('should ignore transclusions in HTML comments', () => {
      const line = '<!-- ![[file]] -->';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(0);
    });

    it('should process transclusions outside HTML comments', () => {
      const line = '![[before]] <!-- comment --> ![[after]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(2);
      expect(refs[0].path).toBe('before');
      expect(refs[1].path).toBe('after');
    });

    it('should handle multi-line style HTML comments on single line', () => {
      const line = '<!-- ![[one]] \n ![[two]] --> ![[real]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('real');
    });
  });

  describe('edge cases', () => {
    it('should handle empty line', () => {
      const refs = parseTransclusionReferences('');
      expect(refs).toHaveLength(0);
    });

    it('should handle line with no transclusions', () => {
      const refs = parseTransclusionReferences('Just regular text');
      expect(refs).toHaveLength(0);
    });

    it('should handle malformed transclusions', () => {
      const line = '![[ ![[]] ![[]]] ![[valid]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('valid');
    });

    it('should handle transclusions with special characters', () => {
      const line = '![[file-with-dash_and_underscore.md]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('file-with-dash_and_underscore.md');
    });

    it('should handle files with spaces', () => {
      const line = '![[file with spaces.md]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('file with spaces.md');
    });

    it('should not parse empty transclusion', () => {
      const line = '![[]]';
      const refs = parseTransclusionReferences(line);
      
      expect(refs).toHaveLength(0);
    });
  });
});

describe('hasOpenCodeFence', () => {
  it('should detect open code fence', () => {
    expect(hasOpenCodeFence('```javascript')).toBe(true);
  });

  it('should detect closed code fence', () => {
    expect(hasOpenCodeFence('```javascript\ncode\n```')).toBe(false);
  });

  it('should handle multiple code fences', () => {
    expect(hasOpenCodeFence('```\ncode\n```\n```\nmore')).toBe(true);
    expect(hasOpenCodeFence('```\ncode\n```\n```\nmore\n```')).toBe(false);
  });

  it('should handle no code fences', () => {
    expect(hasOpenCodeFence('regular text')).toBe(false);
  });
});

describe('maskCodeBlocks', () => {
  it('should mask code blocks', () => {
    const content = 'text\n```js\ncode\n```\nmore text';
    const { masked, blocks } = maskCodeBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe('```js\ncode\n```');
    expect(masked).toContain('\0\0\0');
    expect(masked).toContain('text\n');
    expect(masked).toContain('\nmore text');
  });

  it('should mask multiple code blocks', () => {
    const content = '```\nblock1\n```\ntext\n```\nblock2\n```';
    const { masked, blocks } = maskCodeBlocks(content);
    
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toBe('```\nblock1\n```');
    expect(blocks[1]).toBe('```\nblock2\n```');
  });

  it('should handle content with no code blocks', () => {
    const content = 'just regular text';
    const { masked, blocks } = maskCodeBlocks(content);
    
    expect(blocks).toHaveLength(0);
    expect(masked).toBe(content);
  });
});