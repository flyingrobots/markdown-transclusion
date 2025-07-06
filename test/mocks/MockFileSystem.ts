import * as path from 'path';
import { FileReaderError, FileReaderErrorCode } from '../../src/fileReader';

/**
 * In-memory file system for testing
 */
export class MockFileSystem {
  private files = new Map<string, string>();
  private accessLog: string[] = [];
  private errors = new Map<string, Error>();
  
  /**
   * Add a file to the mock file system
   */
  addFile(filePath: string, content: string): this {
    const normalized = path.normalize(filePath);
    this.files.set(normalized, content);
    return this;
  }
  
  /**
   * Add multiple files at once
   */
  addFiles(files: Record<string, string>): this {
    for (const [filePath, content] of Object.entries(files)) {
      this.addFile(filePath, content);
    }
    return this;
  }
  
  /**
   * Remove a file from the mock file system
   */
  removeFile(filePath: string): this {
    const normalized = path.normalize(filePath);
    this.files.delete(normalized);
    return this;
  }
  
  /**
   * Set an error to be thrown when accessing a specific file
   */
  setError(filePath: string, error: Error): this {
    const normalized = path.normalize(filePath);
    this.errors.set(normalized, error);
    return this;
  }
  
  /**
   * Check if a file exists
   */
  exists(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    return this.files.has(normalized);
  }
  
  /**
   * Read a file (async)
   */
  async readFile(filePath: string): Promise<string> {
    const normalized = path.normalize(filePath);
    this.accessLog.push(normalized);
    
    // Check for configured errors
    const error = this.errors.get(normalized);
    if (error) {
      throw error;
    }
    
    // Check if file exists
    const content = this.files.get(normalized);
    if (content === undefined) {
      throw new FileReaderError(
        FileReaderErrorCode.FILE_NOT_FOUND,
        `File not found: ${filePath}`
      );
    }
    
    return content;
  }
  
  /**
   * Read a file (sync)
   */
  readFileSync(filePath: string): string {
    const normalized = path.normalize(filePath);
    this.accessLog.push(normalized);
    
    // Check for configured errors
    const error = this.errors.get(normalized);
    if (error) {
      throw error;
    }
    
    // Check if file exists
    const content = this.files.get(normalized);
    if (content === undefined) {
      throw new FileReaderError(
        FileReaderErrorCode.FILE_NOT_FOUND,
        `File not found: ${filePath}`
      );
    }
    
    return content;
  }
  
  /**
   * Get access log
   */
  getAccessLog(): string[] {
    return [...this.accessLog];
  }
  
  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }
  
  /**
   * Get all files
   */
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }
  
  /**
   * Clear all files and errors
   */
  clear(): void {
    this.files.clear();
    this.errors.clear();
    this.accessLog = [];
  }
  
  /**
   * Create a preset file system for common test scenarios
   */
  static createWithPreset(preset: 'simple' | 'nested' | 'circular' | 'multilingual'): MockFileSystem {
    const fs = new MockFileSystem();
    
    switch (preset) {
      case 'simple':
        fs.addFiles({
          '/base/main.md': '# Main\n![[section]]',
          '/base/section.md': '## Section Content'
        });
        break;
        
      case 'nested':
        fs.addFiles({
          '/base/level1.md': '# Level 1\n![[level2]]',
          '/base/level2.md': '## Level 2\n![[level3]]',
          '/base/level3.md': '### Level 3\nDeepest content'
        });
        break;
        
      case 'circular':
        fs.addFiles({
          '/base/a.md': 'File A\n![[b]]',
          '/base/b.md': 'File B\n![[a]]'
        });
        break;
        
      case 'multilingual':
        fs.addFiles({
          '/base/template.md': '# Title\n![[content-{{lang}}]]',
          '/base/content-en.md': 'English content',
          '/base/content-es.md': 'Contenido español',
          '/base/content-fr.md': 'Contenu français'
        });
        break;
    }
    
    return fs;
  }
}