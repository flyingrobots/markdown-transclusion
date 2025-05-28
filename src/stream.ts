import { Transform, TransformCallback } from 'stream';
import { TextDecoder } from 'util';
import { parseTransclusionReferences } from './parser';
import { resolvePath } from './resolver';
import { readFile } from './fileReader';
import type { TransclusionOptions, TransclusionError } from './types';

export class TransclusionTransform extends Transform {
  private decoder: TextDecoder;
  private buffer: string = '';
  private options: TransclusionOptions;
  public readonly errors: TransclusionError[] = [];

  constructor(options: TransclusionOptions) {
    super({ readableObjectMode: false, writableObjectMode: false });
    this.options = options;
    this.decoder = new TextDecoder('utf-8', { fatal: false });
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
    const refs = parseTransclusionReferences(line);
    if (!refs.length) {
      this.push(line + '\n');
      return;
    }

    let cursor = 0;
    let result = '';

    for (const ref of refs) {
      result += line.slice(cursor, ref.startIndex);
      cursor = ref.endIndex;

      if (!this.options.basePath) {
        throw new Error('basePath is required for transclusion.');
      }

      const resolved = resolvePath(ref.path, this.options);

      if (resolved.exists) {
        try {
          const content = await readFile(resolved.absolutePath, this.options.cache);
          result += content.trim();
        } catch (err) {
          this.errors.push({
            message: (err as Error).message,
            path: resolved.absolutePath,
            code: 'READ_ERROR'
          });
          result += `<!-- Error: ${ref.original} -->`;
        }
      } else {
        this.errors.push({
          message: resolved.error ?? 'Unknown path resolution error',
          path: ref.path,
          code: 'RESOLVE_ERROR'
        });
        result += `<!-- Missing: ${ref.path} -->`;
      }
    }

    result += line.slice(cursor) + '\n';
    this.push(result);
  }
}

export function createTransclusionStream(options: TransclusionOptions): TransclusionTransform {
  return new TransclusionTransform(options);
}