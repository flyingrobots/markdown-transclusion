/**
 * Template variable substitution utilities
 * Handles {{variable}} replacement in streamed content
 */

/**
 * Template variables map
 * Values can be static values or functions that return values
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined | (() => string | number | boolean | null | undefined);
}

/**
 * Options for template processing
 */
export interface TemplateOptions {
  /** Variables to substitute */
  variables?: TemplateVariables;
  /** Whether to preserve unmatched variables (default: true) */
  preserveUnmatched?: boolean;
  /** Custom pattern for variables (default: {{variable}}) */
  variablePattern?: RegExp;
}

/**
 * Default variable pattern matches {{variableName}}
 * Allows alphanumeric, underscore, dash, and dot
 */
const DEFAULT_VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_.-]*)\}\}/g;

/**
 * Substitute template variables in content
 * @param content The content to process
 * @param options Template processing options
 * @returns Processed content with variables substituted
 */
export function substituteTemplateVariables(
  content: string,
  options: TemplateOptions = {}
): string {
  const {
    variables = {},
    preserveUnmatched = true,
    variablePattern = DEFAULT_VARIABLE_PATTERN
  } = options;

  // Reset regex lastIndex to ensure it starts from beginning
  variablePattern.lastIndex = 0;

  return content.replace(variablePattern, (match, variableName) => {
    // Check if variable exists
    if (variableName in variables) {
      let value = variables[variableName];
      
      // If value is a function, call it to get the actual value
      if (typeof value === 'function') {
        try {
          value = value();
        } catch (error) {
          // If function throws, treat as undefined
          console.error(`Error calling template function for ${variableName}:`, error);
          value = undefined;
        }
      }
      
      // Convert value to string, handling null/undefined
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      return String(value);
    }
    
    // Return original match if variable not found and preserveUnmatched is true
    return preserveUnmatched ? match : '';
  });
}

/**
 * Process a stream chunk for template variables
 * Handles partial variable patterns at chunk boundaries
 */
export class TemplateProcessor {
  private buffer: string = '';
  private options: TemplateOptions;
  private pattern: RegExp;

  constructor(options: TemplateOptions = {}) {
    this.options = options;
    this.pattern = options.variablePattern || DEFAULT_VARIABLE_PATTERN;
  }

  /**
   * Process a chunk of text
   * @param chunk The text chunk to process
   * @param isLastChunk Whether this is the final chunk
   * @returns Processed text with variables substituted
   */
  processChunk(chunk: string, isLastChunk = false): string {
    // Add chunk to buffer
    this.buffer += chunk;
    
    // Find the last potential incomplete variable pattern
    let lastCompleteIndex = this.buffer.length;
    
    if (!isLastChunk) {
      // Look for an incomplete variable pattern at the end
      // We need to find the last {{ that might not have a closing }}
      const openBraceIndex = this.buffer.lastIndexOf('{{');
      if (openBraceIndex !== -1) {
        const remainingText = this.buffer.substring(openBraceIndex);
        // Check if there's a complete variable after this position
        const hasClosingBrace = remainingText.indexOf('}}') !== -1;
        if (!hasClosingBrace) {
          // Keep the incomplete pattern in buffer
          lastCompleteIndex = openBraceIndex;
        }
      }
    }
    
    // Process the complete part
    const toProcess = this.buffer.substring(0, lastCompleteIndex);
    const processed = substituteTemplateVariables(toProcess, this.options);
    
    // Keep the incomplete part for next chunk
    this.buffer = this.buffer.substring(lastCompleteIndex);
    
    return processed;
  }

  /**
   * Get any remaining buffered content
   */
  flush(): string {
    const remaining = this.buffer;
    this.buffer = '';
    return substituteTemplateVariables(remaining, this.options);
  }
}