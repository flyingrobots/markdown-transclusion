import { 
  LogLevel, 
  ConsoleLogger, 
  SilentLogger, 
  StreamLogger,
  createLogger,
  type Logger 
} from '../../src/utils/logger';
import { Writable } from 'stream';

describe('Logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('ConsoleLogger', () => {
    it('should respect log levels', () => {
      const logger = new ConsoleLogger(LogLevel.WARN);
      
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
    
    it('should format messages with level prefix', () => {
      const logger = new ConsoleLogger(LogLevel.ERROR);
      
      logger.error('Test error');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      const message = call[0];
      
      // Check format: [LEVEL] message
      expect(message).toBe('[ERROR] Test error');
    });
    
    it('should handle data parameter', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);
      const data = { key: 'value', count: 42 };
      
      logger.error('Error with data', data);
      logger.warn('Warn with data', data);
      logger.info('Info with data', data);
      logger.debug('Debug with data', data);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), data);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String), data);
      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.any(String), data);
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.any(String), data);
    });
    
    it('should handle empty data parameter', () => {
      const logger = new ConsoleLogger(LogLevel.INFO);
      
      logger.info('Message without data');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.any(String), '');
    });
    
    it('should change log level dynamically', () => {
      const logger = new ConsoleLogger(LogLevel.ERROR);
      
      logger.info('Should not appear');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      
      logger.setLevel(LogLevel.INFO);
      logger.info('Should appear');
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should handle all log levels', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);
      
      logger.error('Error');
      logger.warn('Warning');
      logger.info('Info');
      logger.debug('Debug');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('SilentLogger', () => {
    it('should not output anything', () => {
      const logger = new SilentLogger();
      
      logger.error('Error');
      logger.warn('Warning');
      logger.info('Info');
      logger.debug('Debug');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
    
    it('should allow setting level without effect', () => {
      const logger = new SilentLogger();
      
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Still silent');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('StreamLogger', () => {
    let errorStream: MockStream;
    let outStream: MockStream;
    
    class MockStream extends Writable {
      public data: string[] = [];
      
      _write(chunk: any, encoding: string, callback: Function): void {
        this.data.push(chunk.toString());
        callback();
      }
      
      write(chunk: any): boolean {
        this._write(chunk, 'utf8', () => {});
        return true;
      }
    }
    
    beforeEach(() => {
      errorStream = new MockStream();
      outStream = new MockStream();
    });
    
    it('should write to appropriate streams', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.DEBUG);
      
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      // Error and warn go to error stream
      expect(errorStream.data.filter(d => d.includes('ERROR'))).toHaveLength(1);
      expect(errorStream.data.filter(d => d.includes('WARN'))).toHaveLength(1);
      expect(errorStream.data.filter(d => d.includes('INFO'))).toHaveLength(0);
      expect(errorStream.data.filter(d => d.includes('DEBUG'))).toHaveLength(0);
      
      // Info and debug go to out stream
      expect(outStream.data.filter(d => d.includes('INFO'))).toHaveLength(1);
      expect(outStream.data.filter(d => d.includes('DEBUG'))).toHaveLength(1);
    });
    
    it('should format messages correctly', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.INFO);
      
      logger.info('Test message');
      
      const output = outStream.data[0];
      expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO\s+Test message\n$/);
    });
    
    it('should handle data objects', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.INFO);
      const data = { test: 'value', nested: { prop: 123 } };
      
      logger.info('Message with data', data);
      
      expect(outStream.data).toHaveLength(2);
      expect(outStream.data[0]).toContain('Message with data');
      
      const jsonData = JSON.parse(outStream.data[1]);
      expect(jsonData).toEqual(data);
    });
    
    it('should respect log level', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.WARN);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');
      
      expect(outStream.data).toHaveLength(0); // Nothing goes to out stream
      expect(errorStream.data.filter(d => d.includes('WARN'))).toHaveLength(1);
      expect(errorStream.data.filter(d => d.includes('ERROR'))).toHaveLength(1);
      expect(errorStream.data.filter(d => d.includes('DEBUG'))).toHaveLength(0);
      expect(errorStream.data.filter(d => d.includes('INFO'))).toHaveLength(0);
    });
    
    it('should handle default streams', () => {
      // Just verify it doesn't crash without streams
      const logger = new StreamLogger();
      
      // Should write to process.stderr and process.stdout
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
      
      logger.error('Error');
      logger.info('Info');
      
      expect(stderrSpy).toHaveBeenCalled();
      expect(stdoutSpy).toHaveBeenCalled();
      
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    });
  });
  
  describe('createLogger', () => {
    it('should create ConsoleLogger by default', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
    
    it('should create SilentLogger when silent option is true', () => {
      const logger = createLogger({ silent: true });
      expect(logger).toBeInstanceOf(SilentLogger);
    });
    
    it('should create StreamLogger when streams are provided', () => {
      const errorStream = new Writable();
      const outStream = new Writable();
      
      const logger = createLogger({
        streams: { error: errorStream as any, out: outStream as any }
      });
      
      expect(logger).toBeInstanceOf(StreamLogger);
    });
    
    it('should respect log level option', () => {
      const logger = createLogger({ level: LogLevel.ERROR });
      
      logger.warn('Should not appear');
      logger.error('Should appear');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should handle partial options', () => {
      const logger1 = createLogger({ level: LogLevel.DEBUG });
      const logger2 = createLogger({ silent: false });
      
      expect(logger1).toBeInstanceOf(ConsoleLogger);
      expect(logger2).toBeInstanceOf(ConsoleLogger);
    });
  });
  
  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
    
    it('should have correct string representations', () => {
      expect(LogLevel[LogLevel.ERROR]).toBe('ERROR');
      expect(LogLevel[LogLevel.WARN]).toBe('WARN');
      expect(LogLevel[LogLevel.INFO]).toBe('INFO');
      expect(LogLevel[LogLevel.DEBUG]).toBe('DEBUG');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle undefined and null messages', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);
      
      logger.info(undefined as any);
      logger.info(null as any);
      logger.info('');
      
      expect(consoleInfoSpy).toHaveBeenCalledTimes(3);
    });
    
    it('should handle circular references in data', () => {
      const logger = new ConsoleLogger(LogLevel.INFO);
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw
      expect(() => logger.info('Circular data', circular)).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
    
    it('should handle very long messages', () => {
      const logger = new ConsoleLogger(LogLevel.INFO);
      const longMessage = 'x'.repeat(10000);
      
      logger.info(longMessage);
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      expect(call[0]).toContain(longMessage);
    });
  });
});