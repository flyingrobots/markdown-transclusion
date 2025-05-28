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
 * Trim content for transclusion
 * This is separate from file reading and should be done by the caller
 */
export function trimForTransclusion(content: string): string {
  return content.trim();
}