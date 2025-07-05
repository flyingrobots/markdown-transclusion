/**
 * Extract content for a specific heading from markdown content
 */

/**
 * Extract content starting from a specific heading
 * @param content The full markdown content
 * @param headingText The heading text to find (without # prefix)
 * @returns The content from the heading until the next same or higher level heading
 */
export function extractHeadingContent(content: string, headingText: string): string | null {
  if (!headingText) {
    return content;
  }
  
  const lines = content.split('\n');
  const normalizedHeading = headingText.trim().toLowerCase();
  
  let startIndex = -1;
  let headingLevel = 0;
  
  // Find the heading
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim().toLowerCase();
      
      if (text === normalizedHeading) {
        startIndex = i;
        headingLevel = level;
        break;
      }
    }
  }
  
  // Heading not found
  if (startIndex === -1) {
    return null;
  }
  
  // Find the end of this section (next heading of same or higher level)
  let endIndex = lines.length;
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Stop at same level or higher (fewer #)
      if (level <= headingLevel) {
        endIndex = i;
        break;
      }
    }
  }
  
  // Extract the content
  const extractedLines = lines.slice(startIndex, endIndex);
  
  // Remove trailing empty lines
  while (extractedLines.length > 0 && extractedLines[extractedLines.length - 1].trim() === '') {
    extractedLines.pop();
  }
  
  // Remove the heading line itself if requested
  // Keep it for now as it provides context
  return extractedLines.join('\n');
}

/**
 * Check if a reference includes a heading anchor
 */
export function hasHeadingAnchor(reference: string): boolean {
  return reference.includes('#');
}

/**
 * Split reference into path and heading parts
 */
export function splitReference(reference: string): { path: string; heading?: string } {
  const parts = reference.split('#');
  return {
    path: parts[0],
    heading: parts[1] || undefined
  };
}

/**
 * Extract content for a heading range from markdown content
 * @param content The full markdown content
 * @param startHeading The starting heading text (without # prefix)
 * @param endHeading The ending heading text (without # prefix), or empty for end of document
 * @returns The content from start heading until (but not including) end heading
 */
export function extractHeadingRange(content: string, startHeading: string, endHeading?: string): string | null {
  if (!startHeading && !endHeading) {
    return content;
  }
  
  const lines = content.split('\n');
  const normalizedStart = startHeading ? startHeading.trim().toLowerCase() : '';
  const normalizedEnd = endHeading ? endHeading.trim().toLowerCase() : '';
  
  let startIndex = -1;
  let startLevel = 0;
  let endIndex = lines.length;
  
  // If startHeading is empty, start from beginning
  if (!normalizedStart) {
    startIndex = 0;
  } else {
    // Find the start heading
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim().toLowerCase();
        
        if (text === normalizedStart) {
          startIndex = i;
          break;
        }
      }
    }
    
    // Start heading not found
    if (startIndex === -1) {
      return null;
    }
  }
  
  // If endHeading is specified, find it
  if (normalizedEnd) {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const text = headingMatch[2].trim().toLowerCase();
        
        if (text === normalizedEnd) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  // Extract the content
  const extractedLines = lines.slice(startIndex, endIndex);
  
  // Remove trailing empty lines
  while (extractedLines.length > 0 && extractedLines[extractedLines.length - 1].trim() === '') {
    extractedLines.pop();
  }
  
  return extractedLines.join('\n');
}