/**
 * N-gram 模糊匹配工具
 */

/**
 * 生成 N-gram
 */
export function generateNGrams(text: string, n: number): string[] {
  if (!text || text.length < n) {
    return [text];
  }

  const grams: string[] = [];
  for (let i = 0; i <= text.length - n; i++) {
    grams.push(text.substring(i, i + n));
  }
  return grams;
}

/**
 * 生成 2-gram 和 3-gram
 */
export function generateNGramsCombined(text: string): string[] {
  const bigrams = generateNGrams(text, 2);
  const trigrams = generateNGrams(text, 3);
  return [...bigrams, ...trigrams];
}

/**
 * 计算编辑距离（Levenshtein Distance）
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];

  // 初始化矩阵
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 删除
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j - 1] + 1  // 替换
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * 计算相似度（0-1之间，1表示完全相同）
 */
export function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * 模糊匹配：查找相似的词
 */
export function findSimilarTerms(
  targetTerm: string,
  candidateTerms: string[],
  threshold: number = 0.6
): Array<{ term: string; similarity: number }> {
  const results: Array<{ term: string; similarity: number }> = [];

  for (const term of candidateTerms) {
    const sim = similarity(targetTerm, term);
    if (sim >= threshold) {
      results.push({ term, similarity: sim });
    }
  }

  // 按相似度降序排序
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * 使用 N-gram 查找候选词
 */
export function findCandidatesByNGram(
  targetTerm: string,
  termNGramMap: Map<string, Set<string>>,
  minMatches: number = 2
): Set<string> {
  const targetGrams = generateNGramsCombined(targetTerm);
  const candidateCounts = new Map<string, number>();

  // 统计每个候选词的匹配次数
  for (const gram of targetGrams) {
    const candidates = termNGramMap.get(gram);
    if (candidates) {
      for (const candidate of candidates) {
        candidateCounts.set(
          candidate,
          (candidateCounts.get(candidate) || 0) + 1
        );
      }
    }
  }

  // 筛选出匹配次数足够的候选词
  const result = new Set<string>();
  for (const [term, count] of candidateCounts.entries()) {
    if (count >= minMatches) {
      result.add(term);
    }
  }

  return result;
}

