import { extractHeadingRange } from '../../src/utils/headingExtractor';

describe('Heading Range Extractor', () => {
  const sampleContent = `# Title
Introduction paragraph.

## First Section
Content of first section.

### Subsection
Nested content.

## Second Section
Content of second section.

### Another Subsection
More nested content.

## Last Section
Final content.

# Another Title
Different top-level section.`;

  describe('extractHeadingRange', () => {
    it('should extract content between two headings', () => {
      const result = extractHeadingRange(sampleContent, 'First Section', 'Second Section');
      expect(result).toBe(`## First Section
Content of first section.

### Subsection
Nested content.`);
    });

    it('should extract from heading to end when endHeading is empty', () => {
      const result = extractHeadingRange(sampleContent, 'Last Section', '');
      expect(result).toBe(`## Last Section
Final content.

# Another Title
Different top-level section.`);
    });

    it('should extract from heading to end when endHeading is not found', () => {
      const result = extractHeadingRange(sampleContent, 'Last Section', 'Non-existent');
      expect(result).toBe(`## Last Section
Final content.

# Another Title
Different top-level section.`);
    });

    it('should handle case-insensitive matching for both start and end', () => {
      const result = extractHeadingRange(sampleContent, 'first section', 'SECOND SECTION');
      expect(result).toBe(`## First Section
Content of first section.

### Subsection
Nested content.`);
    });

    it('should return null when start heading is not found', () => {
      const result = extractHeadingRange(sampleContent, 'Non-existent', 'Second Section');
      expect(result).toBeNull();
    });

    it('should extract from beginning when start heading is empty', () => {
      const result = extractHeadingRange(sampleContent, '', 'First Section');
      expect(result).toBe(`# Title
Introduction paragraph.`);
    });

    it('should return full content when both headings are empty', () => {
      const result = extractHeadingRange(sampleContent, '', '');
      expect(result).toBe(sampleContent);
    });

    it('should handle mixed heading levels', () => {
      const result = extractHeadingRange(sampleContent, 'Subsection', 'Another Title');
      expect(result).toBe(`### Subsection
Nested content.

## Second Section
Content of second section.

### Another Subsection
More nested content.

## Last Section
Final content.`);
    });

    it('should include nested subsections when extracting between main sections', () => {
      const result = extractHeadingRange(sampleContent, 'Second Section', 'Last Section');
      expect(result).toBe(`## Second Section
Content of second section.

### Another Subsection
More nested content.`);
    });

    it('should handle adjacent headings correctly', () => {
      const adjacentContent = `## Heading A
## Heading B
Content B
## Heading C`;
      
      const result = extractHeadingRange(adjacentContent, 'Heading A', 'Heading B');
      expect(result).toBe('## Heading A');
    });

    it('should remove trailing empty lines', () => {
      const contentWithTrailing = `## Section
Content


`;
      const result = extractHeadingRange(contentWithTrailing, 'Section', '');
      expect(result).toBe(`## Section
Content`);
    });
  });
});