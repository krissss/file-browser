/**
 * 代码高亮功能测试
 */
import { describe, it, expect } from 'vitest';
import { highlightCode } from './highlight';

describe('highlightCode', () => {
  it('高亮 JavaScript 代码', () => {
    const code = 'const x = 1;';
    const result = highlightCode(code, 'javascript');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
    expect(result).toContain('hljs');
    expect(result).toContain('const');
  });

  it('高亮 TypeScript 代码', () => {
    const code = 'interface User { name: string; }';
    const result = highlightCode(code, 'typescript');
    expect(result).toContain('<pre>');
    expect(result).toContain('interface');
  });

  it('高亮 Python 代码', () => {
    const code = 'def hello():\n    print("Hello")';
    const result = highlightCode(code, 'python');
    expect(result).toContain('<pre>');
    expect(result).toContain('def');
  });

  it('高亮 Go 代码', () => {
    const code = 'func main() {\n    fmt.Println("Hello")\n}';
    const result = highlightCode(code, 'go');
    expect(result).toContain('<pre>');
    expect(result).toContain('func');
  });

  it('使用语言别名（js -> javascript）', () => {
    const code = 'const x = 1;';
    const result = highlightCode(code, 'js');
    expect(result).toContain('<pre>');
    expect(result).toContain('const');
  });

  it('tsx 作为 typescript 处理', () => {
    const code = 'const Component = () => <div />;';
    const result = highlightCode(code, 'tsx');
    expect(result).toContain('<pre>');
  });

  it('yml 作为 yaml 处理', () => {
    const code = 'key: value';
    const result = highlightCode(code, 'yml');
    expect(result).toContain('<pre>');
  });

  it('sh 作为 bash 处理', () => {
    const code = 'echo "Hello"';
    const result = highlightCode(code, 'sh');
    expect(result).toContain('<pre>');
    expect(result).toContain('echo');
  });

  it('未指定语言时自动检测', () => {
    const code = 'function test() { return 1; }';
    const result = highlightCode(code);
    expect(result).toContain('<pre>');
    expect(result).toContain('function');
  });

  it('不支持的语言回退到自动检测', () => {
    const code = 'some code here';
    const result = highlightCode(code, 'unsupportedlang');
    expect(result).toContain('<pre>');
    // 自动检测可能将代码部分包装在 span 中，检查 pre/code 结构即可
    expect(result).toContain('<code');
    expect(result).toContain('some');
  });

  it('转义代码中的 HTML', () => {
    const code = '<script>alert("xss")</script>';
    const result = highlightCode(code, 'html');
    // 代码应被高亮，而非执行
    expect(result).not.toMatch(/<script>alert/);
  });

  it('处理空代码', () => {
    const result = highlightCode('', 'javascript');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
  });

  it('高亮 JSON', () => {
    const code = '{"key": "value"}';
    const result = highlightCode(code, 'json');
    expect(result).toContain('<pre>');
    expect(result).toContain('key');
  });

  it('高亮 SQL', () => {
    const code = 'SELECT * FROM users;';
    const result = highlightCode(code, 'sql');
    expect(result).toContain('<pre>');
    expect(result).toContain('SELECT');
  });

  it('高亮 Rust 代码', () => {
    const code = 'fn main() { println!("Hello"); }';
    const result = highlightCode(code, 'rust');
    expect(result).toContain('<pre>');
    expect(result).toContain('fn');
  });

  it('高亮 Dockerfile', () => {
    const code = 'FROM node:18\nRUN npm install';
    const result = highlightCode(code, 'dockerfile');
    expect(result).toContain('<pre>');
    expect(result).toContain('FROM');
  });

  it('处理 Dockerfile 别名', () => {
    const code = 'FROM alpine';
    const result = highlightCode(code, 'dockerfile');
    expect(result).toContain('<pre>');
  });
});
