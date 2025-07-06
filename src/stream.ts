import { Transform, TransformCallback } from 'stream';
import { TextDecoder } from 'util';
import { LineTranscluder } from './utils/LineTranscluder';
import { MemoryFileCache } from './fileCache';
import { TemplateProcessor } from './utils/templateVariables';
import type { TransclusionOptions, TransclusionError } from './types';
import type { PluginExecutor } from './plugins/core/PluginExecutor';

export class TransclusionTransform extends Transform {
  private decoder: TextDecoder;
  private buffer: string = '';
  private lineTranscluder: LineTranscluder;
  private isFirstLine: boolean = true;
  private options: TransclusionOptions;
  private frontmatterState: 'none' | 'yaml-start' | 'toml-start' | 'yaml-inside' | 'toml-inside' | 'complete' = 'none';
  private lineNumber: number = 0;
  private lastProcessedFiles: Set<string> = new Set();
  private pluginExecutor?: PluginExecutor;
  private templateProcessor?: TemplateProcessor;

  constructor(options: TransclusionOptions, pluginExecutor?: PluginExecutor) {
    super({ readableObjectMode: false, writableObjectMode: false });
    
    // Automatically enable MemoryFileCache if conditions are met
    const processedOptions = { ...options };
    if (!options.cache && 
        !options.validateOnly && 
        (options.maxDepth === undefined || options.maxDepth > 1)) {
      processedOptions.cache = new MemoryFileCache();
    }
    
    this.options = processedOptions;
    this.lineTranscluder = new LineTranscluder(processedOptions, pluginExecutor);
    this.decoder = new TextDecoder('utf-8', { fatal: false });
    this.pluginExecutor = pluginExecutor;
    
    // Initialize template processor if template variables are provided
    if (options.templateVariables) {
      this.templateProcessor = new TemplateProcessor({
        variables: options.templateVariables,
        preserveUnmatched: true
      });
    }
  }
  
  // Delegate error tracking to LineTranscluder
  get errors(): TransclusionError[] {
    return this.lineTranscluder.getErrors();
  }
  
  // Delegate processed files tracking to LineTranscluder
  get processedFiles(): string[] {
    return this.lineTranscluder.getProcessedFiles();
  }

  async _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      this.buffer += this.decoder.decode(chunk, { stream: true });
      let lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() ?? '';

      for (const line of lines) {
        await this.processLine(line, false);
      }

      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  async _flush(callback: TransformCallback) {
    try {
      if (this.buffer) {
        await this.processLine(this.buffer, true);
      }
      
      // Flush any remaining template content
      if (this.templateProcessor && !this.options.validateOnly) {
        const remaining = this.templateProcessor.flush();
        if (remaining) {
          this.push(remaining);
        }
      }
      
      // Apply post-processors if plugin executor is available
      if (this.pluginExecutor && !this.options.validateOnly) {
        try {
          // Get the current output as a whole for post-processing
          // Note: This would need a way to collect all output for post-processing
          // For now, we'll emit a 'postprocess' event that can be handled externally
          this.emit('postprocess', this.pluginExecutor);
        } catch (error) {
          this.emit('error', error);
        }
      }
      
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  private async processLine(line: string, _isLastLine: boolean): Promise<void> {
    this.lineNumber++;
    
    // Handle frontmatter stripping for outer document
    if (this.options.stripFrontmatter) {
      const shouldSkipLine = this.handleFrontmatterLine(line);
      if (shouldSkipLine) {
        return;
      }
    }
    
    // Store error count before processing
    const errorCountBefore = this.lineTranscluder.getErrors().length;
    
    // Delegate all processing logic to LineTranscluder
    let processedLine = await this.lineTranscluder.processLine(line);
    
    // Check if new errors were added and emit them
    const currentErrors = this.lineTranscluder.getErrors();
    if (currentErrors.length > errorCountBefore) {
      // Emit new errors as 'transclusion-error' events to avoid breaking the stream
      for (let i = errorCountBefore; i < currentErrors.length; i++) {
        this.emit('transclusion-error', currentErrors[i]);
      }
    }
    
    // Apply template variable substitution if enabled
    if (this.templateProcessor && !this.options.validateOnly) {
      processedLine = this.templateProcessor.processChunk(processedLine, false);
    }
    
    // Emit file events for newly processed files
    const currentProcessedFiles = new Set(this.lineTranscluder.getProcessedFiles());
    for (const file of currentProcessedFiles) {
      if (!this.lastProcessedFiles.has(file)) {
        this.emit('file', file);
      }
    }
    this.lastProcessedFiles = currentProcessedFiles;
    
    // Don't output anything in validate-only mode
    if (this.options.validateOnly) {
      return;
    }
    
    if (this.isFirstLine) {
      this.push(processedLine);
      this.isFirstLine = false;
    } else {
      this.push('\n' + processedLine);
    }
  }
  
  private handleFrontmatterLine(line: string): boolean {
    const trimmedLine = line.trim();
    
    switch (this.frontmatterState) {
      case 'none':
        if (this.lineNumber === 1) {
          if (trimmedLine === '---') {
            this.frontmatterState = 'yaml-start';
            return true; // Skip this line
          } else if (trimmedLine === '+++') {
            this.frontmatterState = 'toml-start';
            return true; // Skip this line
          } else {
            this.frontmatterState = 'complete'; // No frontmatter
            return false;
          }
        }
        return false;
        
      case 'yaml-start':
        if (trimmedLine === '---') {
          this.frontmatterState = 'complete';
          return true; // Skip the closing delimiter
        } else {
          this.frontmatterState = 'yaml-inside';
          return true; // Skip frontmatter content
        }
        
      case 'yaml-inside':
        if (trimmedLine === '---') {
          this.frontmatterState = 'complete';
          return true; // Skip the closing delimiter
        } else {
          return true; // Skip frontmatter content
        }
        
      case 'toml-start':
        if (trimmedLine === '+++') {
          this.frontmatterState = 'complete';
          return true; // Skip the closing delimiter
        } else {
          this.frontmatterState = 'toml-inside';
          return true; // Skip frontmatter content
        }
        
      case 'toml-inside':
        if (trimmedLine === '+++') {
          this.frontmatterState = 'complete';
          return true; // Skip the closing delimiter
        } else {
          return true; // Skip frontmatter content
        }
        
      case 'complete':
        return false; // Process normally
        
      default:
        return false;
    }
  }
}

export function createTransclusionStream(options: TransclusionOptions = {}, pluginExecutor?: PluginExecutor): TransclusionTransform {
  return new TransclusionTransform(options, pluginExecutor);
}