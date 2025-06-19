/**
 * Code Highlighter Plugin
 * 
 * Adds syntax highlighting to code blocks during transclusion.
 * Demonstrates ContentTransformPlugin implementation.
 */

import type { ContentTransformPlugin, TransformContext } from '../interfaces/TransformPlugin';
import { PluginType, PluginPriority } from '../interfaces/PluginMetadata';

/**
 * Configuration for code highlighter plugin
 */
export interface CodeHighlighterConfig {
  /** Theme for syntax highlighting */
  theme: 'github' | 'dark' | 'light' | 'monokai';
  
  /** Languages to highlight (empty array = all supported) */
  languages: string[];
  
  /** Whether to add line numbers */
  lineNumbers: boolean;
  
  /** Whether to highlight inline code */
  highlightInline: boolean;
  
  /** CSS class prefix for highlighted elements */
  classPrefix: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CodeHighlighterConfig = {
  theme: 'github',
  languages: [],
  lineNumbers: false,
  highlightInline: false,
  classPrefix: 'hljs'
};

/**
 * Simple syntax highlighting patterns
 * (In real implementation, would use a proper highlighting library)
 */
const SYNTAX_PATTERNS: Record<string, Array<{ pattern: RegExp; className: string }>> = {
  javascript: [
    { pattern: /\b(function|const|let|var|if|else|for|while|return|class|import|export)\b/g, className: 'keyword' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /"([^"\\]|\\.)*"/g, className: 'string' },
    { pattern: /'([^'\\]|\\.)*'/g, className: 'string' },
    { pattern: /\b\d+(\.\d+)?\b/g, className: 'number' }
  ],
  typescript: [
    { pattern: /\b(function|const|let|var|if|else|for|while|return|class|import|export|interface|type|extends|implements)\b/g, className: 'keyword' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /"([^"\\]|\\.)*"/g, className: 'string' },
    { pattern: /'([^'\\]|\\.)*'/g, className: 'string' },
    { pattern: /\b\d+(\.\d+)?\b/g, className: 'number' }
  ],
  python: [
    { pattern: /\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|lambda|and|or|not|in|is)\b/g, className: 'keyword' },
    { pattern: /#.*$/gm, className: 'comment' },
    { pattern: /"""[\s\S]*?"""/g, className: 'string' },
    { pattern: /"([^"\\]|\\.)*"/g, className: 'string' },
    { pattern: /'([^'\\]|\\.)*'/g, className: 'string' },
    { pattern: /\b\d+(\.\d+)?\b/g, className: 'number' }
  ],
  markdown: [
    { pattern: /^#{1,6}\s.+$/gm, className: 'title' },
    { pattern: /\*\*([^*]+)\*\*/g, className: 'strong' },
    { pattern: /\*([^*]+)\*/g, className: 'emphasis' },
    { pattern: /`([^`]+)`/g, className: 'code' },
    { pattern: /\[([^\]]+)\]\([^)]+\)/g, className: 'link' }
  ]
};

/**
 * Code Highlighter Plugin Implementation
 */
export class CodeHighlighterPlugin implements ContentTransformPlugin {
  readonly metadata = {
    name: 'code-highlighter',
    version: '1.0.0',
    description: 'Syntax highlighting for code blocks and inline code',
    author: 'Markdown Transclusion',
    type: PluginType.CONTENT_TRANSFORMER,
    priority: PluginPriority.NORMAL,
    async: false,
    tags: ['formatting', 'code', 'syntax']
  };
  
  private config: CodeHighlighterConfig = DEFAULT_CONFIG;
  
  async init(context: any): Promise<void> {
    // Merge provided configuration with defaults
    if (context.config?.['code-highlighter']) {
      this.config = { ...DEFAULT_CONFIG, ...context.config['code-highlighter'] };
    }
    
    context.logger.debug('Code highlighter plugin initialized', { config: this.config });
  }
  
  transform(content: string, context: TransformContext): string {
    let transformedContent = content;
    
    // Transform code blocks
    transformedContent = this.transformCodeBlocks(transformedContent);
    
    // Transform inline code if enabled
    if (this.config.highlightInline) {
      transformedContent = this.transformInlineCode(transformedContent);
    }
    
    return transformedContent;
  }
  
  /**
   * Transform fenced code blocks
   */
  private transformCodeBlocks(content: string): string {
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const lang = language?.toLowerCase() || 'text';
      
      // Skip if language filtering is enabled and this language isn't included
      if (this.config.languages.length > 0 && !this.config.languages.includes(lang)) {
        return match;
      }
      
      const highlightedCode = this.highlightCode(code, lang);
      const lineNumbersHtml = this.config.lineNumbers ? this.addLineNumbers(highlightedCode) : highlightedCode;
      
      return `\`\`\`${lang}\n${lineNumbersHtml}\`\`\``;
    });
  }
  
  /**
   * Transform inline code
   */
  private transformInlineCode(content: string): string {
    return content.replace(/`([^`]+)`/g, (match, code) => {
      const highlighted = this.highlightCode(code, 'text');
      return `<code class="${this.config.classPrefix}-inline">${highlighted}</code>`;
    });
  }
  
  /**
   * Apply syntax highlighting to code
   */
  private highlightCode(code: string, language: string): string {
    const patterns = SYNTAX_PATTERNS[language];
    if (!patterns) {
      return this.escapeHtml(code);
    }
    
    let highlighted = this.escapeHtml(code);
    
    // Apply each pattern
    for (const { pattern, className } of patterns) {
      highlighted = highlighted.replace(pattern, (match) => {
        return `<span class="${this.config.classPrefix}-${className}">${match}</span>`;
      });
    }
    
    return highlighted;
  }
  
  /**
   * Add line numbers to code
   */
  private addLineNumbers(code: string): string {
    const lines = code.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(3, ' ');
      return `<span class="${this.config.classPrefix}-line-number">${lineNumber}</span> ${line}`;
    });
    
    return numberedLines.join('\n');
  }
  
  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  }
}