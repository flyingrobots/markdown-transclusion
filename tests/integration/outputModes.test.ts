import { runCli } from '../../src/cliCore';
import { Readable, Writable } from 'stream';
import { createReadStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { TransclusionTransform } from '../../src/stream';

jest.mock('fs');
jest.mock('stream/promises');
jest.mock('../../src/stream');

describe('CLI Output Modes Integration', () => {
  let mockStdin: Readable;
  let mockStdout: MockWriteStream;
  let mockStderr: MockWriteStream;
  let mockExit: jest.Mock;
  
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
    jest.clearAllMocks();
    
    mockStdin = new Readable({ read() {} });
    mockStdout = new MockWriteStream();
    mockStderr = new MockWriteStream();
    mockExit = jest.fn();
    
    // Mock pipeline to succeed
    (pipeline as jest.Mock).mockResolvedValue(undefined);
    
    // Mock file reading
    (createReadStream as jest.Mock).mockImplementation((path: string) => {
      const stream = new Readable({ read() {} });
      stream.push('# Test Document\n\n![[included.md]]\n\nEnd of document.');
      stream.push(null);
      return stream;
    });
  });
  
  describe('Default Mode', () => {
    it('should output only errors by default', async () => {
      // Mock a successful transform with no errors
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: [],
        getProcessedFiles: jest.fn(() => ['included.md'])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      // In default mode, no metadata should be output
      expect(mockStderr.getData()).toBe('');
      // Exit code should be 0
      expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('should show errors in default mode', async () => {
      // Mock a transform with errors
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { message: 'File not found', path: 'missing.md', code: 'FILE_NOT_FOUND' }
        ],
        processedFiles: [],
        getProcessedFiles: jest.fn(() => [])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      // Error should appear on stderr
      expect(mockStderr.getData()).toContain('Error: File not found');
      expect(mockStderr.getData()).toContain('in missing.md');
    });
  });
  
  describe('Verbose Mode', () => {
    it('should output detailed progress information', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['included.md'],
        getProcessedFiles: jest.fn(() => ['included.md'])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--verbose'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      // Simulate file event
      const fileHandler = mockTransform.on.mock.calls.find(call => call[0] === 'file')?.[1];
      if (fileHandler) {
        fileHandler('included.md');
      }
      
      const stderrOutput = mockStderr.getData();
      expect(stderrOutput).toContain('[INFO] Starting transclusion processing');
      expect(stderrOutput).toContain('[INFO] Input:');
      expect(stderrOutput).toContain('test.md');
      expect(stderrOutput).toContain('[INFO] Processing complete');
      expect(stderrOutput).toContain('[INFO] Files processed:');
      expect(stderrOutput).toContain('[INFO] Transclusions resolved:');
      expect(stderrOutput).toContain('[INFO] Duration:');
    });
  });
  
  describe('Porcelain Mode', () => {
    it('should output machine-readable format', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['included.md'],
        getProcessedFiles: jest.fn(() => ['included.md'])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--porcelain'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      // Simulate file event
      const fileHandler = mockTransform.on.mock.calls.find(call => call[0] === 'file')?.[1];
      if (fileHandler) {
        fileHandler('included.md');
      }
      
      const stderrOutput = mockStderr.getData();
      // Should contain tab-separated values
      expect(stderrOutput).toMatch(/READ\t.*included\.md/);
      expect(stderrOutput).toMatch(/COMPLETE\t\d+\t\d+\t\d+\t\d+\t\d+/);
    });
    
    it('should output errors in porcelain format', async () => {
      // Mock a transform with errors
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { message: 'File not found', path: 'missing.md', code: 'FILE_NOT_FOUND' }
        ],
        processedFiles: [],
        getProcessedFiles: jest.fn(() => [])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--porcelain'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      const stderrOutput = mockStderr.getData();
      // Should show the error in COMPLETE line and include the error count
      expect(stderrOutput).toMatch(/COMPLETE\t\d+\t\d+\t\d+\t1\t\d+/);
    });
  });
  
  describe('Progress Mode', () => {
    it('should show progress bars', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['included.md'],
        getProcessedFiles: jest.fn(() => ['included.md'])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--progress'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      const stderrOutput = mockStderr.getData();
      expect(stderrOutput).toContain('Processing');
      expect(stderrOutput).toContain('test.md');
      expect(stderrOutput).toContain('✓ Processing complete:');
    });
  });
  
  describe('Validation Mode with Output Modes', () => {
    it('should work with verbose validation', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: [],
        getProcessedFiles: jest.fn(() => [])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--validate-only', '--verbose'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      const stderrOutput = mockStderr.getData();
      expect(stderrOutput).toContain('[INFO] Validation passed');
      
      // No content in validation mode
      expect(mockStdout.getData()).toBe('');
    });
    
    it('should work with porcelain validation', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: [],
        getProcessedFiles: jest.fn(() => [])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--validate-only', '--porcelain'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      const stderrOutput = mockStderr.getData();
      expect(stderrOutput).toContain('VALIDATION_PASSED\t0');
      
      // No content in validation mode
      expect(mockStdout.getData()).toBe('');
    });
  });
  
  describe('Dry Run Mode with Output Modes', () => {
    it('should work with porcelain dry run', async () => {
      // Mock a successful transform
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['included.md'],
        getProcessedFiles: jest.fn(() => ['included.md'])
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--dry-run', '--porcelain'],
        stdin: mockStdin,
        stdout: mockStdout as any,
        stderr: mockStderr as any,
        exit: mockExit
      });
      
      const stdoutOutput = mockStdout.getData();
      expect(stdoutOutput).toContain('DRY_RUN\tSTART');
      expect(stdoutOutput).toContain('DRY_RUN\tINPUT\ttest.md');
      expect(stdoutOutput).toContain('DRY_RUN\tCONTENT_START');
      expect(stdoutOutput).toContain('DRY_RUN\tCONTENT_END');
      expect(stdoutOutput).toContain('DRY_RUN\tCOMPLETE\tSUCCESS');
    });
  });
});