/**
 * Parser utility functions for tokenization and text processing
 */

/**
 * Token types found during parsing
 */
export interface Token {
  type: 'transclusion' | 'inline_code' | 'html_comment' | 'text';
  value: string;
  startIndex: number;
  endIndex: number;
  // Additional properties for transclusion tokens
  path?: string;
  heading?: string;
}

/**
 * Character mask to track regions that should be ignored
 */
export interface CharacterMask {
  mask: boolean[];
  length: number;
}

/**
 * Create a character mask for a string
 */
export function createCharacterMask(length: number, defaultValue = true): CharacterMask {
  return {
    mask: new Array(length).fill(defaultValue),
    length
  };
}

/**
 * Mark a region in the mask as masked/unmasked
 */
export function markRegion(
  mask: CharacterMask,
  start: number,
  end: number,
  value = false
): void {
  for (let i = start; i < end && i < mask.length; i++) {
    mask.mask[i] = value;
  }
}

/**
 * Check if a position is masked
 */
export function isMasked(mask: CharacterMask, position: number): boolean {
  return position >= 0 && position < mask.length && !mask.mask[position];
}

/**
 * Find all matches of a pattern in text
 */
export function findAllMatches(
  text: string,
  pattern: RegExp
): Array<{ match: RegExpExecArray; start: number; end: number }> {
  const matches: Array<{ match: RegExpExecArray; start: number; end: number }> = [];
  
  // Ensure global flag is set
  const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
  globalPattern.lastIndex = 0;
  
  let match;
  while ((match = globalPattern.exec(text)) !== null) {
    matches.push({
      match,
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return matches;
}

/**
 * Mask inline code regions in text
 */
export function maskInlineCode(text: string, mask: CharacterMask): void {
  const INLINE_CODE_PATTERN = /`[^`\n]+`/g;
  const matches = findAllMatches(text, INLINE_CODE_PATTERN);
  
  for (const { start, end } of matches) {
    markRegion(mask, start, end, false);
  }
}

/**
 * Mask HTML comment regions in text
 */
export function maskHtmlComments(text: string, mask: CharacterMask): void {
  const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
  const matches = findAllMatches(text, HTML_COMMENT_PATTERN);
  
  for (const { start, end } of matches) {
    markRegion(mask, start, end, false);
  }
}

/**
 * Find transclusion tokens in text
 */
export function findTransclusionTokens(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  
  while (pos < text.length) {
    // Find the start of a transclusion
    const startPattern = text.indexOf('![[', pos);
    if (startPattern === -1) break;
    
    // Find matching ]] by counting brackets
    let bracketCount = 1;
    let i = startPattern + 3;
    let endPattern = -1;
    
    while (i < text.length - 1 && bracketCount > 0) {
      if (text[i] === '[' && text[i + 1] === '[') {
        bracketCount++;
        i += 2;
      } else if (text[i] === ']' && text[i + 1] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endPattern = i;
        }
        i += 2;
      } else {
        i++;
      }
    }
    
    if (endPattern === -1) {
      // No matching ]] found
      pos = startPattern + 3;
      continue;
    }
    
    // Extract the content between ![[ and ]]
    const content = text.substring(startPattern + 3, endPattern);
    
    // Check for heading separator
    const headingIndex = content.indexOf('#');
    let path: string;
    let heading: string | undefined;
    
    if (headingIndex !== -1) {
      path = content.substring(0, headingIndex).trim();
      heading = content.substring(headingIndex + 1).trim();
    } else {
      path = content.trim();
    }
    
    // Skip empty paths
    if (path) {
      tokens.push({
        type: 'transclusion',
        value: text.substring(startPattern, endPattern + 2),
        startIndex: startPattern,
        endIndex: endPattern + 2,
        path,
        ...(heading && { heading })
      });
    }
    
    pos = endPattern + 2;
  }
  
  return tokens;
}

/**
 * Create a reference from a transclusion token
 */
export function createReferenceFromToken(token: Token): {
  original: string;
  path: string;
  startIndex: number;
  endIndex: number;
  heading?: string;
} | null {
  if (token.type !== 'transclusion' || !token.path) {
    return null;
  }
  
  return {
    original: token.value,
    path: token.path,
    startIndex: token.startIndex,
    endIndex: token.endIndex,
    ...(token.heading && { heading: token.heading })
  };
}