#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { mkdirSync, createWriteStream, WriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

interface TestProcess {
  name: string;
  command: string[];
  process?: ChildProcess;
  completed: boolean;
  exitCode?: number;
  spinner?: Ora;
  logFile?: string;
  logStream?: WriteStream;
}

class PrePushTester {
  private processes: TestProcess[] = [
    { name: 'lint', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'lint'], completed: false },
    { name: 'typecheck', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'type-check'], completed: false },
    { name: 'node18', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node18'], completed: false },
    { name: 'node20', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node20'], completed: false },
    { name: 'node22', command: ['docker', 'compose', '-f', 'test/docker/docker-compose.test.yml', 'run', '--rm', '-T', 'test-node22'], completed: false },
  ];

  private logDir: string;

  constructor() {
    // Create temp directory for logs
    this.logDir = join(tmpdir(), `markdown-transclusion-test-${Date.now()}`);
    mkdirSync(this.logDir, { recursive: true });
  }

  private printStatus(message: string) {
    console.log(`${chalk.blue('[PRE-PUSH]')} ${message}`);
  }

  private printSuccess(message: string) {
    console.log(`${chalk.green('[PRE-PUSH]')} ✓ ${message}`);
  }

  private printError(message: string) {
    console.log(`${chalk.red('[PRE-PUSH]')} ✗ ${message}`);
  }

  private printWarning(message: string) {
    console.log(`${chalk.yellow('[PRE-PUSH]')} ⚠ ${message}`);
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
    
    // Stop all spinners
    for (const proc of this.processes) {
      if (proc.spinner) {
        proc.spinner.stop();
      }
      if (proc.logStream) {
        proc.logStream.end();
      }
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

  private getLogPath(name: string): string {
    return join(this.logDir, `${name}.log`);
  }

  private getClickableLogPath(name: string): string {
    const logPath = this.getLogPath(name);
    // Make it a clickable file:// URL for most terminals
    return `file://${logPath}`;
  }

  private async getLastLines(filePath: string, lines: number = 5): Promise<string[]> {
    return new Promise((resolve) => {
      const tail = spawn('tail', ['-n', lines.toString(), filePath], { stdio: 'pipe' });
      let output = '';
      tail.stdout?.on('data', (data) => {
        output += data.toString();
      });
      tail.on('close', () => {
        resolve(output.trim().split('\n').filter(line => line.trim()));
      });
      tail.on('error', () => {
        resolve(['(could not read log file)']);
      });
    });
  }

  private startProcess(testProc: TestProcess): Promise<number> {
    return new Promise((resolve, reject) => {
      // Set up log file
      testProc.logFile = this.getLogPath(testProc.name);
      testProc.logStream = createWriteStream(testProc.logFile);
      
      // Create and start spinner
      testProc.spinner = ora({
        text: `Running ${testProc.name}...`,
        color: 'blue'
      }).start();
      
      const proc = spawn(testProc.command[0], testProc.command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      testProc.process = proc;

      // Write all output to log file
      proc.stdout?.on('data', (data) => {
        testProc.logStream?.write(data);
      });

      proc.stderr?.on('data', (data) => {
        testProc.logStream?.write(data);
      });

      proc.on('close', (code) => {
        testProc.completed = true;
        testProc.exitCode = code || 0;
        testProc.logStream?.end();
        
        if (code === 0) {
          testProc.spinner?.succeed(chalk.green(`${testProc.name} passed`));
        } else {
          testProc.spinner?.fail(chalk.red(`${testProc.name} failed`));
        }
        
        resolve(code || 0);
      });

      proc.on('error', (error) => {
        testProc.completed = true;
        testProc.exitCode = 1;
        testProc.logStream?.end();
        testProc.spinner?.fail(chalk.red(`${testProc.name} error: ${error.message}`));
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

    this.printStatus('Running all checks in parallel...');
    console.log();

    // Start all processes in parallel
    const promises = this.processes.map(proc => this.startProcess(proc));

    try {
      const results = await Promise.all(promises);
      
      console.log();

      let failed = false;
      const failedProcesses: TestProcess[] = [];
      
      for (let i = 0; i < this.processes.length; i++) {
        const proc = this.processes[i];
        const exitCode = results[i];
        
        if (exitCode !== 0) {
          failed = true;
          failedProcesses.push(proc);
        }
      }

      if (failed) {
        console.log();
        this.printError('Some checks failed:');
        console.log();
        
        for (const proc of failedProcesses) {
          console.log(chalk.red(`❌ ${proc.name} failed`));
          
          // Show last 5 lines of the log
          if (proc.logFile) {
            const lastLines = await this.getLastLines(proc.logFile);
            if (lastLines.length > 0) {
              console.log(chalk.gray('   Last few lines:'));
              for (const line of lastLines) {
                console.log(chalk.gray(`   ${line}`));
              }
            }
            
            // Show clickable link to full log
            console.log(chalk.blue(`   📄 Full log: ${this.getClickableLogPath(proc.name)}`));
            console.log();
          }
        }
        
        this.printError('Please fix the issues and try again.');
        process.exit(1);
      } else {
        this.printSuccess('All pre-push checks passed! 🚀');
        this.printStatus('Safe to push to remote repository.');
        
        // Clean up log directory on success
        try {
          spawn('rm', ['-rf', this.logDir], { stdio: 'pipe' });
        } catch (error) {
          // Ignore cleanup errors
        }
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