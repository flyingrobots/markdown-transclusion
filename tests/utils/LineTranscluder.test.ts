import { LineTranscluder } from '../../src/utils/LineTranscluder';
import { MockFileCache } from '../mocks';
import type { TransclusionOptions } from '../../src/types';
import * as path from 'path';

// Mock the file reader module
jest.mock('../../src/fileReader', () => ({
  readFile: jest.fn()
}));

import { readFile } from '../../src/fileReader';
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('LineTranscluder', () => {
  const basePath = path.join(__dirname, '../fixtures');
  let options: TransclusionOptions;
  let transluder: LineTranscluder;
  
  beforeEach(() => {
    jest.clearAllMocks();
    options = {
      basePath,
      extensions: ['.md'],
      cache: new MockFileCache()
    };
    transluder = new LineTranscluder(options);
  });
  
  describe('processLine', () => {
    it('should return line unchanged if no transclusions', async () => {
      const line = 'Just a regular line';
      const result = await transluder.processLine(line);
      
      expect(result).toBe('Just a regular line');
      expect(transluder.getErrors()).toHaveLength(0);
    });
    
    it('should process transclusions and track files', async () => {
      mockReadFile.mockResolvedValue('File content');
      
      const line = 'Before ![[simple]] after';
      const result = await transluder.processLine(line);
      
      expect(result).toBe('Before File content after');
      expect(mockReadFile).toHaveBeenCalledWith(
        path.join(basePath, 'simple.md'),
        options.cache
      );
      
      const processedFiles = transluder.getProcessedFiles();
      expect(processedFiles).toContain(path.join(basePath, 'simple.md'));
    });
    
    it('should track errors for missing files', async () => {
      const line = '![[non-existent]]';
      const result = await transluder.processLine(line);
      
      expect(result).toBe('<!-- Missing: non-existent -->');
      
      const errors = transluder.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('RESOLVE_ERROR');
    });
    
    it('should track errors for read failures', async () => {
      mockReadFile.mockRejectedValue(new Error('Read failed'));
      
      const line = '![[simple]]';
      const result = await transluder.processLine(line);
      
      expect(result).toBe('<!-- Error: ![[simple]] -->');
      
      const errors = transluder.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('READ_ERROR');
    });
  });
  
  describe('state management', () => {
    it('should accumulate errors across multiple lines', async () => {
      await transluder.processLine('![[missing1]]');
      await transluder.processLine('![[missing2]]');
      
      const errors = transluder.getErrors();
      expect(errors).toHaveLength(2);
    });
    
    it('should clear errors when requested', async () => {
      await transluder.processLine('![[missing]]');
      expect(transluder.getErrors()).toHaveLength(1);
      
      transluder.clearErrors();
      expect(transluder.getErrors()).toHaveLength(0);
    });
    
    it('should reset all state', async () => {
      mockReadFile.mockResolvedValue('content');
      
      await transluder.processLine('![[simple]]'); // Use a real file
      await transluder.processLine('![[missing]]');
      
      expect(transluder.getErrors()).toHaveLength(1);
      expect(transluder.getProcessedFiles()).toHaveLength(1);
      
      transluder.reset();
      
      expect(transluder.getErrors()).toHaveLength(0);
      expect(transluder.getProcessedFiles()).toHaveLength(0);
    });
  });
  
  describe('cache statistics', () => {
    it('should return cache stats when cache is available', () => {
      const mockCache = options.cache as MockFileCache;
      mockCache.hits = 5;
      mockCache.misses = 3;
      
      const stats = transluder.getCacheStats();
      
      expect(stats).toEqual({
        hits: 5,
        misses: 3,
        size: 0
      });
    });
    
    it('should return null when no cache', () => {
      const noCacheTransluder = new LineTranscluder({ basePath });
      const stats = noCacheTransluder.getCacheStats();
      
      expect(stats).toBeNull();
    });
  });
});