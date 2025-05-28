import { extractHeadingContent, hasHeadingAnchor, splitReference } from '../../src/utils/headingExtractor';

describe('Heading Extractor', () => {
  describe('extractHeadingContent', () => {
    const sampleContent = `# Title
Introduction paragraph.

## First Section
Content of first section.

### Subsection
Nested content.

## Second Section
Content of second section.

## Last Section
Final content.`;

    it('should extract content for a specific heading', () => {
      const result = extractHeadingContent(sampleContent, 'First Section');
      expect(result).toBe(`## First Section
Content of first section.

### Subsection
Nested content.`);
    });

    it('should extract content until next same-level heading', () => {
      const result = extractHeadingContent(sampleContent, 'Second Section');
      expect(result).toBe(`## Second Section
Content of second section.`);
    });

    it('should extract last section to end of file', () => {
      const result = extractHeadingContent(sampleContent, 'Last Section');
      expect(result).toBe(`## Last Section
Final content.`);
    });

    it('should handle case-insensitive matching', () => {
      const result = extractHeadingContent(sampleContent, 'first section');
      expect(result).toContain('## First Section');
    });

    it('should return null for non-existent heading', () => {
      const result = extractHeadingContent(sampleContent, 'Non-existent');
      expect(result).toBeNull();
    });

    it('should return full content if no heading specified', () => {
      const result = extractHeadingContent(sampleContent, '');
      expect(result).toBe(sampleContent);
    });

    it('should handle different heading levels', () => {
      const result = extractHeadingContent(sampleContent, 'Subsection');
      expect(result).toBe(`### Subsection
Nested content.`);
    });
  });

  describe('hasHeadingAnchor', () => {
    it('should detect heading anchors', () => {
      expect(hasHeadingAnchor('file#heading')).toBe(true);
      expect(hasHeadingAnchor('file')).toBe(false);
      expect(hasHeadingAnchor('path/to/file#section')).toBe(true);
    });
  });

  describe('splitReference', () => {
    it('should split reference into path and heading', () => {
      expect(splitReference('file#heading')).toEqual({
        path: 'file',
        heading: 'heading'
      });
    });

    it('should handle references without headings', () => {
      expect(splitReference('file')).toEqual({
        path: 'file',
        heading: undefined
      });
    });

    it('should handle complex paths', () => {
      expect(splitReference('path/to/file#My Heading')).toEqual({
        path: 'path/to/file',
        heading: 'My Heading'
      });
    });
  });
});