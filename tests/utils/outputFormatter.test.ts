import { Writable } from 'stream';
import {
  OutputMode,
  DefaultFormatter,
  VerboseFormatter,
  PorcelainFormatter,
  ProgressFormatter,
  createFormatter,
  type ProcessingStats
} from '../../src/utils/outputFormatter';
import type { TransclusionError } from '../../src/types';

describe('Output Formatters', () => {
  let mockStderr: MockWriteStream;
  let mockStdout: MockWriteStream;
  
  class MockWriteStream extends Writable {
    public data: string[] = [];
    
    write(chunk: any, encoding?: any, callback?: any): boolean {
      this.data.push(chunk.toString());
      if (typeof encoding === 'function') {
        encoding();
      } else if (callback) {
        callback();
      }
      return true;
    }
    
    getData(): string {
      return this.data.join('');
    }
    
    clear(): void {
      this.data = [];
    }
  }
  
  beforeEach(() => {
    mockStderr = new MockWriteStream();
    mockStdout = new MockWriteStream();
  });
  
  describe('DefaultFormatter', () => {
    let formatter: DefaultFormatter;
    
    beforeEach(() => {
      formatter = new DefaultFormatter(mockStderr as any, mockStdout as any);
    });
    
    it('should only output errors in default mode', () => {
      formatter.onProcessingStart('/path/to/file.md');
      formatter.onFileRead('/path/to/include.md');
      formatter.onProcessingComplete({
        filesProcessed: 2,
        transclusionsResolved: 1,
        warnings: 0,
        errors: 0,
        duration: 100
      });
      
      expect(mockStderr.getData()).toBe('');
      expect(mockStdout.getData()).toBe('');
    });
    
    it('should output errors to stderr', () => {
      const error: TransclusionError = {
        message: 'File not found',
        path: '/path/to/missing.md',
        line: 10,
        code: 'FILE_NOT_FOUND'
      };
      
      formatter.onError(error);
      
      expect(mockStderr.getData()).toContain('WARN: File not found');
      expect(mockStderr.getData()).toContain('in /path/to/missing.md');
    });
    
    it('should output warnings to stderr', () => {
      formatter.onWarning('Deprecated syntax used');
      
      expect(mockStderr.getData()).toBe('WARN: Deprecated syntax used\n');
    });
    
    it('should output validation failures', () => {
      const errors: TransclusionError[] = [
        { message: 'Error 1', path: 'file1.md' },
        { message: 'Error 2', path: 'file2.md' }
      ];
      
      formatter.onValidationComplete(errors);
      
      expect(mockStderr.getData()).toContain('Validation failed with 2 error(s)');
    });
  });
  
  describe('VerboseFormatter', () => {
    let formatter: VerboseFormatter;
    
    beforeEach(() => {
      formatter = new VerboseFormatter(mockStderr as any, mockStdout as any);
    });
    
    it('should output detailed processing information', () => {
      formatter.onProcessingStart('/path/to/file.md');
      expect(mockStderr.getData()).toContain('[INFO] Starting transclusion processing');
      expect(mockStderr.getData()).toContain('[INFO] Input: /path/to/file.md');
      
      mockStderr.clear();
      formatter.onFileRead('/path/to/include.md');
      expect(mockStderr.getData()).toContain('[INFO] Reading file: /path/to/include.md');
      
      mockStderr.clear();
      const stats: ProcessingStats = {
        filesProcessed: 3,
        transclusionsResolved: 2,
        warnings: 1,
        errors: 0,
        duration: 150
      };
      formatter.onProcessingComplete(stats);
      
      const output = mockStderr.getData();
      expect(output).toContain('[INFO] Processing complete');
      expect(output).toContain('[INFO] Files processed: 3');
      expect(output).toContain('[INFO] Transclusions resolved: 2');
      expect(output).toContain('[INFO] Warnings: 1');
      expect(output).toContain('[INFO] Errors: 0');
      expect(output).toContain('[INFO] Duration: 150ms');
    });
    
    it('should output detailed error information', () => {
      const error: TransclusionError = {
        message: 'Circular reference detected',
        path: '/path/to/circular.md',
        line: 25,
        code: 'CIRCULAR_REFERENCE'
      };
      
      formatter.onError(error);
      
      const output = mockStderr.getData();
      expect(output).toContain('[WARN] Circular reference detected');
      expect(output).toContain('[WARN] Location: /path/to/circular.md:25');
      expect(output).toContain('[WARN] Code: CIRCULAR_REFERENCE');
    });
    
    it('should show validation results', () => {
      formatter.onValidationComplete([]);
      expect(mockStderr.getData()).toContain('[INFO] Validation passed - all transclusions are valid');
      
      mockStderr.clear();
      const errors: TransclusionError[] = [
        { message: 'Error 1', path: 'file1.md', line: 10 }
      ];
      formatter.onValidationComplete(errors);
      
      const output = mockStderr.getData();
      expect(output).toContain('[ERROR] Validation failed with 1 error(s):');
      expect(output).toContain('[ERROR] 1. Error 1 (file1.md:10)');
    });
  });
  
  describe('PorcelainFormatter', () => {
    let formatter: PorcelainFormatter;
    
    beforeEach(() => {
      formatter = new PorcelainFormatter(mockStderr as any, mockStdout as any);
    });
    
    it('should output machine-readable format', () => {
      formatter.onProcessingStart('/path/to/file.md');
      expect(mockStderr.getData()).toBe('');
      
      formatter.onFileRead('/path/to/include.md');
      expect(mockStderr.getData()).toBe('READ\t/path/to/include.md\n');
      
      mockStderr.clear();
      const stats: ProcessingStats = {
        filesProcessed: 5,
        transclusionsResolved: 4,
        warnings: 2,
        errors: 1,
        duration: 200
      };
      formatter.onProcessingComplete(stats);
      
      expect(mockStderr.getData()).toBe('COMPLETE\t5\t4\t2\t1\t200\n');
    });
    
    it('should output errors in tab-separated format', () => {
      const error: TransclusionError = {
        message: 'File not found: missing.md',
        path: '/docs/main.md',
        line: 42,
        code: 'FILE_NOT_FOUND'
      };
      
      formatter.onError(error);
      
      expect(mockStderr.getData()).toBe('WARN\tFILE_NOT_FOUND\tFile not found: missing.md\t/docs/main.md\t42\n');
    });
    
    it('should output warnings in tab-separated format', () => {
      formatter.onWarning('Deprecated syntax');
      
      expect(mockStderr.getData()).toBe('WARN\tDeprecated syntax\n');
    });
    
    it('should output validation results in machine-readable format', () => {
      formatter.onValidationComplete([]);
      expect(mockStderr.getData()).toBe('VALIDATION_PASSED\t0\n');
      
      mockStderr.clear();
      const errors: TransclusionError[] = [
        { message: 'Error 1', path: 'file1.md', line: 10, code: 'ERR1' },
        { message: 'Error 2', path: 'file2.md', code: 'ERR2' }
      ];
      formatter.onValidationComplete(errors);
      
      const output = mockStderr.getData();
      expect(output).toContain('VALIDATION_FAILED\t2\n');
      expect(output).toContain('VALIDATION_ERROR\tERR1\tError 1\tfile1.md\t10\n');
      expect(output).toContain('VALIDATION_ERROR\tERR2\tError 2\tfile2.md\n');
    });
  });
  
  describe('ProgressFormatter', () => {
    let formatter: ProgressFormatter;
    
    beforeEach(() => {
      formatter = new ProgressFormatter(mockStderr as any, mockStdout as any);
    });
    
    it('should show progress bar', () => {
      formatter.updateProgress(5, 10, 'Processing file.md');
      
      const output = mockStderr.getData();
      expect(output).toContain('[');
      expect(output).toContain(']');
      expect(output).toContain('50%');
      expect(output).toContain('Processing file.md');
    });
    
    it('should clear progress on completion', () => {
      formatter.updateProgress(5, 10);
      formatter.finishProgress();
      
      const output = mockStderr.getData();
      expect(output).toContain('\r\x1b[K');
    });
    
    it('should show completion summary', () => {
      const stats: ProcessingStats = {
        filesProcessed: 10,
        transclusionsResolved: 8,
        warnings: 1,
        errors: 0,
        duration: 500
      };
      
      formatter.onProcessingComplete(stats);
      
      const output = mockStderr.getData();
      expect(output).toContain('✓ Processing complete: 10 files, 8 transclusions (500ms)');
    });
    
    it('should handle errors during progress', () => {
      formatter.updateProgress(3, 10);
      
      const error: TransclusionError = {
        message: 'Parse error',
        path: 'bad.md',
        line: 5
      };
      formatter.onError(error);
      
      const output = mockStderr.getData();
      expect(output).toContain('⚠ Warning: Parse error in bad.md:5');
    });
  });
  
  describe('createFormatter', () => {
    it('should create correct formatter based on mode', () => {
      expect(createFormatter(OutputMode.DEFAULT, mockStderr as any, mockStdout as any))
        .toBeInstanceOf(DefaultFormatter);
      
      expect(createFormatter(OutputMode.VERBOSE, mockStderr as any, mockStdout as any))
        .toBeInstanceOf(VerboseFormatter);
      
      expect(createFormatter(OutputMode.PORCELAIN, mockStderr as any, mockStdout as any))
        .toBeInstanceOf(PorcelainFormatter);
      
      expect(createFormatter(OutputMode.PROGRESS, mockStderr as any, mockStdout as any))
        .toBeInstanceOf(ProgressFormatter);
    });
  });
});