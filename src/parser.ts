import type { ParsedReference } from './types';

/**
 * Regular expression to match transclusion syntax
 * Matches: ![[path]] or ![[path#heading]]
 * Ensures path is not empty and doesn't contain brackets
 */
const TRANSCLUSION_PATTERN = /!\[\[([^\[\]]+?)(?:#([^\[\]]+?))?\]\]/g;

/**
 * Regular expression to match code blocks and inline code
 */
const CODE_FENCE_PATTERN = /^```[\s\S]*?^```/gm;
const INLINE_CODE_PATTERN = /`[^`\n]+`/g;

/**
 * Regular expression to match HTML comments
 */
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

/**
 * Parse transclusion references from a line of text
 * @param line The line to parse
 * @returns Array of parsed references
 */
export function parseTransclusionReferences(line: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  // Create a mask to track which characters are inside code blocks or comments
  const mask = new Array(line.length).fill(true);
  
  // Mark inline code regions
  let match;
  while ((match = INLINE_CODE_PATTERN.exec(line)) !== null) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      mask[i] = false;
    }
  }
  
  // Mark HTML comment regions
  HTML_COMMENT_PATTERN.lastIndex = 0;
  while ((match = HTML_COMMENT_PATTERN.exec(line)) !== null) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      mask[i] = false;
    }
  }
  
  // Find transclusion references that are not masked
  TRANSCLUSION_PATTERN.lastIndex = 0;
  while ((match = TRANSCLUSION_PATTERN.exec(line)) !== null) {
    // Check if this match is inside a masked region
    if (mask[match.index]) {
      const path = match[1].trim();
      const heading = match[2]?.trim();
      
      // Skip empty paths after trimming
      if (path) {
        references.push({
          original: match[0],
          path,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          ...(heading && { heading })
        });
      }
    }
  }
  
  return references;
}

/**
 * Check if content contains code fences that might span multiple lines
 * @param content The content to check
 * @returns True if content contains unclosed code fences
 */
export function hasOpenCodeFence(content: string): boolean {
  const fenceMatches = content.match(/^```/gm);
  return fenceMatches ? fenceMatches.length % 2 !== 0 : false;
}

/**
 * Remove code blocks from content before processing
 * This is used for multi-line content processing
 * @param content The content to process
 * @returns Content with code blocks replaced by placeholders
 */
export function maskCodeBlocks(content: string): { masked: string; blocks: string[] } {
  const blocks: string[] = [];
  let maskedContent = content;
  
  // Replace code fences with placeholders
  maskedContent = maskedContent.replace(CODE_FENCE_PATTERN, (match) => {
    blocks.push(match);
    return '\0'.repeat(match.length);
  });
  
  return { masked: maskedContent, blocks };
}