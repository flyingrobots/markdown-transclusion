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