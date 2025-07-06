/**
 * Enhanced CLI Core with F025 Error Recovery Integration
 * 
 * Extends CLI functionality to display enhanced error messages
 * while maintaining backward compatibility.
 */

import type { CliOptions } from '../cliCore';
import type { EnhancedTransclusionError } from './enhancedError';
import { ErrorFormatter } from './enhancedError';
import { EnhancedErrorHandlerFactory } from './enhancedErrorHandler';
import { runCli as runBasicCli } from '../cliCore';

/**
 * Enhanced CLI configuration
 */
export interface EnhancedCliConfig {
  enableEnhancedErrors: boolean;
  errorDisplayFormat: 'terminal' | 'json' | 'basic';
  showSuggestions: boolean;
  showFixActions: boolean;
  maxSuggestionsDisplay: number;
}

/**
 * Default enhanced CLI configuration
 */
export const DEFAULT_ENHANCED_CLI_CONFIG: EnhancedCliConfig = {
  enableEnhancedErrors: true,
  errorDisplayFormat: 'terminal',
  showSuggestions: true,
  showFixActions: true,
  maxSuggestionsDisplay: 3
};

/**
 * Enhanced CLI runner with intelligent error display
 */
export class EnhancedCliRunner {
  constructor(
    private readonly config: EnhancedCliConfig = DEFAULT_ENHANCED_CLI_CONFIG
  ) {}

  /**
   * Run CLI with enhanced error handling
   */
  async runWithEnhancement(options: CliOptions): Promise<void> {
    if (!this.config.enableEnhancedErrors) {
      return runBasicCli(options);
    }

    try {
      // Intercept stderr to capture and enhance error output
      const originalStderr = options.stderr;
      const capturedErrors: string[] = [];
      
      const errorCapturingStream = new (require('stream').Writable)({
        write(chunk: any, encoding: any, callback: any) {
          capturedErrors.push(chunk.toString());
          callback();
        }
      });

      // Create enhanced options with error capturing
      const enhancedOptions: CliOptions = {
        ...options,
        stderr: errorCapturingStream
      };

      // Run the basic CLI
      await runBasicCli(enhancedOptions);

      // If we captured any errors, enhance and display them
      if (capturedErrors.length > 0) {
        await this.processAndDisplayErrors(capturedErrors, originalStderr);
      }
    } catch {
      // Fallback to original behavior if enhancement fails
      await runBasicCli(options);
    }
  }

  /**
   * Process captured errors and display enhanced versions
   */
  private async processAndDisplayErrors(
    capturedErrors: string[],
    stderr: NodeJS.WriteStream
  ): Promise<void> {
    try {
      const errorHandler = await EnhancedErrorHandlerFactory.createDefault();
      
      for (const errorText of capturedErrors) {
        const enhancedOutput = await this.enhanceErrorOutput(errorText, errorHandler);
        stderr.write(enhancedOutput);
      }
    } catch {
      // Fallback to original error output if enhancement fails
      capturedErrors.forEach(error => stderr.write(error));
    }
  }

  /**
   * Enhance error output text with suggestions and context
   */
  private async enhanceErrorOutput(
    errorText: string,
    _errorHandler: any
  ): Promise<string> {
    // This is a simplified approach - in a full implementation,
    // we would need to parse the error text and extract structured error information
    // For now, we'll enhance the display format and add helpful context
    
    if (this.config.errorDisplayFormat === 'terminal') {
      return this.enhanceTerminalOutput(errorText);
    } else if (this.config.errorDisplayFormat === 'json') {
      return this.enhanceJsonOutput(errorText);
    }
    
    return errorText; // Basic format unchanged
  }

  /**
   * Enhance terminal output with colors and formatting
   */
  private enhanceTerminalOutput(errorText: string): string {
    const lines = errorText.split('\n');
    const enhancedLines: string[] = [];
    
    for (const line of lines) {
      if (line.includes('Error:') || line.includes('ERROR')) {
        enhancedLines.push(`❌ ${line}`);
      } else if (line.includes('Warning:') || line.includes('WARN')) {
        enhancedLines.push(`⚠️  ${line}`);
      } else if (line.includes('File not found')) {
        enhancedLines.push(line);
        enhancedLines.push('💡 Suggestions:');
        enhancedLines.push('   • Check file path spelling');
        enhancedLines.push('   • Verify file exists in base directory');
        enhancedLines.push('   • Use --base-path if files are in different directory');
      } else if (line.includes('Heading') && line.includes('not found')) {
        enhancedLines.push(line);
        enhancedLines.push('💡 Suggestions:');
        enhancedLines.push('   • Check heading name spelling');
        enhancedLines.push('   • Verify heading exists in target file');
        enhancedLines.push('   • Headings are case-sensitive');
      } else {
        enhancedLines.push(line);
      }
    }
    
    return enhancedLines.join('\n');
  }

  /**
   * Enhance JSON output with structured error information
   */
  private enhanceJsonOutput(errorText: string): string {
    try {
      // Attempt to parse as JSON and enhance
      const errorData = JSON.parse(errorText);
      const enhanced = {
        ...errorData,
        enhanced: true,
        suggestions: [],
        fixActions: [],
        timestamp: new Date().toISOString()
      };
      return JSON.stringify(enhanced, null, 2);
    } catch {
      // If not JSON, wrap in JSON structure
      return JSON.stringify({
        error: errorText.trim(),
        enhanced: true,
        timestamp: new Date().toISOString()
      }, null, 2);
    }
  }
}

/**
 * Error display utilities for CLI integration
 */
export class CliErrorDisplay {
  /**
   * Format enhanced error for CLI display
   */
  static formatEnhancedErrorForCli(
    error: EnhancedTransclusionError,
    config: EnhancedCliConfig
  ): string {
    if (config.errorDisplayFormat === 'json') {
      return JSON.stringify(ErrorFormatter.formatForJSON(error), null, 2);
    }
    
    const formatted = ErrorFormatter.formatForTerminal(error);
    
    if (!config.showSuggestions) {
      return formatted.split('\n')
        .filter(line => !line.includes('🔍 Suggestions:'))
        .join('\n');
    }
    
    if (!config.showFixActions) {
      return formatted.split('\n')
        .filter(line => !line.includes('💡 How to fix:'))
        .join('\n');
    }
    
    return formatted;
  }

  /**
   * Format multiple errors for batch display
   */
  static formatMultipleErrors(
    errors: EnhancedTransclusionError[],
    config: EnhancedCliConfig
  ): string {
    const formattedErrors = errors
      .slice(0, config.maxSuggestionsDisplay)
      .map(error => this.formatEnhancedErrorForCli(error, config));
    
    let output = formattedErrors.join('\n\n');
    
    if (errors.length > config.maxSuggestionsDisplay) {
      output += `\n\n... and ${errors.length - config.maxSuggestionsDisplay} more errors`;
    }
    
    return output;
  }

  /**
   * Create error summary for quick overview
   */
  static createErrorSummary(errors: EnhancedTransclusionError[]): string {
    const errorCounts = errors.reduce((counts, error) => {
      counts[error.errorType] = (counts[error.errorType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const summaryLines = [
      `📊 Error Summary (${errors.length} total):`,
      ...Object.entries(errorCounts).map(([type, count]) => 
        `   • ${type.replace(/_/g, ' ')}: ${count}`
      )
    ];

    const withSuggestions = errors.filter(e => e.suggestions.length > 0).length;
    if (withSuggestions > 0) {
      summaryLines.push(`💡 ${withSuggestions} errors have suggestions available`);
    }

    return summaryLines.join('\n');
  }
}

/**
 * Enhanced CLI factory for easy integration
 */
export class EnhancedCliFactory {
  /**
   * Create enhanced CLI runner with default configuration
   */
  static createDefault(): EnhancedCliRunner {
    return new EnhancedCliRunner();
  }

  /**
   * Create enhanced CLI runner with custom configuration
   */
  static createWithConfig(config: Partial<EnhancedCliConfig>): EnhancedCliRunner {
    const finalConfig = { ...DEFAULT_ENHANCED_CLI_CONFIG, ...config };
    return new EnhancedCliRunner(finalConfig);
  }

  /**
   * Create enhanced CLI runner for specific environments
   */
  static createForEnvironment(env: 'development' | 'production' | 'ci'): EnhancedCliRunner {
    switch (env) {
      case 'development':
        return new EnhancedCliRunner({
          enableEnhancedErrors: true,
          errorDisplayFormat: 'terminal',
          showSuggestions: true,
          showFixActions: true,
          maxSuggestionsDisplay: 5
        });
        
      case 'production':
        return new EnhancedCliRunner({
          enableEnhancedErrors: true,
          errorDisplayFormat: 'terminal',
          showSuggestions: true,
          showFixActions: false,
          maxSuggestionsDisplay: 3
        });
        
      case 'ci':
        return new EnhancedCliRunner({
          enableEnhancedErrors: true,
          errorDisplayFormat: 'json',
          showSuggestions: true,
          showFixActions: true,
          maxSuggestionsDisplay: 10
        });
        
      default:
        return this.createDefault();
    }
  }
}

/**
 * Utility for backward compatibility
 */
export function runEnhancedCli(options: CliOptions): Promise<void> {
  const runner = EnhancedCliFactory.createDefault();
  return runner.runWithEnhancement(options);
}