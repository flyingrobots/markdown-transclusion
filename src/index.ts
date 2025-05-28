export type {
  TransclusionOptions,
  TransclusionError,
  TransclusionResult,
  ParsedReference,
  ResolvedPath,
  FileCacheEntry,
  FileCache,
  TransclusionTransform
} from './types';

export { parseTransclusionReferences } from './parser';
export { validatePath, isWithinBasePath, SecurityError, SecurityErrorCode } from './security';
export { resolvePath, substituteVariables } from './resolver';
export { NoopFileCache, MemoryFileCache } from './fileCache';
export { readFile, readFileSync, FileReaderError, FileReaderErrorCode } from './fileReader';