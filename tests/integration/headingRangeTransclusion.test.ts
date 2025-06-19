import * as path from 'path';
import * as fs from 'fs/promises';
import { transclude } from '../../src/transclude';
import { MemoryFileCache } from '../../src/fileCache';

describe('Heading Range Transclusion Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/heading-range-test');
  
  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files
    await fs.writeFile(
      path.join(testDir, 'api-docs.md'),
      `# API Documentation

## Introduction
Welcome to our API documentation.

## Authentication
Use bearer tokens for authentication.

### OAuth Flow
Details about OAuth implementation.

## Authorization
Role-based access control is used.

### Permissions
List of available permissions.

## Rate Limiting
API calls are limited to 100 per minute.

## Endpoints
Available endpoints are listed below.`
    );
    
    await fs.writeFile(
      path.join(testDir, 'main.md'),
      `# Main Document

## Security Section

![[api-docs#Authentication:Authorization]]

## Performance

![[api-docs#Rate Limiting:]]

## Start to End Test

![[api-docs#:Authentication]]`
    );
    
    await fs.writeFile(
      path.join(testDir, 'edge-cases.md'),
      `# Edge Cases

## Empty Range
![[api-docs#Non-existent:Another-non-existent]]

## Invalid Syntax
![[api-docs#Authentication:]]more text`
    );
  });
  
  afterAll(async () => {
    // Clean up test files
    await fs.rm(testDir, { recursive: true });
  });
  
  it('should transclude content between two headings', async () => {
    const input = '![[api-docs#Authentication:Authorization]]';
    const result = await transclude(input, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.content).toContain('## Authentication');
    expect(result.content).toContain('Use bearer tokens for authentication.');
    expect(result.content).toContain('### OAuth Flow');
    expect(result.content).toContain('Details about OAuth implementation.');
    expect(result.content).not.toContain('## Authorization');
    expect(result.content).not.toContain('Role-based access control');
  });
  
  it('should transclude from heading to end of document', async () => {
    const input = '![[api-docs#Rate Limiting:]]';
    const result = await transclude(input, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.content).toContain('## Rate Limiting');
    expect(result.content).toContain('API calls are limited to 100 per minute.');
    expect(result.content).toContain('## Endpoints');
    expect(result.content).toContain('Available endpoints are listed below.');
  });
  
  it('should transclude from beginning to heading', async () => {
    const input = '![[api-docs#:Authentication]]';
    const result = await transclude(input, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.content).toContain('# API Documentation');
    expect(result.content).toContain('## Introduction');
    expect(result.content).toContain('Welcome to our API documentation.');
    expect(result.content).not.toContain('## Authentication');
    expect(result.content).not.toContain('Use bearer tokens');
  });
  
  it('should handle errors gracefully', async () => {
    const input = '![[api-docs#Non-existent:Another-non-existent]]';
    const result = await transclude(input, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Start heading "Non-existent" not found');
    expect(result.content).toContain('<!-- Error:');
  });
  
  it('should work with recursive transclusions', async () => {
    // Create a file that transcludes with ranges and then that gets transcluded
    await fs.writeFile(
      path.join(testDir, 'security.md'),
      `# Security Overview

![[api-docs#Authentication:Rate Limiting]]`
    );
    
    await fs.writeFile(
      path.join(testDir, 'master.md'),
      `# Master Document

![[security]]`
    );
    
    const content = await fs.readFile(path.join(testDir, 'master.md'), 'utf-8');
    const result = await transclude(content, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.content).toContain('# Security Overview');
    expect(result.content).toContain('## Authentication');
    expect(result.content).toContain('## Authorization');
    expect(result.content).not.toContain('## Rate Limiting');
  });
  
  it('should handle mixed heading levels in ranges', async () => {
    await fs.writeFile(
      path.join(testDir, 'mixed-levels.md'),
      `# Test Mixed Levels

![[api-docs#OAuth Flow:Permissions]]`
    );
    
    const content = await fs.readFile(path.join(testDir, 'mixed-levels.md'), 'utf-8');
    const result = await transclude(content, {
      basePath: testDir,
      cache: new MemoryFileCache()
    });
    
    expect(result.content).toContain('### OAuth Flow');
    expect(result.content).toContain('## Authorization');
    expect(result.content).toContain('Role-based access control');
    expect(result.content).not.toContain('### Permissions');
  });
});