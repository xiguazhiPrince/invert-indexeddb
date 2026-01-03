import { IndexedDBWrapper } from './database/db';
import { DocumentsStore } from './database/stores/documents-store';
import { DocFieldsStore } from './database/stores/doc-fields-store';
import { InvertedIndexStore } from './database/stores/inverted-index-store';
import { DocTermsStore } from './database/stores/doc-terms-store';
import { InvertedIndex } from './indexer/inverted-index';
import { DefaultTokenizer } from './indexer/tokenizer';
import { Searcher } from './searcher/search';
// import { Sorter } from './searcher/sorter';
// import { SearchIds } from './searcher/search-ids';
import { Highlighter } from './utils/highlight';
import { generateId } from './utils/helpers';
import {
  ITokenizer,
  InitOptions,
  SearchOptions,
  SearchResult,
  BaseDocument,
  // SearchIdsOptions,
  // SearchIdsResult,
  Stats,
  RebuildIndexProgress,
  SearchWithCursorOptions,
  SearchResultItem,
} from './types';

/**
 * 倒排索引 IndexedDB SDK 主类
 */
export class InvertedIndexDB {
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;
  private documentsStore: DocumentsStore | null = null;
  private docFieldsStore: DocFieldsStore | null = null;
  private invertedIndexStore: InvertedIndexStore | null = null;
  private docTermsStore: DocTermsStore | null = null;
  private invertedIndex: InvertedIndex | null = null;
  private searcher: Searcher | null = null;
  // private sorter: Sorter | null = null;
  // private searchIdsInstance: SearchIds | null = null;
  private initialized: boolean = false;

  constructor(dbName: string, options: InitOptions = {}) {
    this.db = new IndexedDBWrapper(dbName, options.version);
    this.tokenizer = options.tokenizer || new DefaultTokenizer();
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.db.open();
    this.documentsStore = new DocumentsStore(this.db);
    this.docFieldsStore = new DocFieldsStore(this.db);
    this.invertedIndexStore = new InvertedIndexStore(this.db);
    this.docTermsStore = new DocTermsStore(this.db);
    this.invertedIndex = new InvertedIndex(this.db, this.tokenizer);
    this.searcher = new Searcher(this.db, this.invertedIndex, this.tokenizer);
    // this.sorter = new Sorter(this.db);
    // this.searchIdsInstance = new SearchIds(this.searcher, this.sorter, this.db);
    this.initialized = true;
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  /**
   * 添加文档
   */
  async addDocument<T extends BaseDocument = BaseDocument>(
    doc: Omit<T, 'docId' | 'createdAt' | 'updatedAt' | 'terms'> &
      Partial<Pick<BaseDocument, 'createdAt' | 'updatedAt'>>,
    indexFields?: string[]
  ): Promise<number> {
    this.ensureInitialized();

    const docId = generateId();
    const docWithId: T = {
      ...doc,
      docId,
      createdAt: doc.createdAt ?? Date.now(),
      updatedAt: doc.updatedAt ?? Date.now(),
    } as T;

    // 保存文档
    await this.saveDocument(docId, docWithId);

    // 建立索引
    await this.indexDocument(docId, docWithId, indexFields);

    return docId;
  }

  /**
   * 更新文档
   */
  async updateDocument<T extends BaseDocument = BaseDocument>(
    docId: number,
    doc: Omit<T, 'docId' | 'createdAt' | 'updatedAt' | 'terms'> &
      Partial<Pick<BaseDocument, 'updatedAt'>>,
    indexFields?: string[]
  ): Promise<void> {
    this.ensureInitialized();

    // 删除旧索引
    if (this.invertedIndex) {
      await this.invertedIndex.removeDocumentIndex(docId);
    }

    // 更新文档
    const updatedDoc: T = {
      ...doc,
      docId,
      updatedAt: doc.updatedAt ?? Date.now(),
    } as T;

    await this.saveDocument(docId, updatedDoc);

    // 建立新索引
    await this.indexDocument(docId, updatedDoc, indexFields);
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: number): Promise<void> {
    this.ensureInitialized();

    // 删除索引
    if (this.invertedIndex) {
      await this.invertedIndex.removeDocumentIndex(docId);
    }

    // 删除文档
    await this.deleteDocumentFromStore(docId);

    // 删除字段索引
    await this.deleteDocFields(docId);
  }

  /**
   * 获取文档
   */
  async getDocument<T extends BaseDocument = BaseDocument>(docId: number): Promise<T | null> {
    this.ensureInitialized();

    if (!this.documentsStore) {
      throw new Error('DocumentsStore not initialized');
    }

    return await this.documentsStore.get<T>(docId);
  }

  /**
   * 批量添加文档
   */
  async batchAddDocuments<T extends BaseDocument = BaseDocument>(
    docs: Array<Omit<T, 'docId' | 'createdAt' | 'updatedAt' | 'terms'>>,
    indexFields?: string[]
  ): Promise<number[]> {
    this.ensureInitialized();

    const docIds: number[] = [];

    for (const doc of docs) {
      const docId = await this.addDocument<T>(doc, indexFields);
      docIds.push(docId);
    }

    return docIds;
  }

  /**
   * 搜索
   */
  async search<T extends BaseDocument = BaseDocument>(
    query: string,
    options?: SearchWithCursorOptions
  ): Promise<{
    items: SearchResultItem<T>[];
    nextKey?: number;
  }> {
    this.ensureInitialized();

    if (!this.searcher) {
      throw new Error('Searcher not initialized');
    }

    return await this.searcher.searchWithCursor<T>(query, options);
  }

  // /**
  //  * 轻量级搜索（返回ID和指定字段）
  //  */
  // async searchIds(query: string, options?: SearchIdsOptions): Promise<SearchIdsResult> {
  //   this.ensureInitialized();

  //   if (!this.searchIdsInstance) {
  //     throw new Error('SearchIds not initialized');
  //   }

  //   return await this.searchIdsInstance.searchIds(query, options);
  // }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.ensureInitialized();
    await this.db.clear();
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<Stats> {
    this.ensureInitialized();
    const stats = await this.db.getStats();
    return {
      documentCount: stats.documentCount,
      termCount: stats.termCount,
    };
  }

  /**
   * 重建索引（使用游标逐个处理，避免内存爆炸）
   * @param onProgress 进度回调函数，用于报告重建索引的进度
   */
  async rebuildIndex(onProgress?: (progress: RebuildIndexProgress) => void): Promise<void> {
    this.ensureInitialized();

    if (!this.documentsStore) {
      throw new Error('DocumentsStore not initialized');
    }

    // 获取文档总数（用于进度计算）
    const total = await this.documentsStore.count();

    // 清空索引
    await this.clearIndexes();

    // 使用游标逐个处理文档，避免一次性加载所有文档到内存
    await this.documentsStore.iterateAll(
      async (doc, docId) => {
        // 提取所有字符串字段作为索引字段
        const indexFields = this.extractIndexableFields(doc);
        await this.indexDocument(docId, doc, indexFields);
      },
      (current, docId) => {
        // 调用进度回调
        if (onProgress) {
          onProgress({
            current,
            total,
            docId,
            percentage: total > 0 ? Math.round((current / total) * 100) : 0,
          });
        }
      }
    );
  }

  /**
   * 保存文档
   */
  private async saveDocument<T extends BaseDocument>(docId: number, doc: T): Promise<void> {
    if (!this.documentsStore) {
      throw new Error('DocumentsStore not initialized');
    }

    await this.documentsStore.put(doc);
  }

  /**
   * 删除文档
   */
  private async deleteDocumentFromStore(docId: number): Promise<void> {
    if (!this.documentsStore) {
      throw new Error('DocumentsStore not initialized');
    }

    await this.documentsStore.delete(docId);
  }

  /**
   * 删除文档字段索引
   */
  private async deleteDocFields(docId: number): Promise<void> {
    if (!this.docFieldsStore) {
      throw new Error('DocFieldsStore not initialized');
    }

    await this.docFieldsStore.delete(docId);
  }

  /**
   * 建立或更新文档索引
   *
   * @param docId 文档ID
   * @param doc 文档对象
   * @param indexFields 需要索引的字段
   */
  private async indexDocument<T extends BaseDocument>(
    docId: number,
    doc: T,
    indexFields?: string[]
  ): Promise<void> {
    if (!this.invertedIndex) {
      return;
    }

    // 提取需要索引的文本
    const texts: string[] = [];

    if (indexFields && indexFields.length > 0) {
      // 使用指定的字段
      for (const fieldName of indexFields) {
        const value = this.getFieldValue(doc, fieldName);
        if (value != null) {
          texts.push(String(value));
        }
      }

      // 保存字段索引
      await this.saveDocFields(docId, doc, indexFields);
    } else {
      // 索引所有字符串字段（排除系统字段）
      const extractedFields = this.extractIndexableFields(doc);
      for (const fieldName of extractedFields) {
        const value = this.getFieldValue(doc, fieldName);
        if (value != null) {
          texts.push(String(value));
        }
      }

      // 保存字段索引
      if (extractedFields.length > 0) {
        await this.saveDocFields(docId, doc, extractedFields);
      }
    }

    // 建立倒排索引并获取 terms
    const combinedText = texts.join(' ');
    if (combinedText) {
      const terms = await this.invertedIndex.indexDocument(docId, combinedText);
      // 将 terms 添加到文档对象
      doc.terms = terms;
      // 重新保存文档（包含 terms 字段）
      await this.saveDocument(docId, doc);
    } else {
      // 即使没有文本，也要设置空数组
      doc.terms = [];
      await this.saveDocument(docId, doc);
    }
  }

  /**
   * 保存文档字段索引
   */
  private async saveDocFields<T extends BaseDocument>(
    docId: number,
    doc: T,
    fields: string[]
  ): Promise<void> {
    if (!this.docFieldsStore) {
      throw new Error('DocFieldsStore not initialized');
    }

    const fieldValues: Record<string, any> = {};

    for (const fieldName of fields) {
      const value = this.getFieldValue(doc, fieldName);
      if (value !== undefined) {
        fieldValues[fieldName] = value;
      }
    }

    await this.docFieldsStore.put(docId, fieldValues);
  }

  /**
   * 获取字段值（支持嵌套字段）
   */
  private getFieldValue(obj: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = obj;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 清空索引
   */
  private async clearIndexes(): Promise<void> {
    if (!this.invertedIndexStore || !this.docTermsStore) {
      throw new Error('Stores not initialized');
    }

    await Promise.all([this.invertedIndexStore.clear(), this.docTermsStore.clear()]);
  }

  /**
   * 提取可索引的字段
   */
  private extractIndexableFields<T extends BaseDocument>(doc: T): string[] {
    const fields: string[] = [];

    for (const [key, value] of Object.entries(doc)) {
      if (key === 'docId' || key === 'createdAt' || key === 'updatedAt') {
        continue;
      }
      if (typeof value === 'string' && value) {
        fields.push(key);
      }
    }

    return fields;
  }

  /**
   * 关闭数据库
   */
  close(): void {
    this.db.close();
    this.initialized = false;
  }
}

// 导出类型和接口
export type {
  BaseDocument,
  ITokenizer,
  Token,
  InitOptions,
  SearchOptions,
  SearchResult,
  SearchIdsOptions,
  SearchIdsResult,
  Stats,
  RebuildIndexProgress,
} from './types';

export { DefaultTokenizer, MixedTokenizer } from './indexer/tokenizer';
export { Highlighter } from './utils/highlight';
