import { InvertedIndex } from '../indexer/inverted-index';
import { QueryParser } from './query-parser';
import { IndexedDBWrapper } from '../database/db';
import { DocumentsStore } from '../database/stores/documents-store';
import { SearchOptions, SearchResult, SearchResultItem, MatchInfo, ITokenizer } from '../types';
import { findSimilarTerms } from '../indexer/ngram';

/**
 * 搜索器
 */
export class Searcher {
  private readonly invertedIndex: InvertedIndex;
  private readonly queryParser: QueryParser;
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;
  private readonly documentsStore: DocumentsStore;

  constructor(db: IndexedDBWrapper, invertedIndex: InvertedIndex, tokenizer: ITokenizer) {
    this.db = db;
    this.invertedIndex = invertedIndex;
    this.tokenizer = tokenizer;
    this.queryParser = new QueryParser(tokenizer);
    this.documentsStore = new DocumentsStore(db);
  }

  /**
   * 执行搜索
   */
  async search<T = any>(query: string, options: SearchOptions = {}): Promise<SearchResult<T>> {
    if (!query || typeof query !== 'string') {
      return { docIds: [], items: [], total: 0 };
    }

    const { fuzzy = false, exact = false, operator = 'AND', limit, offset = 0 } = options;

    // 解析查询
    const { terms, isPhrase } = this.queryParser.parse(query, { exact });

    if (terms.length === 0) {
      return { docIds: [], items: [], total: 0 };
    }

    // 查找文档ID
    let docIds: Set<string>;

    if (isPhrase) {
      // 短语搜索：需要精确匹配整个短语
      docIds = await this.searchPhrase(terms[0]);
    } else if (fuzzy) {
      // 模糊匹配
      docIds = await this.searchFuzzy(terms, operator);
    } else {
      // 精确匹配
      docIds =
        operator === 'AND'
          ? await this.invertedIndex.findDocumentsByTermsAnd(terms)
          : await this.invertedIndex.findDocumentsByTermsOr(terms);
    }

    // 转换为数组并应用分页
    let docIdsArray = Array.from(docIds);
    const total = docIdsArray.length;

    if (offset > 0) {
      docIdsArray = docIdsArray.slice(offset);
    }
    if (limit && limit > 0) {
      docIdsArray = docIdsArray.slice(0, limit);
    }

    // 获取完整文档
    const items = await this.getSearchResultItems<T>(docIdsArray, query, options);

    return {
      docIds: docIdsArray,
      items,
      total,
    };
  }

  /**
   * 短语搜索
   */
  private async searchPhrase(phrase: string): Promise<Set<string>> {
    // 短语搜索：查找包含完整短语的文档
    // 1. 先将短语分词，找到包含所有词的文档（AND操作）
    // 2. 然后检查这些文档的原始内容中是否包含完整的短语

    const phraseLower = phrase.toLowerCase().trim();
    if (!phraseLower) {
      return new Set<string>();
    }

    // 将短语分词，找到包含所有词的候选文档
    const tokens = this.tokenizer.tokenize(phrase);
    const terms = tokens.map((t) => t.term);

    if (terms.length === 0) {
      return new Set<string>();
    }

    // 找到包含所有词的文档（AND操作）
    const candidateDocIds = await this.invertedIndex.findDocumentsByTermsAnd(terms);

    if (candidateDocIds.size === 0) {
      return new Set<string>();
    }

    // 检查这些文档的原始内容中是否包含完整的短语
    const matchingDocIds = new Set<string>();

    for (const docId of candidateDocIds) {
      const doc = await this.getDocument(docId);
      if (!doc) {
        continue;
      }

      // 检查文档的所有字符串字段中是否包含完整短语
      let found = false;
      for (const [field, value] of Object.entries(doc)) {
        if (typeof value === 'string' && value) {
          const textLower = value.toLowerCase();
          if (textLower.includes(phraseLower)) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        matchingDocIds.add(docId);
      }
    }

    return matchingDocIds;
  }

  /**
   * 模糊搜索
   */
  private async searchFuzzy(terms: string[], operator: 'AND' | 'OR'): Promise<Set<string>> {
    // 获取所有索引词
    const allTerms = await this.invertedIndex.getAllTerms();

    // 为每个查询词找到相似的词
    const similarTermSets: Set<string>[] = [];

    for (const term of terms) {
      const similar = findSimilarTerms(term, allTerms, 0.6);
      const similarTerms = new Set(similar.map((s) => s.term));
      similarTerms.add(term); // 包含原始词
      similarTermSets.push(similarTerms);
    }

    // 查找文档
    const docIdSets = await Promise.all(
      similarTermSets.map(async (similarTerms) => {
        const termArray = Array.from(similarTerms);
        return operator === 'AND'
          ? await this.invertedIndex.findDocumentsByTermsAnd(termArray)
          : await this.invertedIndex.findDocumentsByTermsOr(termArray);
      })
    );

    // 合并结果
    if (operator === 'AND') {
      // 求交集
      let result = docIdSets[0];
      for (let i = 1; i < docIdSets.length; i++) {
        result = new Set([...result].filter((id) => docIdSets[i].has(id)));
      }
      return result;
    } else {
      // 求并集
      const result = new Set<string>();
      for (const docIdSet of docIdSets) {
        for (const docId of docIdSet) {
          result.add(docId);
        }
      }
      return result;
    }
  }

  /**
   * 获取搜索结果项
   */
  private async getSearchResultItems<T>(
    docIds: string[],
    query: string,
    options: SearchOptions
  ): Promise<SearchResultItem<T>[]> {
    const items: SearchResultItem<T>[] = [];

    for (const docId of docIds) {
      const doc = await this.getDocument<T>(docId);
      if (!doc) {
        continue;
      }

      const item: SearchResultItem<T> = {
        docId,
        doc,
      };

      // 如果需要高亮，计算匹配位置
      if (options.highlight) {
        item.matches = this.findMatches(doc, query);
      }

      items.push(item);
    }

    return items;
  }

  /**
   * 查找匹配位置
   */
  private findMatches(doc: any, query: string): MatchInfo[] {
    const matches: MatchInfo[] = [];
    const queryLower = query.toLowerCase();

    // 遍历文档的所有字符串字段
    for (const [field, value] of Object.entries(doc)) {
      if (typeof value === 'string' && value) {
        const textLower = value.toLowerCase();
        let index = 0;

        while ((index = textLower.indexOf(queryLower, index)) !== -1) {
          matches.push({
            term: query,
            position: index,
            length: query.length,
            field,
          });
          index += query.length;
        }
      }
    }

    return matches;
  }

  /**
   * 获取文档
   */
  private async getDocument<T>(docId: string): Promise<T | null> {
    return await this.documentsStore.get<T>(docId);
  }
}
