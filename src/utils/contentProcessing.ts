/**
 * Pure functions for processing file content
 */

/**
 * Strip BOM (Byte Order Mark) from string
 */
export function stripBOM(content: string): string {
  // UTF-8 BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  
  // UTF-16 BE BOM
  if (content.charCodeAt(0) === 0xFEFE) {
    return content.slice(1);
  }
  
  // UTF-16 LE BOM  
  if (content.charCodeAt(0) === 0xFFFE) {
    return content.slice(1);
  }
  
  return content;
}

/**
 * Process raw buffer into clean string content
 */
export function processFileContent(
  buffer: Buffer,
  encoding: BufferEncoding = 'utf8'
): string {
  // Convert to string with specified encoding
  let content = buffer.toString(encoding);
  
  // Handle BOM
  content = stripBOM(content);
  
  return content;
}

/**
 * Detects frontmatter type and delimiter positions in content
 */
export interface FrontmatterInfo {
  hasFrontmatter: boolean;
  type: 'yaml' | 'toml' | null;
  startDelimiter: string;
  endDelimiter: string;
  startLine: number;
  endLine: number;
  contentStartIndex: number;
}

/**
 * Detect frontmatter in content and return information about it
 */
export function detectFrontmatter(content: string): FrontmatterInfo {
  const lines = content.split(/\r?\n/);
  
  if (lines.length === 0) {
    return {
      hasFrontmatter: false,
      type: null,
      startDelimiter: '',
      endDelimiter: '',
      startLine: 0,
      endLine: 0,
      contentStartIndex: 0
    };
  }
  
  // Check if first line (after potential BOM) is a frontmatter delimiter
  const firstLine = lines[0].trim();
  let delimiterType: 'yaml' | 'toml' | null = null;
  let delimiter = '';
  
  if (firstLine === '---') {
    delimiterType = 'yaml';
    delimiter = '---';
  } else if (firstLine === '+++') {
    delimiterType = 'toml';
    delimiter = '+++';
  }
  
  if (!delimiterType) {
    return {
      hasFrontmatter: false,
      type: null,
      startDelimiter: '',
      endDelimiter: '',
      startLine: 0,
      endLine: 0,
      contentStartIndex: 0
    };
  }
  
  // Look for closing delimiter
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === delimiter) {
      // Found complete frontmatter
      const endLineIndex = i;
      
      // Calculate content start position by summing lengths of frontmatter lines plus newlines
      let contentStartIndex = 0;
      for (let j = 0; j <= endLineIndex; j++) {
        contentStartIndex += lines[j].length;
        contentStartIndex += 1; // Add newline character
      }
      
      // Skip any empty lines immediately following frontmatter
      let nextLineIndex = endLineIndex + 1;
      while (nextLineIndex < lines.length && lines[nextLineIndex].trim() === '') {
        contentStartIndex += lines[nextLineIndex].length;
        contentStartIndex += 1; // Add newline character
        nextLineIndex++;
      }
      
      // Handle CRLF line endings by checking if content uses \r\n
      if (content.includes('\r\n')) {
        const totalNewlines = nextLineIndex; // Total newlines up to content start
        contentStartIndex += totalNewlines; // Add extra \r characters for CRLF
      }
      
      return {
        hasFrontmatter: true,
        type: delimiterType,
        startDelimiter: delimiter,
        endDelimiter: delimiter,
        startLine: 0,
        endLine: endLineIndex,
        contentStartIndex
      };
    }
  }
  
  // Frontmatter delimiter found but no closing delimiter - treat as malformed
  return {
    hasFrontmatter: false,
    type: null,
    startDelimiter: '',
    endDelimiter: '',
    startLine: 0,
    endLine: 0,
    contentStartIndex: 0
  };
}

/**
 * Strip frontmatter from content if present
 */
export function stripFrontmatter(content: string): string {
  const info = detectFrontmatter(content);
  
  if (!info.hasFrontmatter) {
    return content;
  }
  
  return content.substring(info.contentStartIndex);
}

/**
 * Trim content for transclusion
 * This is separate from file reading and should be done by the caller
 */
export function trimForTransclusion(content: string): string {
  return content.trim();
}