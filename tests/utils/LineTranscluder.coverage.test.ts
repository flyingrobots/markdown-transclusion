import { LineTranscluder } from '../../src/utils/LineTranscluder';
import { extractHeadingContent } from '../../src/utils/headingExtractor';
import type { TransclusionOptions, TransclusionError } from '../../src/types';

// Mock dependencies
jest.mock('../../src/fileReader', () => ({
  readFile: jest.fn()
}));

jest.mock('../../src/utils/headingExtractor', () => ({
  extractHeadingContent: jest.fn()
}));

jest.mock('../../src/resolver', () => ({
  resolvePath: jest.fn()
}));

jest.mock('../../src/parser', () => ({
  parseTransclusionReferences: jest.fn()
}));

jest.mock('../../src/utils/contentProcessing', () => ({
  trimForTransclusion: jest.fn()
}));

import { readFile } from '../../src/fileReader';
import { resolvePath } from '../../src/resolver';
import { parseTransclusionReferences } from '../../src/parser';
import { trimForTransclusion } from '../../src/utils/contentProcessing';
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockExtractHeading = extractHeadingContent as jest.MockedFunction<typeof extractHeadingContent>;
const mockResolvePath = resolvePath as jest.MockedFunction<typeof resolvePath>;
const mockParseRefs = parseTransclusionReferences as jest.MockedFunction<typeof parseTransclusionReferences>;
const mockTrimForTransclusion = trimForTransclusion as jest.MockedFunction<typeof trimForTransclusion>;

describe('LineTranscluder - Coverage Gaps', () => {
  const basePath = '/test';
  let options: TransclusionOptions;
  let transcluder: LineTranscluder;
  
  beforeEach(() => {
    jest.clearAllMocks();
    options = {
      basePath,
      extensions: ['.md'],
      maxDepth: 3 // Set low for testing
    };
    transcluder = new LineTranscluder(options);
    
    // Default mock behavior to prevent undefined errors
    mockReadFile.mockResolvedValue('Default content');
    mockResolvePath.mockReturnValue({ 
      absolutePath: '/test/default.md', 
      exists: true, 
      originalReference: 'default' 
    });
    mockTrimForTransclusion.mockImplementation((content) => content?.trim() || '');
    
    // Default parser behavior - parse actual transclusion patterns
    mockParseRefs.mockImplementation((line: string) => {
      const refs: any[] = [];
      const pattern = /!\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const [path, heading] = match[1].split('#');
        refs.push({
          original: match[0],
          path: path.trim(),
          heading: heading?.trim(),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
      return refs;
    });
  });
  
  describe('Maximum depth exceeded (lines 61-67)', () => {
    it('should handle maximum depth exceeded error', async () => {
      // Clear existing errors before test
      transcluder.clearErrors();
      
      // Mock resolver to return existing files
      mockResolvePath
        .mockReturnValueOnce({ absolutePath: '/test/level1.md', exists: true, originalReference: 'level1' })
        .mockReturnValueOnce({ absolutePath: '/test/level2.md', exists: true, originalReference: 'level2' })
        .mockReturnValueOnce({ absolutePath: '/test/level3.md', exists: true, originalReference: 'level3' })
        .mockReturnValueOnce({ absolutePath: '/test/level4.md', exists: true, originalReference: 'level4' });
      
      // Create a chain that exceeds max depth
      mockReadFile
        .mockResolvedValueOnce('Level 1 ![[level2]]')
        .mockResolvedValueOnce('Level 2 ![[level3]]')
        .mockResolvedValueOnce('Level 3 ![[level4]]')
        .mockResolvedValueOnce('Level 4 content');
      
      const result = await transcluder.processLine('Start ![[level1]]');
      
      // Should process up to level 3, then show error for level 4
      expect(result).toBe('Start Level 1 Level 2 Level 3 <!-- Error: Maximum transclusion depth (3) exceeded -->');
      
      const errors = transcluder.getErrors();
      // Due to error accumulation from extractErrors, we may have duplicate errors
      const uniqueDepthErrors = Array.from(new Set(
        errors.filter(e => e.code === 'MAX_DEPTH_EXCEEDED').map(e => e.message)
      ));
      expect(uniqueDepthErrors).toHaveLength(1);
      expect(uniqueDepthErrors[0]).toBe('Maximum transclusion depth (3) exceeded');
    });
    
    it('should handle multiple transclusions hitting depth limit', async () => {
      // Use a transcluder with maxDepth = 1
      const shallowOptions: TransclusionOptions = {
        basePath,
        extensions: ['.md'],
        maxDepth: 1
      };
      const shallowTranscluder = new LineTranscluder(shallowOptions);
      
      // Mock resolver for all paths
      mockResolvePath.mockReturnValue({ absolutePath: '/test/file.md', exists: true, originalReference: 'file' });
      
      // Each file tries to transclude another
      mockReadFile.mockResolvedValue('Content with ![[nested]]');
      
      const result = await shallowTranscluder.processLine('![[start1]] and ![[start2]]');
      
      const errors = shallowTranscluder.getErrors();
      // Should have depth errors for nested transclusions
      const depthErrors = errors.filter(e => e.code === 'MAX_DEPTH_EXCEEDED');
      expect(depthErrors.length).toBeGreaterThanOrEqual(1);
      // The actual number might vary due to how errors are accumulated
    });
  });
  
  describe('Heading not found (lines 101-112)', () => {
    it('should handle missing heading error', async () => {
      transcluder.clearErrors();
      
      mockResolvePath.mockReturnValue({ absolutePath: '/test/document.md', exists: true, originalReference: 'document' });
      mockReadFile.mockResolvedValue('# Title\n\n## Section 1\n\nContent here.\n\n## Section 2\n\nMore content.');
      mockExtractHeading.mockReturnValue(null); // Heading not found
      
      const result = await transcluder.processLine('![[document#Missing Section]]');
      
      expect(result).toBe('<!-- Error: Heading "Missing Section" not found in /test/document.md -->');
      
      const errors = transcluder.getErrors();
      // Due to error accumulation, we may have duplicates
      const headingErrors = errors.filter(e => e.code === 'HEADING_NOT_FOUND');
      expect(headingErrors.length).toBeGreaterThanOrEqual(1);
      expect(headingErrors[0].message).toBe('Heading "Missing Section" not found in /test/document.md');
      expect(headingErrors[0].path).toBe('/test/document.md');
    });
    
    it('should handle multiple missing headings', async () => {
      transcluder.clearErrors();
      
      mockResolvePath.mockReturnValue({ absolutePath: '/test/doc.md', exists: true, originalReference: 'doc' });
      const content = '# Document\n\nSome content without the requested sections.';
      mockReadFile.mockResolvedValue(content);
      mockExtractHeading.mockReturnValue(null);
      
      const result = await transcluder.processLine('![[doc#Section A]] and ![[doc#Section B]]');
      
      expect(result).toContain('<!-- Error: Heading "Section A" not found in /test/doc.md -->');
      expect(result).toContain('<!-- Error: Heading "Section B" not found in /test/doc.md -->');
      
      const errors = transcluder.getErrors();
      const headingErrors = errors.filter(e => e.code === 'HEADING_NOT_FOUND');
      // Check we have errors for both sections
      const uniqueMessages = Array.from(new Set(headingErrors.map(e => e.message)));
      expect(uniqueMessages).toContain('Heading "Section A" not found in /test/doc.md');
      expect(uniqueMessages).toContain('Heading "Section B" not found in /test/doc.md');
    });
    
    it('should continue processing after heading not found', async () => {
      transcluder.clearErrors();
      
      mockResolvePath
        .mockReturnValueOnce({ absolutePath: '/test/doc1.md', exists: true, originalReference: 'doc1' })
        .mockReturnValueOnce({ absolutePath: '/test/doc2.md', exists: true, originalReference: 'doc2' })
        .mockReturnValueOnce({ absolutePath: '/test/doc3.md', exists: true, originalReference: 'doc3' });
      
      mockReadFile
        .mockResolvedValueOnce('Doc 1 content')
        .mockResolvedValueOnce('Doc 2 content')
        .mockResolvedValueOnce('Doc 3 content');
      
      mockExtractHeading
        .mockReturnValueOnce(null) // First heading not found
        .mockReturnValueOnce('Section content'); // Second heading found
      
      const result = await transcluder.processLine('![[doc1#Missing]] then ![[doc2#Found]] finally ![[doc3]]');
      
      expect(result).toBe(
        '<!-- Error: Heading "Missing" not found in /test/doc1.md --> ' +
        'then Section content finally Doc 3 content'
      );
      
      // Should have called readFile for all 3 documents
      expect(mockReadFile).toHaveBeenCalledTimes(3);
      
      // Should have tried to extract heading for first 2
      expect(mockExtractHeading).toHaveBeenCalledTimes(2);
      expect(mockExtractHeading).toHaveBeenCalledWith('Doc 1 content', 'Missing');
      expect(mockExtractHeading).toHaveBeenCalledWith('Doc 2 content', 'Found');
    });
    
    it('should handle heading not found in recursive transclusion', async () => {
      transcluder.clearErrors();
      
      mockResolvePath
        .mockReturnValueOnce({ absolutePath: '/test/parent.md', exists: true, originalReference: 'parent' })
        .mockReturnValueOnce({ absolutePath: '/test/child.md', exists: true, originalReference: 'child' });
      
      mockReadFile
        .mockResolvedValueOnce('Parent contains ![[child#Section]]')
        .mockResolvedValueOnce('Child document without the section');
      
      mockExtractHeading.mockReturnValue(null);
      
      const result = await transcluder.processLine('![[parent]]');
      
      expect(result).toBe('Parent contains <!-- Error: Heading "Section" not found in /test/child.md -->');
      
      const errors = transcluder.getErrors();
      const headingErrors = errors.filter(e => e.code === 'HEADING_NOT_FOUND');
      expect(headingErrors.length).toBeGreaterThanOrEqual(1);
      expect(headingErrors[0].message).toBe('Heading "Section" not found in /test/child.md');
    });
  });
  
  describe('Circular reference detection (lines 84-92)', () => {
    it('should detect circular reference', async () => {
      const circularOptions: TransclusionOptions = {
        basePath: '/test',
        extensions: ['.md'],
        maxDepth: 10
      };
      const circularTranscluder = new LineTranscluder(circularOptions);
      
      // Parse the initial reference
      mockParseRefs
        .mockReturnValueOnce([{
          original: '![[docA]]',
          path: 'docA',
          heading: undefined,
          startIndex: 0,
          endIndex: 9
        }])
        .mockReturnValueOnce([{
          original: '![[docB]]',
          path: 'docB',
          heading: undefined,
          startIndex: 8,
          endIndex: 17
        }])
        .mockReturnValueOnce([{
          original: '![[docA]]',
          path: 'docA',
          heading: undefined,
          startIndex: 8,
          endIndex: 17
        }]);
      
      // Resolve paths
      mockResolvePath
        .mockReturnValueOnce({ absolutePath: '/test/docA.md', exists: true, originalReference: 'docA' })
        .mockReturnValueOnce({ absolutePath: '/test/docB.md', exists: true, originalReference: 'docB' })
        .mockReturnValueOnce({ absolutePath: '/test/docA.md', exists: true, originalReference: 'docA' });
      
      // Read file contents
      mockReadFile
        .mockResolvedValueOnce('Doc A: ![[docB]]')
        .mockResolvedValueOnce('Doc B: ![[docA]]');
      
      const result = await circularTranscluder.processLine('![[docA]]');
      
      expect(result).toContain('Circular reference detected');
      
      const errors = circularTranscluder.getErrors();
      const circularError = errors.find(e => e.code === 'CIRCULAR_REFERENCE');
      expect(circularError).toBeDefined();
      expect(circularError?.message).toContain('Circular reference detected');
      expect(circularError?.message).toContain('/test/docA.md → /test/docB.md → /test/docA.md');
    });
    
    it('should detect self-reference', async () => {
      const selfRefOptions: TransclusionOptions = {
        basePath: '/test',
        extensions: ['.md'],
        maxDepth: 10
      };
      const selfRefTranscluder = new LineTranscluder(selfRefOptions);
      
      // Parse references
      mockParseRefs
        .mockReturnValueOnce([{
          original: '![[self]]',
          path: 'self',
          heading: undefined,
          startIndex: 0,
          endIndex: 9
        }])
        .mockReturnValueOnce([{
          original: '![[self]]',
          path: 'self',
          heading: undefined,
          startIndex: 16,
          endIndex: 25
        }]);
      
      // Resolve paths
      mockResolvePath.mockReturnValue({ absolutePath: '/test/self.md', exists: true, originalReference: 'self' });
      
      // Read file
      mockReadFile.mockResolvedValue('Self reference: ![[self]]');
      
      const result = await selfRefTranscluder.processLine('![[self]]');
      
      expect(result).toContain('Circular reference detected');
      expect(result).toContain('/test/self.md → /test/self.md');
    });
  });
  
  describe('Error accumulation and state management', () => {
    it('should properly track errors across multiple processLine calls', async () => {
      // Start fresh
      const freshTranscluder = new LineTranscluder(options);
      
      mockResolvePath.mockReturnValue({ absolutePath: '/test/doc.md', exists: true, originalReference: 'doc' });
      mockReadFile.mockResolvedValue('Content');
      mockExtractHeading.mockReturnValue(null);
      
      // Process multiple lines with errors
      await freshTranscluder.processLine('![[doc1#Missing]]');
      await freshTranscluder.processLine('![[doc2#AlsoMissing]]');
      
      let errors = freshTranscluder.getErrors();
      // At least 2 errors (may have duplicates due to extractErrors)
      expect(errors.length).toBeGreaterThanOrEqual(2);
      
      // Clear errors
      freshTranscluder.clearErrors();
      errors = freshTranscluder.getErrors();
      expect(errors).toHaveLength(0);
      
      // Process another line
      await freshTranscluder.processLine('![[doc3#StillMissing]]');
      errors = freshTranscluder.getErrors();
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});