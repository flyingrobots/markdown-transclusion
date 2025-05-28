import { Result, Ok, Err } from './result';

/**
 * Token types in a path
 */
export type PathToken = 
  | { type: 'text'; value: string }
  | { type: 'variable'; name: string; original: string }
  | { type: 'nested'; tokens: PathToken[]; original: string };

/**
 * Variable substitution error
 */
export interface VariableError {
  code: 'UNDEFINED_VARIABLE' | 'CIRCULAR_REFERENCE' | 'MAX_DEPTH_EXCEEDED';
  message: string;
  variable?: string;
}

/**
 * Options for variable substitution
 */
export interface SubstitutionOptions {
  variables?: Record<string, string>;
  strict?: boolean;
  maxDepth?: number;
  visitedVars?: Set<string>;
}

/**
 * Default maximum substitution depth to prevent infinite recursion
 */
const DEFAULT_MAX_DEPTH = 10;

/**
 * Pattern to match variable placeholders
 * Matches: {{varname}} with optional dashes, underscores, and alphanumeric characters
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Tokenize a path string into text and variable tokens
 */
export function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  let lastIndex = 0;
  
  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;
  
  let match;
  while ((match = VARIABLE_PATTERN.exec(path)) !== null) {
    // Add text before the variable
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: path.substring(lastIndex, match.index)
      });
    }
    
    // Add variable token
    tokens.push({
      type: 'variable',
      name: match[1],
      original: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < path.length) {
    tokens.push({
      type: 'text',
      value: path.substring(lastIndex)
    });
  }
  
  return tokens;
}

/**
 * Substitute variables in tokens
 */
export function substituteTokens(
  tokens: PathToken[],
  options: SubstitutionOptions = {}
): Result<string, VariableError> {
  const {
    variables = {},
    strict = false,
    maxDepth = DEFAULT_MAX_DEPTH,
    visitedVars = new Set()
  } = options;
  
  let result = '';
  
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        result += token.value;
        break;
        
      case 'variable': {
        const substitution = substituteVariable(
          token.name,
          token.original,
          { variables, strict, maxDepth, visitedVars }
        );
        
        if (!substitution.ok) {
          return substitution;
        }
        
        result += substitution.value;
        break;
      }
      
      case 'nested': {
        const nestedResult = substituteTokens(
          token.tokens,
          { variables, strict, maxDepth, visitedVars }
        );
        
        if (!nestedResult.ok) {
          return nestedResult;
        }
        
        result += nestedResult.value;
        break;
      }
    }
  }
  
  return Ok(result);
}

/**
 * Substitute a single variable
 */
function substituteVariable(
  varName: string,
  original: string,
  options: Required<SubstitutionOptions>
): Result<string, VariableError> {
  const { variables, strict, maxDepth, visitedVars } = options;
  
  // Check for circular reference
  if (visitedVars.has(varName)) {
    return Err({
      code: 'CIRCULAR_REFERENCE',
      message: `Circular reference detected: ${varName}`,
      variable: varName
    });
  }
  
  // Check depth limit
  if (visitedVars.size >= maxDepth) {
    return Err({
      code: 'MAX_DEPTH_EXCEEDED',
      message: `Maximum substitution depth (${maxDepth}) exceeded`,
      variable: varName
    });
  }
  
  // Get variable value
  if (!(varName in variables)) {
    if (strict) {
      return Err({
        code: 'UNDEFINED_VARIABLE',
        message: `Undefined variable: ${varName}`,
        variable: varName
      });
    }
    // Return original placeholder in non-strict mode
    return Ok(original);
  }
  
  const value = variables[varName];
  
  // Check if the value contains more variables
  if (VARIABLE_PATTERN.test(value)) {
    // Add to visited set
    const newVisited = new Set(visitedVars);
    newVisited.add(varName);
    
    // Tokenize and substitute recursively
    const valueTokens = tokenizePath(value);
    return substituteTokens(valueTokens, {
      variables,
      strict,
      maxDepth,
      visitedVars: newVisited
    });
  }
  
  return Ok(value);
}

/**
 * Simple wrapper for backward compatibility
 */
export function substituteVariables(
  path: string,
  variables: Record<string, string> = {},
  strict = false
): string {
  const tokens = tokenizePath(path);
  const result = substituteTokens(tokens, { variables, strict });
  
  if (!result.ok) {
    if (strict) {
      throw new Error(result.error.message);
    }
    // In non-strict mode, return original path
    return path;
  }
  
  return result.value;
}