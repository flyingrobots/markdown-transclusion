import { Transform, TransformCallback } from 'stream';
import { TextDecoder } from 'util';
import { LineTranscluder } from './utils/LineTranscluder';
import type { TransclusionOptions, TransclusionError } from './types';

export class TransclusionTransform extends Transform {
  private decoder: TextDecoder;
  private buffer: string = '';
  private lineTranscluder: LineTranscluder;

  constructor(options: TransclusionOptions) {
    super({ readableObjectMode: false, writableObjectMode: false });
    this.lineTranscluder = new LineTranscluder(options);
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
        await this.processLine(line);
      }

      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  async _flush(callback: TransformCallback) {
    try {
      if (this.buffer) {
        await this.processLine(this.buffer);
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  private async processLine(line: string): Promise<void> {
    // Delegate all processing logic to LineTranscluder
    const processedLine = await this.lineTranscluder.processLine(line);
    this.push(processedLine + '\n');
  }
}

export function createTransclusionStream(options: TransclusionOptions): TransclusionTransform {
  return new TransclusionTransform(options);
}