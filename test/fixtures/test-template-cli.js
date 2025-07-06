#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Create a simple test to verify function-based template variables work
const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
const testFile = path.join(__dirname, 'test-template.md');

// This would be used programmatically, not via CLI
// For CLI, we only support string values
const result = execSync(`node "${cliPath}" "${testFile}" --template-variables "title=Dynamic Title,date=$(date +%Y-%m-%d),author=CLI User,content=Generated content"`, {
  encoding: 'utf8',
  shell: true
});

console.log(result);