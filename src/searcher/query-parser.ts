import { ITokenizer, Token } from '../types';

/**
 * 查询解析器
 */
export class QueryParser {
  private readonly tokenizer: ITokenizer;

  constructor(tokenizer: ITokenizer) {
    this.tokenizer = tokenizer;
  }

  /**
   * 解析查询字符串
   */
  parse(
    query: string,
    options?: { exact?: boolean }
  ): {
    terms: string[];
    tokens: Token[];
    isPhrase: boolean;
  } {
    if (!query || typeof query !== 'string') {
      return { terms: [], tokens: [], isPhrase: false };
    }

    // 如果是精确匹配（短语搜索），不进行分词
    if (options?.exact) {
      const normalizedQuery = query.trim().toLowerCase();
      return {
        terms: [normalizedQuery],
        tokens: [
          {
            term: normalizedQuery,
            position: 0,
            length: normalizedQuery.length,
          },
        ],
        isPhrase: true,
      };
    }

    // 普通查询：分词
    const tokens = this.tokenizer.tokenize(query);
    const terms = tokens.map((t) => t.term);

    return {
      terms,
      tokens,
      isPhrase: false,
    };
  }

  /**
   * 提取查询中的短语（用引号包围的部分）
   * 该方法可用于实现混合查询，例如：
   * 短语部分："exact phrase" 进行精确匹配
   * 剩余部分：hello world 进行分词匹配
   * 这样可以在一个查询中同时支持精确短语匹配和普通关键词搜索。
   */
  extractPhrases(query: string): { phrases: string[]; remainingQuery: string } {
    const phrases: string[] = [];
    let remainingQuery = query;

    // 匹配引号中的内容
    const phraseRegex = /"([^"]+)"/g;
    let match: RegExpMatchArray | null;

    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1].trim());
      remainingQuery = remainingQuery.replace(match[0], '');
    }

    return {
      phrases: phrases.map((p) => p.toLowerCase()),
      remainingQuery: remainingQuery.trim(),
    };
  }
}
