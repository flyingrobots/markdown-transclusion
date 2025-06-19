import { runCli } from '../src/cliCore';
import { Readable, Writable } from 'stream';
import { TransclusionTransform } from '../src/stream';
import { parseCliArgs, getHelpText, getVersionText } from '../src/utils/cliArgs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

jest.mock('fs');
jest.mock('stream/promises');
jest.mock('../src/stream');
jest.mock('../src/utils/cliArgs');

describe('cliCore', () => {
  let mockStdin: Readable;
  let mockStdout: any;  // NodeJS.WriteStream is complex, using any for test
  let mockStderr: any;  // NodeJS.WriteStream is complex, using any for test
  let mockExit: jest.Mock;
  let stdoutData: string[];
  let stderrData: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock streams
    stdoutData = [];
    stderrData = [];
    
    mockStdin = new Readable({
      read() {}
    });
    
    // Create minimal WriteStream mocks
    mockStdout = {
      write: jest.fn((chunk: any, encoding?: any, callback?: any) => {
        stdoutData.push(chunk.toString());
        if (typeof encoding === 'function') {
          encoding();
          return true;
        }
        if (callback) callback();
        return true;
      })
    };
    
    mockStderr = {
      write: jest.fn((chunk: any, encoding?: any, callback?: any) => {
        stderrData.push(chunk.toString());
        if (typeof encoding === 'function') {
          encoding();
          return true;
        }
        if (callback) callback();
        return true;
      })
    };
    
    mockExit = jest.fn();
    
    // Default mock implementations
    (pipeline as jest.Mock).mockResolvedValue(undefined);
    (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => ({
      on: jest.fn(),
      errors: []
    }));
  });

  describe('Help and Version', () => {
    it('should display help with --help flag', async () => {
      const helpText = 'Usage: markdown-transclusion [options]';
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { help: true } 
      });
      (getHelpText as jest.Mock).mockReturnValue(helpText);
      
      await runCli({
        argv: ['node', 'cli.js', '--help'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(stdoutData.join('')).toBe(helpText + '\n');
      expect(mockExit).toHaveBeenCalledWith(0);
    });
    
    it('should display version with --version flag', async () => {
      const versionText = '1.0.0';
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { version: true } 
      });
      (getVersionText as jest.Mock).mockReturnValue(versionText);
      
      await runCli({
        argv: ['node', 'cli.js', '--version'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(stdoutData.join('')).toBe(versionText + '\n');
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('Argument Parsing', () => {
    it('should handle parse errors', async () => {
      const errorMessage = 'Unknown flag: --invalid';
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: false, 
        error: new Error(errorMessage) 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--invalid'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(stderrData.join('')).toContain(errorMessage);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Stream Processing', () => {
    it('should process stdin to stdout by default', async () => {
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: {} 
      });
      
      await runCli({
        argv: ['node', 'cli.js'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(TransclusionTransform).toHaveBeenCalledWith({
        basePath: process.cwd(),
        extensions: ['md', 'markdown'],
        variables: undefined,
        strict: undefined,
        maxDepth: 10,
        validateOnly: undefined
      });
      
      expect(pipeline).toHaveBeenCalledWith(
        mockStdin,
        expect.any(Object),
        mockStdout
      );
      expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('should read from file when input is specified', async () => {
      const mockFileStream = new Readable({ read() {} });
      (createReadStream as jest.Mock).mockReturnValue(mockFileStream);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { input: 'input.md' } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', 'input.md'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(createReadStream).toHaveBeenCalledWith(expect.stringContaining('input.md'));
      expect(pipeline).toHaveBeenCalledWith(
        mockFileStream,
        expect.any(Object),
        mockStdout
      );
    });
    
    it('should write to file when output is specified', async () => {
      const mockFileStream = new Writable({ write() {} });
      (createWriteStream as jest.Mock).mockReturnValue(mockFileStream);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { output: 'output.md' } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--output', 'output.md'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(createWriteStream).toHaveBeenCalledWith(expect.stringContaining('output.md'));
      expect(pipeline).toHaveBeenCalledWith(
        mockStdin,
        expect.any(Object),
        mockFileStream
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle transform errors in non-strict mode', async () => {
      const error = new Error('File not found');
      const mockTransform = {
        on: jest.fn(),
        errors: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: {} 
      });
      
      await runCli({
        argv: ['node', 'cli.js'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // Simulate error event
      const errorHandler = mockTransform.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(error);
      
      expect(stderrData.join('')).toContain('Error: File not found');
      expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('should exit on transform errors in strict mode', async () => {
      const error = new Error('File not found');
      const mockTransform = {
        on: jest.fn(),
        errors: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { strict: true } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--strict'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // Simulate error event
      const errorHandler = mockTransform.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(error);
      
      // Wait for graceful exit to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(stderrData.join('')).toContain('Error: File not found');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    it('should report accumulated errors after processing', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { path: 'file1.md', line: 10, message: 'Missing reference' },
          { path: 'file2.md', message: 'File not found' }
        ]
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: {} 
      });
      
      await runCli({
        argv: ['node', 'cli.js'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // In default mode, errors are shown in simple format
      expect(stderrData.join('')).toContain('Error: Missing reference');
      expect(stderrData.join('')).toContain('in file1.md:10');
      expect(stderrData.join('')).toContain('Error: File not found');
      expect(stderrData.join('')).toContain('in file2.md');
      expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('should exit on accumulated errors in strict mode', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { path: 'file1.md', message: 'Missing reference' }
        ]
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { strict: true } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--strict'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // In default mode with strict, just the error is shown
      expect(stderrData.join('')).toContain('Error: Missing reference');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    it('should handle fatal errors', async () => {
      const error = new Error('ENOENT: no such file');
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { input: 'missing.md' } 
      });
      (pipeline as jest.Mock).mockRejectedValue(error);
      
      await runCli({
        argv: ['node', 'cli.js', 'missing.md'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(stderrData.join('')).toContain('Fatal error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Validation Mode', () => {
    it('should report validation success', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { validateOnly: true } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--validate-only'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // In default mode, validation success is silent
      expect(stderrData.join('')).toBe('');
      expect(stdoutData.join('')).toBe('');
    });
    
    it('should report validation issues', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { path: 'file.md', message: 'Missing reference' },
          { path: 'file2.md', message: 'Invalid path' }
        ]
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { validateOnly: true } 
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--validate-only'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // In default mode, validation shows errors on stderr
      expect(stderrData.join('')).toContain('Validation failed with 2 error(s)');
    });
  });

  describe('Dry Run Mode', () => {
    it('should display dry run header and collect output in buffer', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['sections/intro.md']
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true, input: 'test.md' } 
      });
      
      // Mock pipeline to simulate processed content
      (pipeline as jest.Mock).mockImplementation(async (input: any, transform: any, output: any) => {
        // Simulate writing content to the buffer
        output.write(Buffer.from('# Test Document\n\nProcessed content here.\n'));
      });
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--dry-run'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      const output = stdoutData.join('');
      expect(output).toContain('🔍 DRY RUN MODE - No files will be modified');
      expect(output).toContain('Processing: test.md');
      expect(output).toContain('├── Reading: sections/intro.md');
      expect(output).toContain('=== PROCESSED CONTENT ===');
      expect(output).toContain('# Test Document');
      expect(output).toContain('=== SUMMARY ===');
      expect(output).toContain('📄 Files processed: 2');
      expect(output).toContain('🔗 Transclusions resolved: 1');
      expect(output).toContain('❌ Errors: 0');
      expect(output).toContain('✓ Dry run completed successfully');
    });
    
    it('should handle dry run with errors', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [
          { path: 'missing.md', message: 'File not found: missing.md' },
          { path: 'invalid.md', message: 'Invalid reference' }
        ],
        processedFiles: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true, input: 'test.md' } 
      });
      
      (pipeline as jest.Mock).mockImplementation(async (input: any, transform: any, output: any) => {
        output.write(Buffer.from('# Test Document\n\n<!-- Error comments here -->\n'));
      });
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--dry-run'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      const output = stdoutData.join('');
      expect(output).toContain('🔍 DRY RUN MODE - No files will be modified');
      expect(output).toContain('└── No transclusions found');
      expect(output).toContain('❌ Errors: 2');
      expect(output).toContain('⚠️  Dry run completed with errors');
      expect(output).toContain('Fix issues before actual processing');
      
      // Errors are no longer shown on stderr in dry run mode, they're in the dry run output
      const dryRunOutput = stdoutData.join('');
      expect(dryRunOutput).toContain('❌ Errors: 2');
      expect(dryRunOutput).toContain('⚠️  Dry run completed with errors');
    });
    
    it('should handle dry run from stdin', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: ['lib/utils.md', 'examples/basic.md']
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true } // No input file specified
      });
      
      (pipeline as jest.Mock).mockImplementation(async (input: any, transform: any, output: any) => {
        output.write(Buffer.from('Content from stdin\n'));
      });
      
      await runCli({
        argv: ['node', 'cli.js', '--dry-run'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      const output = stdoutData.join('');
      expect(output).toContain('Processing: stdin');
      expect(output).toContain('├── Reading: lib/utils.md');
      expect(output).toContain('├── Reading: examples/basic.md');
      expect(output).toContain('📄 Files processed: 3');
      expect(output).toContain('🔗 Transclusions resolved: 2');
    });
    
    it('should show correct ready command with output flag', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true, input: 'docs.md', output: 'result.md' } 
      });
      
      (pipeline as jest.Mock).mockImplementation(async (input: any, transform: any, output: any) => {
        output.write(Buffer.from('Simple content\n'));
      });
      
      await runCli({
        argv: ['node', 'cli.js', 'docs.md', '--dry-run', '--output', 'result.md'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      const output = stdoutData.join('');
      expect(output).toContain('Ready for actual processing with: markdown-transclusion docs.md --output result.md');
    });
    
    it('should show correct ready command without output flag', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true, input: 'docs.md' } 
      });
      
      (pipeline as jest.Mock).mockImplementation(async (input: any, transform: any, output: any) => {
        output.write(Buffer.from('Simple content\n'));
      });
      
      await runCli({
        argv: ['node', 'cli.js', 'docs.md', '--dry-run'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      const output = stdoutData.join('');
      expect(output).toContain('Ready for actual processing with: markdown-transclusion docs.md');
    });
    
    it('should use buffer stream instead of file output in dry run', async () => {
      const mockTransform = {
        on: jest.fn(),
        errors: [],
        processedFiles: []
      };
      
      (TransclusionTransform as unknown as jest.Mock).mockImplementation(() => mockTransform);
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: { dryRun: true, input: 'test.md', output: 'should-be-ignored.md' } 
      });
      
      const mockFileStream = { write: jest.fn() };
      (createWriteStream as jest.Mock).mockReturnValue(mockFileStream);
      
      await runCli({
        argv: ['node', 'cli.js', 'test.md', '--dry-run', '--output', 'should-be-ignored.md'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      // Should not create a file stream when in dry run mode
      expect(createWriteStream).not.toHaveBeenCalled();
      expect(mockFileStream.write).not.toHaveBeenCalled();
    });
  });

  describe('Options Configuration', () => {
    it('should pass all options to TransclusionTransform', async () => {
      const options = {
        basePath: '/custom/path',
        extensions: ['md', 'txt'],
        variables: { lang: 'en', version: 'v2' },
        strict: true,
        maxDepth: 5,
        validateOnly: true,
        logLevel: 2
      };
      
      (parseCliArgs as jest.Mock).mockReturnValue({ 
        ok: true, 
        value: options 
      });
      
      await runCli({
        argv: ['node', 'cli.js'],
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        exit: mockExit
      });
      
      expect(TransclusionTransform).toHaveBeenCalledWith({
        basePath: options.basePath,
        extensions: options.extensions,
        variables: options.variables,
        strict: options.strict,
        maxDepth: options.maxDepth,
        validateOnly: options.validateOnly
      });
    });
  });
});