import { ITokenizer, Token } from '../../types';
import { generateNGrams } from '../ngram';

/**
 * 中英文混合分词器
 * 特性：
 * 1. 英文单词分词（支持连字符、撇号等，如 "state-of-the-art"）
 * 2. 中文N-gram分词（2-gram + 单字，提高搜索准确性和召回率）
 * 3. 数字处理（支持整数和小数）
 * 4. 中英文混合文本处理
 *
 * 中文分词策略：
 * - 使用2-gram（二元组）捕获词语边界，如 "你好世界" -> ["你好", "好世", "世界"]
 * - 同时保留单字tokens以提高召回率，如 "你好世界" -> ["你", "好", "世", "界"]
 * - 这样既能匹配完整词语，也能匹配单个字符
 *
 * 示例：
 * "Hello世界123" -> ["hello", "世", "界", "世界", "123"]
 * "state-of-the-art技术" -> ["state-of-the-art", "技", "术", "技术"]
 * "你好世界" -> ["你", "好", "世", "界", "你好", "好世", "世界"]
 */
export class MixedTokenizer implements ITokenizer {
  // 匹配中文字符（包括扩展区域）
  private readonly chineseCharRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

  // 匹配英文字母
  private readonly englishCharRegex = /[a-zA-Z]/;

  // 匹配数字
  private readonly digitRegex = /\d/;

  // 匹配英文单词（包括连字符和撇号）
  private readonly englishWordRegex = /[a-zA-Z]+(?:[-'][a-zA-Z]+)*/g;

  // 匹配数字（包括小数）
  private readonly numberRegex = /\d+(?:\.\d+)?/g;

  /**
   * 判断字符是否为中文
   */
  private isChinese(char: string): boolean {
    return this.chineseCharRegex.test(char);
  }

  /**
   * 判断字符是否为英文
   */
  private isEnglish(char: string): boolean {
    return this.englishCharRegex.test(char);
  }

  /**
   * 判断字符是否为数字
   */
  private isDigit(char: string): boolean {
    return this.digitRegex.test(char);
  }

  /**
   * 处理英文单词
   */
  private processEnglishWord(
    text: string,
    startPos: number
  ): { word: string; length: number } | null {
    this.englishWordRegex.lastIndex = 0;
    const match = this.englishWordRegex.exec(text.slice(startPos));
    if (match) {
      return {
        word: match[0].toLowerCase(),
        length: match[0].length,
      };
    }
    return null;
  }

  /**
   * 处理数字
   */
  private processNumber(text: string, startPos: number): { num: string; length: number } | null {
    this.numberRegex.lastIndex = 0;
    const match = this.numberRegex.exec(text.slice(startPos));
    if (match) {
      return {
        num: match[0],
        length: match[0].length,
      };
    }
    return null;
  }

  /**
   * 处理中文字符
   * 使用N-gram策略：生成2-gram和单字tokens
   * 这样既能捕获词语边界，又能保证单字搜索的召回率
   * @returns tokens数组和实际处理的字符长度
   */
  private processChineseChars(text: string, startPos: number): { tokens: Token[]; charLength: number } {
    const tokens: Token[] = [];
    let i = startPos;
    const chineseStart = i;
    
    // 先收集所有连续的中文字符
    while (i < text.length && this.isChinese(text[i])) {
      i++;
    }
    
    const chineseText = text.slice(chineseStart, i);
    const chineseLength = chineseText.length;
    
    if (chineseLength === 0) {
      return { tokens: [], charLength: 0 };
    }
    
    // 1. 生成单字tokens（保证单字搜索的召回率）
    for (let j = 0; j < chineseLength; j++) {
      tokens.push({
        term: chineseText[j],
        position: chineseStart + j,
        length: 1,
      });
    }
    
    // 2. 生成2-gram tokens（捕获词语边界，提高搜索准确性）
    // 例如 "你好世界" -> ["你好", "好世", "世界"]
    // 注意：只有当长度 >= 2 时才生成 2-gram
    if (chineseLength >= 2) {
      const bigrams = generateNGrams(chineseText, 2);
      for (let j = 0; j < bigrams.length; j++) {
        tokens.push({
          term: bigrams[j],
          position: chineseStart + j,
          length: 2,
        });
      }
    }
    
    return { tokens, charLength: chineseLength };
  }

  /**
   * 判断是否应该跳过当前字符
   */
  private shouldSkip(char: string): boolean {
    return (
      /\s/.test(char) || (!this.isChinese(char) && !this.isEnglish(char) && !this.isDigit(char))
    );
  }

  /**
   * 处理当前字符位置的内容，返回处理后的tokens和新的位置
   */
  private processToken(text: string, pos: number): { tokens: Token[]; nextPos: number } {
    const char = text[pos];

    // 处理英文单词
    if (this.isEnglish(char)) {
      const result = this.processEnglishWord(text, pos);
      if (result) {
        return {
          tokens: [
            {
              term: result.word,
              position: pos,
              length: result.length,
            },
          ],
          nextPos: pos + result.length,
        };
      }
    }

    // 处理数字
    if (this.isDigit(char)) {
      const result = this.processNumber(text, pos);
      if (result) {
        return {
          tokens: [
            {
              term: result.num,
              position: pos,
              length: result.length,
            },
          ],
          nextPos: pos + result.length,
        };
      }
    }

    // 处理中文字符
    if (this.isChinese(char)) {
      const { tokens: chineseTokens, charLength } = this.processChineseChars(text, pos);
      return {
        tokens: chineseTokens,
        nextPos: pos + charLength,
      };
    }

    // 如果都不匹配，跳过该字符
    return { tokens: [], nextPos: pos + 1 };
  }

  /**
   * 对文本进行分词
   */
  tokenize(text: string): Token[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const tokens: Token[] = [];
    let i = 0;

    while (i < text.length) {
      // 跳过空白字符和标点符号（非中英数）
      if (this.shouldSkip(text[i])) {
        i++;
        continue;
      }

      const result = this.processToken(text, i);
      tokens.push(...result.tokens);
      i = result.nextPos;
    }

    return tokens;
  }
}
