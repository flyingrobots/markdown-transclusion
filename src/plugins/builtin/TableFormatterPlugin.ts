/**
 * Table Formatter Plugin
 * 
 * Enhanced table formatting with sorting, filtering, and styling.
 * Demonstrates ContentTransformPlugin for structured data processing.
 */

import type { ContentTransformPlugin, TransformContext } from '../interfaces/TransformPlugin';
import { PluginType, PluginPriority } from '../interfaces/PluginMetadata';

/**
 * Configuration for table formatter plugin
 */
export interface TableFormatterConfig {
  /** Whether to add sortable headers */
  enableSorting: boolean;
  
  /** Whether to add alternating row colors */
  stripedRows: boolean;
  
  /** Whether to add borders */
  bordered: boolean;
  
  /** Whether to make tables responsive */
  responsive: boolean;
  
  /** CSS classes to add to tables */
  cssClasses: string[];
  
  /** Whether to auto-format number columns */
  autoFormatNumbers: boolean;
  
  /** Whether to auto-detect column types */
  autoDetectTypes: boolean;
  
  /** Maximum column width in characters */
  maxColumnWidth: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TableFormatterConfig = {
  enableSorting: false,
  stripedRows: true,
  bordered: true,
  responsive: true,
  cssClasses: ['table'],
  autoFormatNumbers: true,
  autoDetectTypes: true,
  maxColumnWidth: 50
};

/**
 * Table column type detection
 */
enum ColumnType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  URL = 'url',
  EMAIL = 'email'
}

/**
 * Parsed table structure
 */
interface TableData {
  headers: string[];
  rows: string[][];
  columnTypes: ColumnType[];
  hasHeaders: boolean;
}

/**
 * Table Formatter Plugin Implementation
 */
export class TableFormatterPlugin implements ContentTransformPlugin {
  readonly metadata = {
    name: 'table-formatter',
    version: '1.0.0',
    description: 'Enhanced table formatting with sorting and styling',
    author: 'Markdown Transclusion',
    type: PluginType.CONTENT_TRANSFORMER,
    priority: PluginPriority.LOW, // Run after content transformations
    async: false,
    tags: ['tables', 'formatting', 'styling']
  };
  
  private config: TableFormatterConfig = DEFAULT_CONFIG;
  
  async init(context: any): Promise<void> {
    // Merge provided configuration with defaults
    if (context.config?.['table-formatter']) {
      this.config = { ...DEFAULT_CONFIG, ...context.config['table-formatter'] };
    }
    
    context.logger.debug('Table formatter plugin initialized', { config: this.config });
  }
  
  async transform(content: string, context: TransformContext): Promise<string> {
    return content.replace(/\n\|.*?\|\n(?:\|.*?\|\n)*/g, (match) => {
      try {
        return this.formatTable(match, context);
      } catch (error) {
        context.logger.warn(`Failed to format table in ${context.filePath}:`, error);
        return match; // Return original on error
      }
    });
  }
  
  /**
   * Format a single table
   */
  private formatTable(tableText: string, context: TransformContext): string {
    const tableData = this.parseTable(tableText);
    
    if (!tableData || tableData.rows.length === 0) {
      return tableText;
    }
    
    // Detect column types if enabled
    if (this.config.autoDetectTypes) {
      tableData.columnTypes = this.detectColumnTypes(tableData);
    }
    
    // Format the table
    return this.renderTable(tableData, context);
  }
  
  /**
   * Parse markdown table into structured data
   */
  private parseTable(tableText: string): TableData | null {
    const lines = tableText.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return null;
    }
    
    const rows: string[][] = [];
    let headers: string[] = [];
    let hasHeaders = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line.startsWith('|') || !line.endsWith('|')) {
        continue;
      }
      
      // Remove leading/trailing pipes and split
      const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
      
      // Check if this is a separator line
      if (i === 1 && this.isSeparatorLine(line)) {
        hasHeaders = true;
        continue;
      }
      
      if (i === 0 && !hasHeaders) {
        headers = cells;
      } else {
        rows.push(cells);
      }
    }
    
    // If we found headers, the first row is headers
    if (hasHeaders && rows.length > 0) {
      headers = rows.shift()!;
    }
    
    return {
      headers: hasHeaders ? headers : [],
      rows,
      columnTypes: new Array(Math.max(headers.length, rows[0]?.length || 0)).fill(ColumnType.TEXT),
      hasHeaders
    };
  }
  
  /**
   * Check if a line is a table separator
   */
  private isSeparatorLine(line: string): boolean {
    return /^\|[\s\-:]+\|$/.test(line);
  }
  
  /**
   * Detect column types based on content
   */
  private detectColumnTypes(tableData: TableData): ColumnType[] {
    const types: ColumnType[] = [];
    const columnCount = Math.max(tableData.headers.length, tableData.rows[0]?.length || 0);
    
    for (let col = 0; col < columnCount; col++) {
      const columnValues = tableData.rows.map(row => row[col] || '').filter(Boolean);
      types.push(this.detectColumnType(columnValues));
    }
    
    return types;
  }
  
  /**
   * Detect type of a column based on its values
   */
  private detectColumnType(values: string[]): ColumnType {
    if (values.length === 0) {
      return ColumnType.TEXT;
    }
    
    // Check for numbers
    const numberCount = values.filter(v => /^-?\d+(\.\d+)?$/.test(v.trim())).length;
    if (numberCount / values.length > 0.8) {
      return ColumnType.NUMBER;
    }
    
    // Check for booleans
    const booleanCount = values.filter(v => /^(true|false|yes|no|y|n)$/i.test(v.trim())).length;
    if (booleanCount / values.length > 0.8) {
      return ColumnType.BOOLEAN;
    }
    
    // Check for URLs
    const urlCount = values.filter(v => /^https?:\/\//.test(v.trim())).length;
    if (urlCount / values.length > 0.8) {
      return ColumnType.URL;
    }
    
    // Check for emails
    const emailCount = values.filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())).length;
    if (emailCount / values.length > 0.8) {
      return ColumnType.EMAIL;
    }
    
    // Check for dates
    const dateCount = values.filter(v => !isNaN(Date.parse(v.trim()))).length;
    if (dateCount / values.length > 0.8) {
      return ColumnType.DATE;
    }
    
    return ColumnType.TEXT;
  }
  
  /**
   * Render formatted table
   */
  private renderTable(tableData: TableData, context: TransformContext): string {
    const { headers, rows, columnTypes, hasHeaders } = tableData;
    
    let html = '<table';
    
    // Add CSS classes
    if (this.config.cssClasses.length > 0) {
      const classes = [...this.config.cssClasses];
      
      if (this.config.stripedRows) classes.push('table-striped');
      if (this.config.bordered) classes.push('table-bordered');
      if (this.config.responsive) classes.push('table-responsive');
      
      html += ` class="${classes.join(' ')}"`;
    }
    
    html += '>\n';
    
    // Add table header
    if (hasHeaders && headers.length > 0) {
      html += '  <thead>\n    <tr>\n';
      
      headers.forEach((header, index) => {
        const type = columnTypes[index] || ColumnType.TEXT;
        let headerHtml = `      <th data-type="${type}"`;
        
        if (this.config.enableSorting) {
          headerHtml += ' class="sortable" onclick="sortTable(this)"';
        }
        
        headerHtml += `>${this.formatCell(header, type)}</th>\n`;
        html += headerHtml;
      });
      
      html += '    </tr>\n  </thead>\n';
    }
    
    // Add table body
    if (rows.length > 0) {
      html += '  <tbody>\n';
      
      rows.forEach((row, rowIndex) => {
        const rowClass = this.config.stripedRows && rowIndex % 2 === 1 ? ' class="odd"' : '';
        html += `    <tr${rowClass}>\n`;
        
        row.forEach((cell, cellIndex) => {
          const type = columnTypes[cellIndex] || ColumnType.TEXT;
          html += `      <td data-type="${type}">${this.formatCell(cell, type)}</td>\n`;
        });
        
        html += '    </tr>\n';
      });
      
      html += '  </tbody>\n';
    }
    
    html += '</table>';
    
    // Add sorting script if enabled
    if (this.config.enableSorting) {
      html += this.getSortingScript();
    }
    
    return html;
  }
  
  /**
   * Format a table cell based on its type
   */
  private formatCell(content: string, type: ColumnType): string {
    if (!content.trim()) {
      return '';
    }
    
    const trimmed = content.trim();
    
    switch (type) {
      case ColumnType.NUMBER:
        if (this.config.autoFormatNumbers && /^-?\d+(\.\d+)?$/.test(trimmed)) {
          const num = parseFloat(trimmed);
          return num.toLocaleString();
        }
        return this.escapeHtml(trimmed);
        
      case ColumnType.URL:
        if (/^https?:\/\//.test(trimmed)) {
          return `<a href="${this.escapeHtml(trimmed)}" target="_blank">${this.escapeHtml(trimmed)}</a>`;
        }
        return this.escapeHtml(trimmed);
        
      case ColumnType.EMAIL:
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return `<a href="mailto:${this.escapeHtml(trimmed)}">${this.escapeHtml(trimmed)}</a>`;
        }
        return this.escapeHtml(trimmed);
        
      case ColumnType.BOOLEAN:
        if (/^(true|yes|y)$/i.test(trimmed)) {
          return '<span class="boolean-true">✓</span>';
        } else if (/^(false|no|n)$/i.test(trimmed)) {
          return '<span class="boolean-false">✗</span>';
        }
        return this.escapeHtml(trimmed);
        
      case ColumnType.DATE:
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return `<time datetime="${date.toISOString()}">${date.toLocaleDateString()}</time>`;
        }
        return this.escapeHtml(trimmed);
        
      default:
        // Truncate long text if needed
        if (trimmed.length > this.config.maxColumnWidth) {
          return `<span title="${this.escapeHtml(trimmed)}">${this.escapeHtml(trimmed.substring(0, this.config.maxColumnWidth - 3))}...</span>`;
        }
        return this.escapeHtml(trimmed);
    }
  }
  
  /**
   * Get JavaScript for table sorting
   */
  private getSortingScript(): string {
    return `
<script>
function sortTable(th) {
  const table = th.closest('table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const columnIndex = Array.from(th.parentNode.children).indexOf(th);
  const dataType = th.getAttribute('data-type');
  const isAscending = th.classList.contains('sort-desc');
  
  // Clear previous sort indicators
  table.querySelectorAll('th').forEach(header => {
    header.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Sort rows
  rows.sort((a, b) => {
    const aVal = a.children[columnIndex].textContent.trim();
    const bVal = b.children[columnIndex].textContent.trim();
    
    let comparison = 0;
    
    switch (dataType) {
      case 'number':
        comparison = parseFloat(aVal) - parseFloat(bVal);
        break;
      case 'date':
        comparison = new Date(aVal) - new Date(bVal);
        break;
      default:
        comparison = aVal.localeCompare(bVal);
    }
    
    return isAscending ? comparison : -comparison;
  });
  
  // Add sort indicator
  th.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
  
  // Reorder rows
  rows.forEach(row => tbody.appendChild(row));
}
</script>`;
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