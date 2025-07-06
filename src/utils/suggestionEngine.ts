/**
 * Suggestion Engine for Enhanced Error Recovery
 * 
 * Provides intelligent suggestions for common transclusion errors using fuzzy matching
 * and contextual analysis. Follows SRP, DI, and KISS principles.
 */

export interface Suggestion {
  readonly text: string;
  readonly confidence: number; // 0-100
  readonly type: 'file' | 'heading' | 'variable' | 'path';
  readonly reason?: string;
}

export interface SuggestionContext {
  readonly target: string;
  readonly basePath?: string;
  readonly availableFiles?: string[];
  readonly availableHeadings?: string[];
  readonly availableVariables?: Record<string, string>;
  readonly parentFile?: string;
}

/**
 * Interface for fuzzy matching algorithms
 * Allows easy testing and swapping of implementations
 */
export interface FuzzyMatcher {
  match(target: string, candidates: string[]): Array<{ text: string; score: number }>;
}

/**
 * Interface for file system operations
 * Enables dependency injection and testing
 */
export interface FileSystemProvider {
  getMarkdownFiles(basePath: string): Promise<string[]>;
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
}

/**
 * Interface for heading extraction
 * Single responsibility: extract headings from content
 */
export interface HeadingProvider {
  extractHeadings(content: string): string[];
}

/**
 * Core suggestion engine implementing intelligent error recovery
 */
export class SuggestionEngine {
  constructor(
    private readonly fuzzyMatcher: FuzzyMatcher,
    private readonly fileSystem: FileSystemProvider,
    private readonly headingProvider: HeadingProvider
  ) {}

  /**
   * Generate suggestions for file not found errors
   */
  async suggestFiles(target: string, context: SuggestionContext): Promise<Suggestion[]> {
    const candidates = context.availableFiles || await this.getAvailableFiles(context.basePath);
    const matches = this.fuzzyMatcher.match(target, candidates);
    
    return matches
      .filter(match => match.score >= 0.5) // Minimum confidence threshold
      .slice(0, 3) // Top 3 suggestions
      .map(match => ({
        text: match.text,
        confidence: Math.round(match.score * 100),
        type: 'file' as const,
        reason: this.generateFileReason(target, match.text, match.score)
      }));
  }

  /**
   * Generate suggestions for heading not found errors
   */
  async suggestHeadings(target: string, filePath: string, context: SuggestionContext): Promise<Suggestion[]> {
    const headings = context.availableHeadings || await this.getHeadingsFromFile(filePath);
    const matches = this.fuzzyMatcher.match(target, headings);
    
    return matches
      .filter(match => match.score >= 0.4) // Lower threshold for headings
      .slice(0, 3)
      .map(match => ({
        text: match.text,
        confidence: Math.round(match.score * 100),
        type: 'heading' as const,
        reason: this.generateHeadingReason(target, match.text, match.score)
      }));
  }

  /**
   * Generate suggestions for undefined variable errors
   */
  suggestVariables(target: string, context: SuggestionContext): Suggestion[] {
    if (!context.availableVariables) {
      return [];
    }

    const variableNames = Object.keys(context.availableVariables);
    const matches = this.fuzzyMatcher.match(target, variableNames);
    
    return matches
      .filter(match => match.score >= 0.6) // Higher threshold for variables
      .slice(0, 3)
      .map(match => ({
        text: match.text,
        confidence: Math.round(match.score * 100),
        type: 'variable' as const,
        reason: `Variable '${match.text}' = '${context.availableVariables![match.text]}'`
      }));
  }

  /**
   * Generate path resolution suggestions
   */
  async suggestPathResolution(target: string, context: SuggestionContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Check for common path issues
    if (target.includes('../')) {
      suggestions.push({
        text: 'Check --base-path setting',
        confidence: 80,
        type: 'path',
        reason: 'Path contains ../ - ensure base path allows traversal'
      });
    }
    
    if (!target.includes('.')) {
      const withExtension = `${target}.md`;
      if (context.availableFiles?.includes(withExtension)) {
        suggestions.push({
          text: withExtension,
          confidence: 90,
          type: 'file',
          reason: 'File extension may be missing'
        });
      }
    }
    
    return suggestions;
  }

  private async getAvailableFiles(basePath?: string): Promise<string[]> {
    if (!basePath) {
      return [];
    }
    return this.fileSystem.getMarkdownFiles(basePath);
  }

  private async getHeadingsFromFile(filePath: string): Promise<string[]> {
    try {
      const content = await this.fileSystem.readFile(filePath);
      return this.headingProvider.extractHeadings(content);
    } catch {
      return [];
    }
  }

  private generateFileReason(target: string, suggestion: string, score: number): string {
    if (score > 0.8) return 'Very similar filename';
    if (score > 0.6) return 'Similar filename';
    return 'Possible match';
  }

  private generateHeadingReason(target: string, suggestion: string, score: number): string {
    if (score > 0.8) return 'Very similar heading';
    if (score > 0.6) return 'Similar heading';
    return 'Possible heading match';
  }
}

/**
 * Default fuzzy matcher using Levenshtein distance with optimizations
 */
export class LevenshteinFuzzyMatcher implements FuzzyMatcher {
  match(target: string, candidates: string[]): Array<{ text: string; score: number }> {
    const targetLower = target.toLowerCase();
    
    return candidates
      .map(candidate => ({
        text: candidate,
        score: this.calculateSimilarity(targetLower, candidate.toLowerCase())
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    
    // Quick substring check for high confidence matches
    if (a.includes(b) || b.includes(a)) {
      const longer = a.length > b.length ? a : b;
      const shorter = a.length <= b.length ? a : b;
      return shorter.length / longer.length * 0.9; // High confidence for substrings
    }
    
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return Math.max(0, 1 - distance / maxLength);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}

/**
 * File system provider using Node.js APIs
 */
export class NodeFileSystemProvider implements FileSystemProvider {
  async getMarkdownFiles(basePath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const files: string[] = [];
      await this.scanDirectory(basePath, files, fs, path);
      return files.map(file => path.relative(basePath, file));
    } catch {
      return [];
    }
  }
  
  async fileExists(filePath: string): Promise<boolean> {
    const fs = await import('fs/promises');
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async readFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath, 'utf-8');
  }
  
  private async scanDirectory(
    dir: string, 
    files: string[], 
    fs: any, 
    path: any
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files, fs, path);
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore directories we can't read
    }
  }
  
  private isMarkdownFile(filename: string): boolean {
    return /\.(md|markdown)$/i.test(filename);
  }
}

/**
 * Heading provider that extracts markdown headings
 */
export class MarkdownHeadingProvider implements HeadingProvider {
  extractHeadings(content: string): string[] {
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    const headings: string[] = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[1].trim());
    }
    
    return headings;
  }
}