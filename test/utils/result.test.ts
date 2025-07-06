import {
  Result,
  Ok,
  Err,
  isOk,
  isErr,
  mapResult,
  mapError,
  andThen,
  unwrap,
  unwrapOr
} from '../../src/utils/result';

describe('Result', () => {
  describe('Creation', () => {
    it('should create Ok result', () => {
      const result = Ok(42);
      
      expect(result.ok).toBe(true);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });
    
    it('should create Error result', () => {
      const error = new Error('Something went wrong');
      const result = Err(error);
      
      expect(result.ok).toBe(false);
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });
    
    it('should handle different value types', () => {
      const stringResult = Ok('hello');
      const objectResult = Ok({ key: 'value' });
      const arrayResult = Ok([1, 2, 3]);
      const nullResult = Ok(null);
      
      if (isOk(stringResult)) expect(stringResult.value).toBe('hello');
      if (isOk(objectResult)) expect(objectResult.value).toEqual({ key: 'value' });
      if (isOk(arrayResult)) expect(arrayResult.value).toEqual([1, 2, 3]);
      if (isOk(nullResult)) expect(nullResult.value).toBe(null);
    });
  });
  
  describe('mapResult', () => {
    it('should transform Ok value', () => {
      const result = Ok(5);
      const mapped = mapResult(result, x => x * 2);
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(10);
      }
    });
    
    it('should not transform Error', () => {
      const error = new Error('Failed');
      const result = Err(error);
      const mapped = mapResult(result, (x: number) => x * 2);
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe(error);
      }
    });
    
    it('should handle type transformations', () => {
      const result = Ok('42');
      const mapped = mapResult(result, str => parseInt(str, 10));
      
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
        expect(typeof mapped.value).toBe('number');
      }
    });
    
    it('should chain multiple maps', () => {
      const result = Ok(2);
      const step1 = mapResult(result, x => x * 3);    // 6
      const step2 = mapResult(step1, x => x + 4);     // 10
      const final = mapResult(step2, x => x / 2);     // 5
      
      if (isOk(final)) {
        expect(final.value).toBe(5);
      }
    });
  });
  
  describe('andThen (flatMap)', () => {
    it('should chain Ok results', () => {
      const divide = (a: number, b: number): Result<number, Error> => {
        if (b === 0) {
          return Err(new Error('Division by zero'));
        }
        return Ok(a / b);
      };
      
      const result = andThen(
        andThen(Ok(10), x => divide(x, 2)),
        x => divide(x, 2.5)
      );
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(2);
      }
    });
    
    it('should short-circuit on Error', () => {
      const divide = (a: number, b: number): Result<number, Error> => {
        if (b === 0) {
          return Err(new Error('Division by zero'));
        }
        return Ok(a / b);
      };
      
      const result = andThen(
        andThen(Ok(10), x => divide(x, 0)),  // Error here
        x => divide(x, 2)                    // Should not execute
      );
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Division by zero');
      }
    });
    
    it('should propagate initial Error', () => {
      const error = new Error('Initial error');
      const result = andThen(
        Err(error),
        x => Ok(x * 2)
      );
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });
  });
  
  describe('mapError', () => {
    it('should transform Error', () => {
      const result = Err(new Error('Original'));
      const mapped = mapError(result, err => new Error(`Wrapped: ${err.message}`));
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error.message).toBe('Wrapped: Original');
      }
    });
    
    it('should not transform Ok', () => {
      const result = Ok(42);
      const mapped = mapError(result, (err: Error) => new Error('Should not run'));
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      }
    });
    
    it('should handle error type transformations', () => {
      interface CustomError {
        code: string;
        details: string;
      }
      
      const result = Err(new Error('Network failed'));
      const mapped = mapError(result, (err): CustomError => ({
        code: 'NETWORK_ERROR',
        details: err.message
      }));
      
      if (isErr(mapped)) {
        expect(mapped.error).toEqual({
          code: 'NETWORK_ERROR',
          details: 'Network failed'
        });
      }
    });
  });
  
  describe('unwrap', () => {
    it('should return value for Ok', () => {
      const result = Ok('success');
      expect(unwrap(result)).toBe('success');
    });
    
    it('should throw for Error', () => {
      const result = Err(new Error('Failed'));
      expect(() => unwrap(result)).toThrow('Failed');
    });
    
    it('should preserve error when throwing', () => {
      const error = new Error('Test error');
      const result = Err(error);
      
      try {
        unwrap(result);
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });
  
  describe('unwrapOr', () => {
    it('should return value for Ok', () => {
      const result = Ok('success');
      expect(unwrapOr(result, 'default')).toBe('success');
    });
    
    it('should return default for Error', () => {
      const result = Err(new Error('Failed'));
      expect(unwrapOr(result, 'default')).toBe('default');
    });
    
    it('should handle different default types', () => {
      const result1 = Err(new Error('Failed'));
      const result2 = Err(new Error('Failed'));
      const result3 = Err(new Error('Failed'));
      
      expect(unwrapOr(result1, 0)).toBe(0);
      expect(unwrapOr(result2, [])).toEqual([]);
      expect(unwrapOr(result3, { key: 'default' })).toEqual({ key: 'default' });
    });
  });
  
  describe('Type Guards', () => {
    it('should narrow types with isOk', () => {
      const result: Result<string, Error> = Ok('test');
      
      if (isOk(result)) {
        // TypeScript should know result.value is available
        const value: string = result.value;
        expect(value).toBe('test');
      }
    });
    
    it('should narrow types with isErr', () => {
      const result: Result<string, Error> = Err(new Error('test'));
      
      if (isErr(result)) {
        // TypeScript should know result.error is available
        const error: Error = result.error;
        expect(error.message).toBe('test');
      }
    });
  });
  
  describe('Real-world Examples', () => {
    it('should handle file reading scenario', () => {
      const readFile = (path: string): Result<string, Error> => {
        if (path.includes('..')) {
          return Err(new Error('Invalid path'));
        }
        if (!path.endsWith('.txt')) {
          return Err(new Error('Not a text file'));
        }
        return Ok(`Contents of ${path}`);
      };
      
      const result = mapResult(
        mapResult(readFile('data.txt'), content => content.toUpperCase()),
        content => content.split(' ')
      );
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(['CONTENTS', 'OF', 'DATA.TXT']);
      }
      
      const errorResult = readFile('../etc/passwd');
      expect(isErr(errorResult)).toBe(true);
      if (isErr(errorResult)) {
        expect(errorResult.error.message).toBe('Invalid path');
      }
    });
    
    it('should handle parsing scenario', () => {
      const parseJSON = <T>(input: string): Result<T, Error> => {
        try {
          return Ok(JSON.parse(input));
        } catch (e) {
          return Err(e as Error);
        }
      };
      
      const validResult = parseJSON<{ name: string }>('{"name": "test"}');
      if (isOk(validResult)) {
        expect(validResult.value).toEqual({ name: 'test' });
      }
      
      const invalidResult = parseJSON('invalid json');
      expect(isErr(invalidResult)).toBe(true);
      if (isErr(invalidResult)) {
        expect(invalidResult.error.message).toContain('JSON');
      }
    });
    
    it('should compose multiple operations', () => {
      const parseNumber = (s: string): Result<number, Error> => {
        const n = parseInt(s, 10);
        return isNaN(n) 
          ? Err(new Error(`Invalid number: ${s}`))
          : Ok(n);
      };
      
      const divide = (a: number, b: number): Result<number, Error> => {
        return b === 0
          ? Err(new Error('Division by zero'))
          : Ok(a / b);
      };
      
      const calculate = (input: string): Result<number, Error> => {
        return mapResult(
          andThen(parseNumber(input), n => divide(100, n)),
          n => Math.round(n * 100) / 100
        );
      };
      
      const result1 = calculate('20');
      if (isOk(result1)) expect(result1.value).toBe(5);
      
      const result2 = calculate('0');
      if (isErr(result2)) expect(result2.error.message).toBe('Division by zero');
      
      const result3 = calculate('abc');
      if (isErr(result3)) expect(result3.error.message).toBe('Invalid number: abc');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle undefined and null in Ok', () => {
      const undefinedResult = Ok(undefined);
      const nullResult = Ok(null);
      
      expect(isOk(undefinedResult)).toBe(true);
      expect(isOk(nullResult)).toBe(true);
      
      if (isOk(undefinedResult)) expect(undefinedResult.value).toBeUndefined();
      if (isOk(nullResult)) expect(nullResult.value).toBeNull();
    });
    
    it('should handle non-Error types in Err', () => {
      const stringError = Err('string error');
      const numberError = Err(404);
      const objectError = Err({ code: 'E001', message: 'Custom error' });
      
      expect(isErr(stringError)).toBe(true);
      expect(isErr(numberError)).toBe(true);
      expect(isErr(objectError)).toBe(true);
      
      if (isErr(stringError)) expect(stringError.error).toBe('string error');
      if (isErr(numberError)) expect(numberError.error).toBe(404);
      if (isErr(objectError)) expect(objectError.error).toEqual({ code: 'E001', message: 'Custom error' });
    });
  });
});