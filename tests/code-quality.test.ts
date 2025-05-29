import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Code Quality Checks', () => {
  /**
   * Recursively search for files containing specific patterns
   */
  function grepRepo(pattern: RegExp, dir = join(__dirname, '..', 'src')): string[] {
    const matches: string[] = [];
    
    function searchDir(currentDir: string): void {
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
                matches.push(`${fullPath}:${index + 1}: ${line.trim()}`);
              }
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
    
    searchDir(dir);
    return matches;
  }

  it('has no TODO comments', () => {
    const todos = grepRepo(/TODO/i);
    
    if (todos.length > 0) {
      console.warn('Found TODO comments:');
      todos.forEach(todo => console.warn(todo));
    }
    
    expect(todos).toHaveLength(0);
  });

  it('has no FIXME comments', () => {
    const fixmes = grepRepo(/FIXME/i);
    
    if (fixmes.length > 0) {
      console.warn('Found FIXME comments:');
      fixmes.forEach(fixme => console.warn(fixme));
    }
    
    expect(fixmes).toHaveLength(0);
  });

  it('has no HACK comments', () => {
    const hacks = grepRepo(/HACK/i);
    
    if (hacks.length > 0) {
      console.warn('Found HACK comments:');
      hacks.forEach(hack => console.warn(hack));
    }
    
    expect(hacks).toHaveLength(0);
  });
});