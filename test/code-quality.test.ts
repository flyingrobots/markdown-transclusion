import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

describe('Code Quality Checks', () => {
  const projectRoot = join(__dirname, '..');
  
  // Configuration via environment variables
  const scanPaths = process.env.SCAN_PATHS 
    ? process.env.SCAN_PATHS.split(',').map(p => join(projectRoot, p.trim()))
    : [join(projectRoot, 'src')];
  
  const noEmoji = process.env.NO_EMOJI === 'true' || process.env.CI === 'true';
  const reportPath = process.env.QUALITY_REPORT_PATH || join(projectRoot, 'code-quality-report.json');
  const failOnCritical = process.env.FAIL_ON_CRITICAL !== 'false'; // Default true

  interface ScanResult {
    pattern: RegExp;
    label: string;
    matches: string[];
    severity: 'warning' | 'critical';
  }

  interface Match {
    relativePath: string;
    lineNum: number;
    content: string;
    fullMatch: string;
  }

  interface QualityReport {
    timestamp: string;
    scannedPaths: string[];
    summary: {
      totalIssues: number;
      warnings: number;
      critical: number;
      byType: Record<string, number>;
    };
    results: Array<{
      label: string;
      severity: string;
      count: number;
      matches: string[];
    }>;
  }

  // Store all scan results to avoid double scanning
  let allResults: ScanResult[] = [];
  let hasCriticalIssues = false;

  /**
   * Get severity indicator (emoji or text)
   */
  function getSeverityIndicator(severity: 'warning' | 'critical'): string {
    if (noEmoji) {
      return severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
    }
    return severity === 'critical' ? '🔴' : '🟡';
  }

  /**
   * Parse and sort matches by file path and line number
   */
  function sortMatches(matches: string[]): string[] {
    const parsed: Match[] = matches.map(match => {
      const [location, ...contentParts] = match.split(' - ');
      const [relativePath, lineNum] = location.split(':');
      return {
        relativePath,
        lineNum: parseInt(lineNum, 10),
        content: contentParts.join(' - '),
        fullMatch: match
      };
    });

    // Sort by file path first, then by line number
    parsed.sort((a, b) => {
      const pathCompare = a.relativePath.localeCompare(b.relativePath);
      if (pathCompare !== 0) return pathCompare;
      return a.lineNum - b.lineNum;
    });

    return parsed.map(p => p.fullMatch);
  }

  /**
   * Scan for a pattern in all TypeScript/JavaScript files
   */
  function scanForPattern(pattern: RegExp, label: string, severity: 'warning' | 'critical' = 'warning'): ScanResult {
    const matches: string[] = [];
    
    function searchDir(currentDir: string): void {
      try {
        const files = readdirSync(currentDir);
        
        for (const file of files) {
          const fullPath = join(currentDir, file);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            searchDir(fullPath);
          } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            try {
              const content = readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              
              lines.forEach((line, index) => {
                if (pattern.test(line)) {
                  const relativePath = relative(projectRoot, fullPath);
                  const lineNum = index + 1;
                  const trimmedLine = line.trim();
                  matches.push(`${relativePath}:${lineNum} - ${trimmedLine}`);
                }
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    // Scan all configured paths
    scanPaths.forEach(scanPath => searchDir(scanPath));
    
    return { 
      pattern, 
      label, 
      matches: sortMatches(matches), 
      severity 
    };
  }

  /**
   * Format and display matches for a pattern
   */
  function formatMatches(result: ScanResult): void {
    if (result.matches.length === 0) return;
    
    const prefix = result.severity === 'critical' ? '[CRITICAL]' : '';
    result.matches.forEach(match => {
      console.warn(`${prefix}[${result.label}] ${match}`);
    });
  }

  /**
   * Generate and save quality report
   */
  function generateReport(results: ScanResult[]): QualityReport {
    const warnings = results.filter(r => r.severity === 'warning' && r.matches.length > 0);
    const critical = results.filter(r => r.severity === 'critical' && r.matches.length > 0);
    
    const byType: Record<string, number> = {};
    results.forEach(r => {
      if (r.matches.length > 0) {
        byType[r.label] = r.matches.length;
      }
    });

    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      scannedPaths: scanPaths.map(p => relative(projectRoot, p)),
      summary: {
        totalIssues: results.reduce((sum, r) => sum + r.matches.length, 0),
        warnings: warnings.reduce((sum, r) => sum + r.matches.length, 0),
        critical: critical.reduce((sum, r) => sum + r.matches.length, 0),
        byType
      },
      results: results
        .filter(r => r.matches.length > 0)
        .map(r => ({
          label: r.label,
          severity: r.severity,
          count: r.matches.length,
          matches: r.matches
        }))
    };

    // Save report to file
    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      if (process.env.SHOW_CODE_QUALITY_OUTPUT === 'true') {
        console.warn(`\nCode quality report saved to: ${relative(projectRoot, reportPath)}`);
      }
    } catch (error) {
      console.error('Failed to save code quality report:', error);
    }

    return report;
  }

  /**
   * Display summary of all scan results
   */
  function displaySummary(results: ScanResult[]): void {
    const hasIssues = results.some(r => r.matches.length > 0);
    const showOutput = process.env.SHOW_CODE_QUALITY_OUTPUT === 'true';
    
    if (hasIssues && showOutput) {
      console.warn('\n=== CODE QUALITY SUMMARY ===');
      console.warn(`Scanned paths: ${scanPaths.map(p => relative(projectRoot, p)).join(', ')}`);
      console.warn('');
      
      // Sort results by severity (critical first) then by label
      const sortedResults = [...results].sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === 'critical' ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });
      
      sortedResults.forEach(result => {
        if (result.matches.length > 0) {
          const indicator = getSeverityIndicator(result.severity);
          console.warn(`${indicator} ${result.label}: ${result.matches.length}`);
        }
      });
      
      console.warn('=============================\n');
    }

    // Generate and save report
    generateReport(results);

    // Check for critical issues
    const criticalCount = results
      .filter(r => r.severity === 'critical')
      .reduce((sum, r) => sum + r.matches.length, 0);

    if (criticalCount > 0 && failOnCritical) {
      throw new Error(`CRITICAL SECURITY ISSUES FOUND: ${criticalCount} critical issue(s) detected. Aborting pipeline.`);
    }
  }

  // Define all patterns to check
  const patterns = [
    { pattern: /TODO/i, label: 'TODO', severity: 'warning' as const },
    { pattern: /FIXME/i, label: 'FIXME', severity: 'warning' as const },
    { pattern: /HACK/i, label: 'HACK', severity: 'warning' as const },
    { pattern: /@ts-ignore/, label: '@ts-ignore', severity: 'warning' as const },
    { pattern: /console\.log\s*\(/, label: 'console.log', severity: 'warning' as const },
    { pattern: /\beval\s*\(/, label: 'eval', severity: 'critical' as const },
    { pattern: /new\s+Function\s*\(/, label: 'new Function', severity: 'critical' as const },
    { pattern: /new\s+Buffer\s*\(/, label: 'new Buffer', severity: 'critical' as const },
  ];

  // Special pattern for unsafe any usage (excluding Record<string, any>)
  const unsafeAnyPattern = {
    pattern: /:\s*any\b(?!.*Record\s*<\s*string\s*,\s*any\s*>)/,
    label: 'unsafe any',
    severity: 'warning' as const,
    customCheck: (line: string) => {
      // Skip if it's part of Record<string, any>
      if (line.includes('Record<string, any>')) return false;
      // Skip if it's in a comment
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      return true;
    }
  };

  /**
   * Scan for unsafe any usage with custom filtering
   */
  function scanForUnsafeAny(): ScanResult {
    const matches: string[] = [];
    
    function searchDir(currentDir: string): void {
      try {
        const files = readdirSync(currentDir);
        
        for (const file of files) {
          const fullPath = join(currentDir, file);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            searchDir(fullPath);
          } else if (file.endsWith('.ts')) { // Only TypeScript files
            try {
              const content = readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              
              lines.forEach((line, index) => {
                if (unsafeAnyPattern.pattern.test(line) && unsafeAnyPattern.customCheck(line)) {
                  const relativePath = relative(projectRoot, fullPath);
                  const lineNum = index + 1;
                  const trimmedLine = line.trim();
                  matches.push(`${relativePath}:${lineNum} - ${trimmedLine}`);
                }
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    // Scan all configured paths
    scanPaths.forEach(scanPath => searchDir(scanPath));
    
    return { 
      pattern: unsafeAnyPattern.pattern, 
      label: unsafeAnyPattern.label, 
      matches: sortMatches(matches), 
      severity: unsafeAnyPattern.severity 
    };
  }

  // Run all scans once in beforeAll
  beforeAll(() => {
    allResults = [
      ...patterns.map(p => scanForPattern(p.pattern, p.label, p.severity)),
      scanForUnsafeAny()
    ];

    // Check for critical issues early
    hasCriticalIssues = allResults.some(r => 
      r.severity === 'critical' && r.matches.length > 0
    );
  });

  // Use parametrized tests for standard patterns
  describe.each(patterns)('Pattern: $label', ({ pattern, label }) => {
    it(`[${label}] should not exist in codebase`, () => {
      // Find the pre-scanned result
      const result = allResults.find(r => r.label === label);
      
      if (result && result.matches.length > 0) {
        formatMatches(result);
      }
      
      expect(result?.matches || []).toHaveLength(0);
    });
  });

  // Special test for unsafe any
  it.skip('[unsafe any] should be avoided except in Record<string, any>', () => {
    // Find the pre-scanned result
    const result = allResults.find(r => r.label === 'unsafe any');
    
    if (result && result.matches.length > 0) {
      formatMatches(result);
    }
    
    expect(result?.matches || []).toHaveLength(0);
  });

  // Display summary after all tests
  afterAll(() => {
    displaySummary(allResults);
  });
});