import { Transform, TransformCallback } from 'stream';
import { TextDecoder } from 'util';
import { LineTranscluder } from './utils/LineTranscluder';
import { MemoryFileCache } from './fileCache';
import type { TransclusionOptions, TransclusionError } from './types';

export class TransclusionTransform extends Transform {
  private decoder: TextDecoder;
  private buffer: string = '';
  private lineTranscluder: LineTranscluder;
  private isFirstLine: boolean = true;
  private options: TransclusionOptions;

  constructor(options: TransclusionOptions) {
    super({ readableObjectMode: false, writableObjectMode: false });
    
    // Automatically enable MemoryFileCache if conditions are met
    const processedOptions = { ...options };
    if (!options.cache && 
        !options.validateOnly && 
        (options.maxDepth === undefined || options.maxDepth > 1)) {
      processedOptions.cache = new MemoryFileCache();
    }
    
    this.options = processedOptions;
    this.lineTranscluder = new LineTranscluder(processedOptions);
    this.decoder = new TextDecoder('utf-8', { fatal: false });
  }
  
  // Delegate error tracking to LineTranscluder
  get errors(): TransclusionError[] {
    return this.lineTranscluder.getErrors();
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
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  private async processLine(line: string, _isLastLine: boolean): Promise<void> {
    // Delegate all processing logic to LineTranscluder
    const processedLine = await this.lineTranscluder.processLine(line);
    
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
}

export function createTransclusionStream(options: TransclusionOptions = {}): TransclusionTransform {
  return new TransclusionTransform(options);
}