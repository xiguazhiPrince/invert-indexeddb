import { MatchInfo } from '../types';

/**
 * 高亮工具
 */
export class Highlighter {
  /**
   * 高亮文本中的匹配部分
   */
  static highlight(text: string, matches: MatchInfo[], tag: string = 'mark'): string {
    if (!matches || matches.length === 0) {
      return text;
    }

    // 按位置排序
    const sortedMatches = [...matches].sort((a, b) => a.position - b.position);

    // 从后往前替换，避免位置偏移
    let result = text;
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const match = sortedMatches[i];
      const before = result.substring(0, match.position);
      const matched = result.substring(match.position, match.position + match.length);
      const after = result.substring(match.position + match.length);

      result = `${before}<${tag}>${matched}</${tag}>${after}`;
    }

    return result;
  }

  /**
   * 高亮文档的多个字段
   */
  static highlightDocument(
    doc: Record<string, any>,
    matches: MatchInfo[],
    tag: string = 'mark'
  ): Record<string, any> {
    const result: Record<string, any> = { ...doc };

    // 按字段分组匹配
    const matchesByField = new Map<string, MatchInfo[]>();
    for (const match of matches) {
      if (match.field) {
        if (!matchesByField.has(match.field)) {
          matchesByField.set(match.field, []);
        }
        matchesByField.get(match.field)!.push(match);
      }
    }

    // 高亮每个字段
    for (const [field, fieldMatches] of matchesByField.entries()) {
      if (field in result && typeof result[field] === 'string') {
        result[field] = this.highlight(result[field], fieldMatches, tag);
      }
    }

    return result;
  }

  /**
   * 提取包含匹配的文本片段
   */
  static extractSnippets(text: string, matches: MatchInfo[], contextLength: number = 50): string[] {
    if (!matches || matches.length === 0) {
      return [];
    }

    const snippets: string[] = [];
    const sortedMatches = [...matches].sort((a, b) => a.position - b.position);

    for (const match of sortedMatches) {
      const start = Math.max(0, match.position - contextLength);
      const end = Math.min(text.length, match.position + match.length + contextLength);

      let snippet = text.substring(start, end);

      // 如果不在开头，添加省略号
      if (start > 0) {
        snippet = '...' + snippet;
      }

      // 如果不在结尾，添加省略号
      if (end < text.length) {
        snippet = snippet + '...';
      }

      snippets.push(snippet);
    }

    return snippets;
  }
}
