import type { TransclusionToken } from './types';
import {
  createCharacterMask,
  maskInlineCode,
  maskHtmlComments,
  findTransclusionTokens,
  createReferenceFromToken,
  isMasked
} from './coreUtils';

/**
 * Regular expression to match code blocks
 */
const CODE_FENCE_PATTERN = /^```[\s\S]*?^```/gm;

/**
 * Parse transclusion references from a line of text
 * @param line The line to parse
 * @returns Array of parsed references
 */
export function parseTransclusionReferences(line: string): TransclusionToken[] {
  // Step 1: Create character mask
  const mask = createCharacterMask(line.length);
  
  // Step 2: Mask regions we should ignore
  maskInlineCode(line, mask);
  maskHtmlComments(line, mask);
  
  // Step 3: Find all transclusion tokens
  const tokens = findTransclusionTokens(line);
  
  // Step 4: Filter tokens that are not masked and convert to references
  const references: TransclusionToken[] = [];
  
  for (const token of tokens) {
    // Check if token is in a masked region
    if (!isMasked(mask, token.startIndex)) {
      const reference = createReferenceFromToken(token);
      if (reference) {
        references.push(reference);
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