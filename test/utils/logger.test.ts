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
    
    it('should capture logs internally', () => {
      const logger = new SilentLogger();
      
      logger.error('Error message', { error: true });
      logger.warn('Warning message');
      logger.info('Info message', { data: 'test' });
      logger.debug('Debug message');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
      
      expect(logs[0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error message',
        data: { error: true }
      });
      expect(logs[0].timestamp).toBeInstanceOf(Date);
      
      expect(logs[1]).toMatchObject({
        level: LogLevel.WARN,
        message: 'Warning message'
      });
      
      expect(logs[2]).toMatchObject({
        level: LogLevel.INFO,
        message: 'Info message',
        data: { data: 'test' }
      });
      
      expect(logs[3]).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'Debug message'
      });
    });
    
    it('should clear logs', () => {
      const logger = new SilentLogger();
      
      logger.error('Error 1');
      logger.warn('Warning 1');
      
      let logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      
      logger.clear();
      
      logs = logger.getLogs();
      expect(logs).toHaveLength(0);
      
      // Can log after clearing
      logger.info('New log');
      logs = logger.getLogs();
      expect(logs).toHaveLength(1);
    });
    
    it('should return a copy of logs', () => {
      const logger = new SilentLogger();
      
      logger.info('Test log');
      
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      
      expect(logs1).not.toBe(logs2); // Different array instances
      expect(logs1).toEqual(logs2); // Same content
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
    
    it('should handle data objects for all log levels', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.DEBUG);
      const errorData = { error: 'details', code: 500 };
      const warnData = { warning: 'potential issue' };
      const debugData = { debug: 'info', trace: ['a', 'b', 'c'] };
      
      logger.error('Error with data', errorData);
      logger.warn('Warning with data', warnData);
      logger.debug('Debug with data', debugData);
      
      // Error stream should have error message + data + warn message + data
      expect(errorStream.data).toHaveLength(4);
      expect(errorStream.data[0]).toContain('ERROR');
      expect(JSON.parse(errorStream.data[1])).toEqual(errorData);
      expect(errorStream.data[2]).toContain('WARN');
      expect(JSON.parse(errorStream.data[3])).toEqual(warnData);
      
      // Out stream should have debug message + data
      expect(outStream.data).toHaveLength(2);
      expect(outStream.data[0]).toContain('DEBUG');
      expect(JSON.parse(outStream.data[1])).toEqual(debugData);
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
    
    it('should handle partial stream configuration', () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      
      const logger1 = new StreamLogger(undefined, outStream as any);
      const logger2 = new StreamLogger(errorStream as any, undefined);
      
      // Logger1: undefined error stream should use process.stderr
      logger1.error('Error to default');
      expect(stderrSpy).toHaveBeenCalled();
      
      // Logger2: undefined out stream should use process.stdout  
      logger2.info('Info to default');
      expect(stdoutSpy).toHaveBeenCalled();
      
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    });
    
    it('should handle setLevel dynamically', () => {
      const logger = new StreamLogger(errorStream as any, outStream as any, LogLevel.ERROR);
      
      logger.debug('Should not appear');
      logger.info('Should not appear');
      logger.warn('Should not appear');
      logger.error('Should appear');
      
      expect(errorStream.data).toHaveLength(1);
      expect(outStream.data).toHaveLength(0);
      
      // Change level to DEBUG
      logger.setLevel(LogLevel.DEBUG);
      
      logger.debug('Now should appear');
      logger.info('Also should appear');
      
      expect(outStream.data).toHaveLength(2);
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
    
    it('should handle undefined options', () => {
      const logger = createLogger(undefined);
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
    
    it('should handle empty options object', () => {
      const logger = createLogger({});
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
    
    it('should prioritize silent over streams', () => {
      const logger = createLogger({
        silent: true,
        streams: { error: process.stderr, out: process.stdout }
      });
      expect(logger).toBeInstanceOf(SilentLogger);
    });
    
    it('should handle partial streams object', () => {
      const logger1 = createLogger({ streams: { error: process.stderr } });
      const logger2 = createLogger({ streams: { out: process.stdout } });
      const logger3 = createLogger({ streams: {} });
      
      expect(logger1).toBeInstanceOf(StreamLogger);
      expect(logger2).toBeInstanceOf(StreamLogger);
      expect(logger3).toBeInstanceOf(StreamLogger);
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