#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const projectRoot = join(__dirname, '..');
const distPath = join(projectRoot, 'dist');

// Check if dist exists
if (!existsSync(distPath)) {
  console.log('⚠️  No dist directory found. Running build first...');
  const build = spawn('npm', ['run', 'build'], { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  build.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Build failed');
      process.exit(1);
    }
    runCodeQuality();
  });
} else {
  runCodeQuality();
}

function runCodeQuality() {
  console.log('🔍 Running code quality checks on dist directory...');
  
  // Run jest with code quality test only, scanning dist
  const test = spawn('jest', ['test/code-quality.test.ts', '--no-coverage'], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      SCAN_PATHS: 'dist',
      SHOW_CODE_QUALITY_OUTPUT: 'true'
    }
  });
  
  test.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Code quality checks passed');
    } else {
      console.error('❌ Code quality checks failed');
    }
    process.exit(code || 0);
  });
}