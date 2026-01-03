import { InvertedIndex } from '../indexer/inverted-index';
import { QueryParser } from './query-parser';
import { IndexedDBWrapper } from '../database/db';
import { DocumentsStore } from '../database/stores/documents-store';
import {
  SearchOptions,
  SearchWithCursorOptions,
  SearchResult,
  SearchResultItem,
  MatchInfo,
  ITokenizer,
  BaseDocument,
} from '../types';
import { findSimilarTerms } from '../indexer/ngram';
import { STORE_NAMES, INDEX_NAMES } from '../database/schema';

/**
 * 搜索器
 */
export class Searcher {
  private readonly invertedIndex: InvertedIndex;
  private readonly queryParser: QueryParser;
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;
  private readonly documentsStore: DocumentsStore;
  // private readonly sorter: Sorter;

  constructor(db: IndexedDBWrapper, invertedIndex: InvertedIndex, tokenizer: ITokenizer) {
    this.db = db;
    this.invertedIndex = invertedIndex;
    this.tokenizer = tokenizer;
    this.queryParser = new QueryParser(tokenizer);
    this.documentsStore = new DocumentsStore(db);
    // this.sorter = new Sorter(db);
  }

  // /**
  //  * 执行搜索
  //  */
  // async search<T extends BaseDocument = BaseDocument>(
  //   query: string,
  //   options: SearchOptions = {}
  // ): Promise<SearchResult<T>> {
  //   if (!query || typeof query !== 'string') {
  //     return { docIds: [], items: [], total: 0 };
  //   }

  //   const { fuzzy = false, exact = false, operator = 'AND', limit, offset = 0, sortBy } = options;

  //   // 解析查询，如果 exact 为 true，则直接返回 query，否则进行分词
  //   const { terms, isPhrase } = this.queryParser.parse(query, { exact });

  //   if (terms.length === 0) {
  //     return { docIds: [], items: [], total: 0 };
  //   }

  //   // 查找文档ID
  //   let docIds: Set<number>;

  //   if (isPhrase) {
  //     // 短语搜索：需要精确匹配整个短语
  //     docIds = await this.searchPhrase(terms[0]);
  //   } else if (fuzzy) {
  //     // 模糊匹配
  //     docIds = await this.searchFuzzy(terms, operator);
  //   } else {
  //     // 精确匹配
  //     docIds =
  //       operator === 'AND'
  //         ? await this.invertedIndex.findDocumentsByTermsAnd(terms)
  //         : await this.invertedIndex.findDocumentsByTermsOr(terms);
  //   }

  //   // 转换为数组
  //   let docIdsArray = Array.from(docIds);

  //   // 排序
  //   if (sortBy && docIdsArray.length > 0) {
  //     // 使用 Sorter 进行自定义排序
  //     docIdsArray = await this.sorter.sort(docIdsArray, sortBy);
  //   } else {
  //     // 默认排序：按 docId 排序（docId 是毫秒级时间戳，按数字排序即可得到时间顺序）
  //     docIdsArray.sort((a, b) => a - b);
  //   }

  //   const total = docIdsArray.length;

  //   // 应用分页
  //   if (offset > 0) {
  //     docIdsArray = docIdsArray.slice(offset);
  //   }
  //   if (limit && limit > 0) {
  //     docIdsArray = docIdsArray.slice(0, limit);
  //   }

  //   // 获取完整文档
  //   const items = await this.getSearchResultItems<T>(docIdsArray, query, options);

  //   return {
  //     docIds: docIdsArray,
  //     items,
  //     total,
  //   };
  // }

  // /**
  //  * 短语搜索
  //  */
  // private async searchPhrase(phrase: string): Promise<Set<number>> {
  //   // 短语搜索：查找包含完整短语的文档
  //   // 1. 先将短语分词，找到包含所有词的文档（AND操作）
  //   // 2. 然后检查这些文档的原始内容中是否包含完整的短语

  //   const phraseLower = phrase.toLowerCase().trim();
  //   if (!phraseLower) {
  //     return new Set<number>();
  //   }

  //   // 将短语分词，找到包含所有词的候选文档
  //   const tokens = this.tokenizer.tokenize(phrase);
  //   const terms = tokens.map((t) => t.term);

  //   if (terms.length === 0) {
  //     return new Set<number>();
  //   }

  //   // 找到包含所有词的文档（AND操作）
  //   const candidateDocIds = await this.invertedIndex.findDocumentsByTermsAnd(terms);

  //   if (candidateDocIds.size === 0) {
  //     return new Set<number>();
  //   }

  //   // 检查这些文档的原始内容中是否包含完整的短语
  //   const matchingDocIds = new Set<number>();

  //   for (const docId of candidateDocIds) {
  //     const doc = await this.getDocument(docId);
  //     if (!doc) {
  //       continue;
  //     }

  //     // 检查文档的所有字符串字段中是否包含完整短语
  //     let found = false;
  //     for (const [field, value] of Object.entries(doc)) {
  //       if (typeof value === 'string' && value) {
  //         const textLower = value.toLowerCase();
  //         if (textLower.includes(phraseLower)) {
  //           found = true;
  //           break;
  //         }
  //       }
  //     }

  //     if (found) {
  //       matchingDocIds.add(docId);
  //     }
  //   }

  //   return matchingDocIds;
  // }

  // /**
  //  * 模糊搜索
  //  */
  // private async searchFuzzy(terms: string[], operator: 'AND' | 'OR'): Promise<Set<number>> {
  //   // 获取所有索引词
  //   const allTerms = await this.invertedIndex.getAllTerms();

  //   // 为每个查询词找到相似的词
  //   const similarTermSets: Set<string>[] = [];

  //   for (const term of terms) {
  //     const similar = findSimilarTerms(term, allTerms, 0.6);
  //     const similarTerms = new Set(similar.map((s) => s.term));
  //     similarTerms.add(term); // 包含原始词
  //     similarTermSets.push(similarTerms);
  //   }

  //   // 查找文档
  //   const docIdSets = await Promise.all(
  //     similarTermSets.map(async (similarTerms) => {
  //       const termArray = Array.from(similarTerms);
  //       // 对于相似词集合，始终使用 OR 操作（相似词之间是"或"的关系）
  //       // operator 参数只用于多个查询词之间的合并
  //       const result = await this.invertedIndex.findDocumentsByTermsOr(termArray);
  //       return result;
  //     })
  //   );

  //   // 合并结果
  //   if (operator === 'AND') {
  //     // 求交集
  //     let result = docIdSets[0];
  //     for (let i = 1; i < docIdSets.length; i++) {
  //       result = new Set([...result].filter((id) => docIdSets[i].has(id)));
  //     }
  //     return result;
  //   } else {
  //     // 求并集
  //     const result = new Set<number>();
  //     for (const docIdSet of docIdSets) {
  //       for (const docId of docIdSet) {
  //         result.add(docId);
  //       }
  //     }
  //     return result;
  //   }
  // }

  // /**
  //  * 获取搜索结果项
  //  */
  // private async getSearchResultItems<T extends BaseDocument>(
  //   docIds: number[],
  //   query: string,
  //   options: SearchOptions
  // ): Promise<SearchResultItem<T>[]> {
  //   const items: SearchResultItem<T>[] = [];

  //   for (const docId of docIds) {
  //     const doc = await this.getDocument<T>(docId);
  //     if (!doc) {
  //       continue;
  //     }

  //     const item: SearchResultItem<T> = {
  //       docId,
  //       doc,
  //     };

  //     // 如果需要高亮，计算匹配位置
  //     if (options.highlight) {
  //       item.matches = this.findMatches(doc, query);
  //     }

  //     items.push(item);
  //   }

  //   return items;
  // }

  /**
   * 查找匹配位置
   */
  private findMatches<T extends BaseDocument>(doc: T, query: string): MatchInfo[] {
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

  // /**
  //  * 获取文档
  //  */
  // private async getDocument<T extends BaseDocument>(docId: number): Promise<T | null> {
  //   return await this.documentsStore.get<T>(docId);
  // }

  /**
   * 基于游标的搜索（使用 IndexedDB 索引和游标进行排序和分页）
   * 支持精确匹配、模糊匹配和短语搜索
   */
  async searchWithCursor<T extends BaseDocument = BaseDocument>(
    query: string,
    options: SearchWithCursorOptions = {}
  ): Promise<{
    items: SearchResultItem<T>[];
    nextKey?: number;
  }> {
    if (!query || typeof query !== 'string') {
      return { items: [] };
    }

    const {
      sortBy = 'docId',
      order = 'asc',
      operator = 'AND',
      limit = 20,
      lastKey,
      highlight = false,
      fuzzy = false,
      exact = false,
    } = options;

    // 解析查询词
    const { terms, isPhrase } = this.queryParser.parse(query, { exact });
    if (terms.length === 0) {
      return { items: [] };
    }

    // 预处理：如果是模糊搜索，计算相似词集合
    let similarTermSets: Set<string>[] | null = null;
    if (fuzzy) {
      const allTerms = await this.invertedIndex.getAllTerms();
      similarTermSets = [];
      for (const term of terms) {
        const similar = findSimilarTerms(term, allTerms, 0.6);
        const similarTerms = new Set(similar.map((s) => s.term));
        similarTerms.add(term); // 包含原始词
        similarTermSets.push(similarTerms);
      }
    }

    // 预处理：如果是短语搜索，准备短语字符串
    const phraseLower = isPhrase ? query.toLowerCase().trim() : null;

    const db = this.db.getDB();
    const transaction = db.transaction([STORE_NAMES.DOCUMENTS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.DOCUMENTS);

    // 选择索引或主键
    let index: IDBIndex | IDBObjectStore;
    let keyRange: IDBKeyRange | null = null;

    if (sortBy === 'createdAt') {
      index = store.index(INDEX_NAMES.CREATED_AT);
    } else if (sortBy === 'updatedAt') {
      index = store.index(INDEX_NAMES.UPDATED_AT);
    } else {
      // 使用主键 (docId)
      index = store;
    }

    // 构建键范围（用于分页）
    if (lastKey !== undefined) {
      if (order === 'asc') {
        keyRange = IDBKeyRange.lowerBound(lastKey, true);
      } else {
        keyRange = IDBKeyRange.upperBound(lastKey, true);
      }
    }

    const items: SearchResultItem<T>[] = [];
    let cursor: IDBCursorWithValue | null = null;
    let lastMatchedKey: number | undefined = undefined;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(keyRange, order === 'desc' ? 'prev' : 'next');

      request.onsuccess = (event) => {
        cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (!cursor) {
          resolve({
            items,
            nextKey: undefined,
          });
          return;
        }

        const doc = cursor.value as T;
        const currentKey = cursor.key as number;

        // 检查文档是否匹配
        const matches = this.checkDocumentMatch(
          doc,
          query,
          terms,
          isPhrase,
          phraseLower,
          fuzzy,
          similarTermSets,
          operator
        );

        if (matches) {
          const item: SearchResultItem<T> = {
            docId: doc.docId,
            doc: doc,
          };

          // 如果需要高亮，计算匹配位置
          if (highlight) {
            item.matches = this.findMatches(doc, query);
          }

          items.push(item);
          lastMatchedKey = currentKey; // 记录最后一个匹配项的key
        }

        // 在处理完当前文档后，检查是否达到限制
        if (items.length >= limit) {
          // 已达到限制，返回最后一个匹配项的 key 作为 nextKey
          // 如果当前文档匹配，lastMatchedKey 就是 currentKey
          // 如果当前文档不匹配，lastMatchedKey 是之前最后一个匹配项的 key
          resolve({
            items,
            nextKey: lastMatchedKey,
          });
          return;
        }

        // 继续处理下一个文档
        cursor.continue();
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to search with cursor: ${error.message}`));
      };
    });
  }

  /**
   * 检查文档是否匹配查询条件
   */
  private checkDocumentMatch<T extends BaseDocument>(
    doc: T,
    query: string,
    terms: string[],
    isPhrase: boolean,
    phraseLower: string | null,
    fuzzy: boolean,
    similarTermSets: Set<string>[] | null,
    operator: 'AND' | 'OR'
  ): boolean {
    // 短语搜索：检查文档的原始内容中是否包含完整短语
    if (isPhrase && phraseLower) {
      for (const [field, value] of Object.entries(doc)) {
        if (typeof value === 'string' && value) {
          const textLower = value.toLowerCase();
          if (textLower.includes(phraseLower)) {
            return true;
          }
        }
      }
      return false;
    }

    // 模糊匹配：检查 doc.terms 是否包含相似词
    if (fuzzy && similarTermSets) {
      if (!doc.terms || !Array.isArray(doc.terms)) {
        return false;
      }

      if (operator === 'AND') {
        // AND：每个查询词的所有相似词中，至少有一个在 doc.terms 中
        return similarTermSets.every((similarTerms) =>
          Array.from(similarTerms).some((term) => doc.terms!.includes(term))
        );
      } else {
        // OR：任意一个查询词的任意一个相似词在 doc.terms 中
        return similarTermSets.some((similarTerms) =>
          Array.from(similarTerms).some((term) => doc.terms!.includes(term))
        );
      }
    }

    // 精确匹配：使用 terms 字段进行快速过滤
    if (doc.terms && Array.isArray(doc.terms)) {
      // 根据 filterSingleChars 选项决定是否过滤单字符
      let termsToCheck: string[];

      // 对于逻辑运算符搜索，只使用完整词（长度 >= 2），忽略单字符
      // 这样可以避免单字符匹配导致的误匹配
      const fullWords = terms.filter((term) => term.length >= 2);
      // 如果没有完整词，则使用所有词（包括单字符）
      termsToCheck = fullWords.length > 0 ? fullWords : terms;

      return operator === 'AND'
        ? termsToCheck.every((term) => doc.terms!.includes(term))
        : termsToCheck.some((term) => doc.terms!.includes(term));
    }

    return false;
  }
}
