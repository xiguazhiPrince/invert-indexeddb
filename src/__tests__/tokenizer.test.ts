/**
 * 分词器测试
 */

import { DefaultTokenizer } from '../indexer/tokenizer';

describe('DefaultTokenizer', () => {
  let tokenizer: DefaultTokenizer;

  beforeEach(() => {
    tokenizer = new DefaultTokenizer();
  });

  it('should tokenize English text', () => {
    const text = 'Hello world';
    const tokens = tokenizer.tokenize(text);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].term).toBe('hello');
    expect(tokens[0].position).toBe(0);
    expect(tokens[1].term).toBe('world');
    expect(tokens[1].position).toBe(6);
  });

  it('should tokenize Chinese text', () => {
    const text = '你好世界';
    const tokens = tokenizer.tokenize(text);

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].term).toBe('你好世界');
  });

  it('should tokenize mixed text', () => {
    const text = 'Hello 世界 world';
    const tokens = tokenizer.tokenize(text);

    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle empty string', () => {
    const tokens = tokenizer.tokenize('');
    expect(tokens).toHaveLength(0);
  });

  it('should handle null/undefined', () => {
    expect(tokenizer.tokenize(null as any)).toHaveLength(0);
    expect(tokenizer.tokenize(undefined as any)).toHaveLength(0);
  });

  it('should convert to lowercase', () => {
    const text = 'Hello WORLD';
    const tokens = tokenizer.tokenize(text);

    expect(tokens[0].term).toBe('hello');
    expect(tokens[1].term).toBe('world');
  });
});
