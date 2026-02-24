import { describe, it, expect } from 'vitest';
import { highlightCode } from './highlight';

describe('highlightCode', () => {
  it('should highlight JavaScript code', () => {
    const code = 'const x = 1;';
    const result = highlightCode(code, 'javascript');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
    expect(result).toContain('hljs');
    expect(result).toContain('const');
  });

  it('should highlight TypeScript code', () => {
    const code = 'interface User { name: string; }';
    const result = highlightCode(code, 'typescript');
    expect(result).toContain('<pre>');
    expect(result).toContain('interface');
  });

  it('should highlight Python code', () => {
    const code = 'def hello():\n    print("Hello")';
    const result = highlightCode(code, 'python');
    expect(result).toContain('<pre>');
    expect(result).toContain('def');
  });

  it('should highlight Go code', () => {
    const code = 'func main() {\n    fmt.Println("Hello")\n}';
    const result = highlightCode(code, 'go');
    expect(result).toContain('<pre>');
    expect(result).toContain('func');
  });

  it('should use language aliases', () => {
    const code = 'const x = 1;';
    const result = highlightCode(code, 'js');
    expect(result).toContain('<pre>');
    expect(result).toContain('const');
  });

  it('should handle tsx as typescript', () => {
    const code = 'const Component = () => <div />;';
    const result = highlightCode(code, 'tsx');
    expect(result).toContain('<pre>');
  });

  it('should handle yml as yaml', () => {
    const code = 'key: value';
    const result = highlightCode(code, 'yml');
    expect(result).toContain('<pre>');
  });

  it('should handle sh as bash', () => {
    const code = 'echo "Hello"';
    const result = highlightCode(code, 'sh');
    expect(result).toContain('<pre>');
    expect(result).toContain('echo');
  });

  it('should auto-detect language when not specified', () => {
    const code = 'function test() { return 1; }';
    const result = highlightCode(code);
    expect(result).toContain('<pre>');
    expect(result).toContain('function');
  });

  it('should fall back to auto-detect for unsupported languages', () => {
    const code = 'some code here';
    const result = highlightCode(code, 'unsupportedlang');
    expect(result).toContain('<pre>');
    // Auto-detect may wrap parts of the code in spans, so check for the pre/code structure
    expect(result).toContain('<code');
    expect(result).toContain('some');
  });

  it('should escape HTML in code', () => {
    const code = '<script>alert("xss")</script>';
    const result = highlightCode(code, 'html');
    // The code should be highlighted, not executed
    expect(result).not.toMatch(/<script>alert/);
  });

  it('should handle empty code', () => {
    const result = highlightCode('', 'javascript');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
  });

  it('should highlight JSON', () => {
    const code = '{"key": "value"}';
    const result = highlightCode(code, 'json');
    expect(result).toContain('<pre>');
    expect(result).toContain('key');
  });

  it('should highlight SQL', () => {
    const code = 'SELECT * FROM users;';
    const result = highlightCode(code, 'sql');
    expect(result).toContain('<pre>');
    expect(result).toContain('SELECT');
  });

  it('should highlight Rust code', () => {
    const code = 'fn main() { println!("Hello"); }';
    const result = highlightCode(code, 'rust');
    expect(result).toContain('<pre>');
    expect(result).toContain('fn');
  });

  it('should highlight Dockerfile', () => {
    const code = 'FROM node:18\nRUN npm install';
    const result = highlightCode(code, 'dockerfile');
    expect(result).toContain('<pre>');
    expect(result).toContain('FROM');
  });

  it('should handle Dockerfile alias', () => {
    const code = 'FROM alpine';
    const result = highlightCode(code, 'dockerfile');
    expect(result).toContain('<pre>');
  });
});
