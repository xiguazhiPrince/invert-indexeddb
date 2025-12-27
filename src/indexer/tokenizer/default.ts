import { ITokenizer, Token } from '../../types';

/**
 * 默认分词器：基于空格和标点符号分词
 * 支持中英文混合
 */
export class DefaultTokenizer implements ITokenizer {
  // 匹配单词字符（字母、数字、中文字符）
  private readonly wordRegex = /[\w\u4e00-\u9fa5]+/g;

  tokenize(text: string): Token[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const tokens: Token[] = [];

    // 使用正则表达式匹配所有词
    let match: RegExpMatchArray | null;
    this.wordRegex.lastIndex = 0;

    while ((match = this.wordRegex.exec(text)) !== null) {
      const term = match[0];
      const position = match.index ?? 0;
      const length = term.length;

      // 跳过太短的词（可选：可以根据需要调整）
      if (term.length > 0) {
        tokens.push({
          term: term.toLowerCase(), // 转换为小写以便搜索
          position,
          length,
        });
      }
    }

    return tokens;
  }
}
