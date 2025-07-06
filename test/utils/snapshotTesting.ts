import { diff } from 'jest-diff';

/**
 * Snapshot test configuration
 */
export interface SnapshotConfig {
  name: string;
  updateSnapshots?: boolean;
  customSerializer?: (value: any) => string;
}

/**
 * Enhanced snapshot testing for transclusion outputs
 */
export class TransclusionSnapshot {
  /**
   * Create a formatted snapshot of transclusion output
   */
  static format(content: string, metadata?: Record<string, any>): string {
    const lines = ['=== TRANSCLUSION OUTPUT ==='];
    
    if (metadata) {
      lines.push('--- METADATA ---');
      for (const [key, value] of Object.entries(metadata)) {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
      lines.push('--- CONTENT ---');
    }
    
    lines.push(content);
    lines.push('=== END OUTPUT ===');
    
    return lines.join('\n');
  }
  
  /**
   * Compare transclusion output with snapshot
   */
  static compare(actual: string, expected: string): {
    pass: boolean;
    diff?: string;
  } {
    if (actual === expected) {
      return { pass: true };
    }
    
    const diffResult = diff(expected, actual, {
      expand: false,
      contextLines: 3
    });
    
    return {
      pass: false,
      diff: diffResult || undefined
    };
  }
  
  /**
   * Create a visual diff for complex transclusions
   */
  static visualDiff(actual: string, expected: string): string {
    const actualLines = actual.split('\n');
    const expectedLines = expected.split('\n');
    const maxLength = Math.max(actualLines.length, expectedLines.length);
    const output: string[] = [];
    
    output.push('┌─── Expected ───┬─── Actual ───┐');
    
    for (let i = 0; i < maxLength; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';
      const marker = expectedLine === actualLine ? ' ' : '≠';
      
      output.push(
        `│ ${this.padEnd(expectedLine, 15)} │ ${this.padEnd(actualLine, 15)} │ ${marker}`
      );
    }
    
    output.push('└────────────────┴───────────────┘');
    
    return output.join('\n');
  }
  
  private static padEnd(str: string, length: number): string {
    if (str.length >= length) {
      return str.substring(0, length - 3) + '...';
    }
    return str.padEnd(length);
  }
}

/**
 * Custom Jest matchers for transclusion testing
 */
export const transclusionMatchers = {
  /**
   * Check if output matches transclusion pattern
   */
  toMatchTransclusionOutput(
    received: string,
    expected: string,
    metadata?: Record<string, any>
  ) {
    const formattedExpected = TransclusionSnapshot.format(expected, metadata);
    const formattedReceived = TransclusionSnapshot.format(received, metadata);
    const comparison = TransclusionSnapshot.compare(formattedReceived, formattedExpected);
    
    return {
      pass: comparison.pass,
      message: () => {
        if (comparison.pass) {
          return 'Expected transclusion output not to match';
        }
        return `Transclusion output mismatch:\n${comparison.diff}`;
      }
    };
  },
  
  /**
   * Check if output contains all expected transclusions
   */
  toContainTransclusions(received: string, expectedPaths: string[]) {
    const missingPaths = expectedPaths.filter(
      path => !received.includes(path)
    );
    
    return {
      pass: missingPaths.length === 0,
      message: () => {
        if (missingPaths.length === 0) {
          return 'Expected output not to contain all transclusions';
        }
        return `Missing transclusions: ${missingPaths.join(', ')}`;
      }
    };
  },
  
  /**
   * Check if output has no error comments
   */
  toHaveNoTransclusionErrors(received: string) {
    const errorPattern = /<!--\s*(Error|Missing):/g;
    const errors = received.match(errorPattern) || [];
    
    return {
      pass: errors.length === 0,
      message: () => {
        if (errors.length === 0) {
          return 'Expected output to have transclusion errors';
        }
        return `Found ${errors.length} transclusion errors:\n${errors.join('\n')}`;
      }
    };
  }
};

/**
 * Setup custom matchers for Jest
 */
export function setupTransclusionMatchers(): void {
  expect.extend(transclusionMatchers);
}

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchTransclusionOutput(expected: string, metadata?: Record<string, any>): R;
      toContainTransclusions(expectedPaths: string[]): R;
      toHaveNoTransclusionErrors(): R;
    }
  }
}