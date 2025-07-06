#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';

interface TestProcess {
  name: string;
  command: string[];
  process?: ChildProcess;
  completed: boolean;
  exitCode?: number;
}

class Colors {
  static readonly RED = '\033[0;31m';
  static readonly GREEN = '\033[0;32m';
  static readonly YELLOW = '\033[1;33m';
  static readonly BLUE = '\033[0;34m';
  static readonly NC = '\033[0m'; // No Color
}

class PrePushTester {
  private processes: TestProcess[] = [
    { name: 'lint', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'lint'], completed: false },
    { name: 'typecheck', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'type-check'], completed: false },
    { name: 'node18', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node18'], completed: false },
    { name: 'node20', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node20'], completed: false },
    { name: 'node22', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node22'], completed: false },
  ];

  private printStatus(message: string) {
    console.log(`${Colors.BLUE}[PRE-PUSH]${Colors.NC} ${message}`);
  }

  private printSuccess(message: string) {
    console.log(`${Colors.GREEN}[PRE-PUSH]${Colors.NC} ✓ ${message}`);
  }

  private printError(message: string) {
    console.log(`${Colors.RED}[PRE-PUSH]${Colors.NC} ✗ ${message}`);
  }

  private printWarning(message: string) {
    console.log(`${Colors.YELLOW}[PRE-PUSH]${Colors.NC} ⚠ ${message}`);
  }

  private async checkDockerRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const docker = spawn('docker', ['info'], { stdio: 'pipe' });
      docker.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  private async cleanup() {
    this.printWarning('Cleaning up background processes...');
    
    // Kill all running processes
    for (const proc of this.processes) {
      if (proc.process && !proc.completed) {
        proc.process.kill('SIGTERM');
      }
    }

    // Force cleanup Docker containers
    try {
      const cleanup = spawn('docker', ['compose', '-f', 'test/docker/docker-compose.test.yml', 'down', '--remove-orphans'], { stdio: 'pipe' });
      await new Promise(resolve => cleanup.on('close', resolve));
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private startProcess(testProc: TestProcess): Promise<number> {
    return new Promise((resolve, reject) => {
      this.printStatus(`Starting ${testProc.name}...`);
      
      const proc = spawn(testProc.command[0], testProc.command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      testProc.process = proc;

      // Stream stdout with labels
      proc.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            console.log(`[${testProc.name}] ${line}`);
          }
        }
      });

      // Stream stderr with labels  
      proc.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            console.log(`[${testProc.name}] ${line}`);
          }
        }
      });

      proc.on('close', (code) => {
        testProc.completed = true;
        testProc.exitCode = code || 0;
        resolve(code || 0);
      });

      proc.on('error', (error) => {
        testProc.completed = true;
        testProc.exitCode = 1;
        reject(error);
      });
    });
  }

  async run(): Promise<void> {
    // Setup cleanup handlers
    process.on('SIGINT', () => this.cleanup().then(() => process.exit(1)));
    process.on('SIGTERM', () => this.cleanup().then(() => process.exit(1)));
    process.on('exit', () => this.cleanup());

    this.printStatus('Running pre-push checks...');
    console.log();

    // Check if Docker is running
    if (!(await this.checkDockerRunning())) {
      this.printError('Docker is not running. Please start Docker and try again.');
      process.exit(1);
    }

    this.printStatus('Running all checks in parallel with streaming output...');
    console.log();

    // Start all processes in parallel
    const promises = this.processes.map(proc => this.startProcess(proc));

    try {
      const results = await Promise.all(promises);
      
      console.log();
      this.printStatus('All checks completed. Results:');
      console.log();

      let failed = false;
      for (let i = 0; i < this.processes.length; i++) {
        const proc = this.processes[i];
        const exitCode = results[i];
        
        if (exitCode === 0) {
          this.printSuccess(`${proc.name} passed`);
        } else {
          this.printError(`${proc.name} failed (exit code: ${exitCode})`);
          failed = true;
        }
      }

      if (failed) {
        console.log();
        this.printError('Some checks failed. Please fix the issues and try again.');
        process.exit(1);
      } else {
        console.log();
        this.printSuccess('All pre-push checks passed! 🚀');
        this.printStatus('Safe to push to remote repository.');
      }
    } catch (error) {
      this.printError(`Error running checks: ${error}`);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run the tests
new PrePushTester().run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});