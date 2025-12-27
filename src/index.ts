import { IndexedDBWrapper } from './database/db';
import { InvertedIndex } from './indexer/inverted-index';
import { DefaultTokenizer } from './indexer/tokenizer';
import { Searcher } from './searcher/search';
import { Sorter } from './searcher/sorter';
import { SearchIds } from './searcher/search-ids';
import { Highlighter } from './utils/highlight';
import { generateId } from './utils/helpers';
import {
  ITokenizer,
  InitOptions,
  SearchOptions,
  SearchResult,
  SearchIdsOptions,
  SearchIdsResult,
  Stats,
} from './types';
import { STORE_NAMES } from './database/schema';

/**
 * 倒排索引 IndexedDB SDK 主类
 */
export class InvertedIndexDB {
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;
  private invertedIndex: InvertedIndex | null = null;
  private searcher: Searcher | null = null;
  private sorter: Sorter | null = null;
  private searchIdsInstance: SearchIds | null = null;
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
    this.invertedIndex = new InvertedIndex(this.db, this.tokenizer);
    this.searcher = new Searcher(this.db, this.invertedIndex, this.tokenizer);
    this.sorter = new Sorter(this.db);
    this.searchIdsInstance = new SearchIds(this.searcher, this.sorter, this.db);
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
  async addDocument<T = any>(
    doc: T,
    indexFields?: string[]
  ): Promise<string> {
    this.ensureInitialized();

    const docId = generateId();
    const docWithId = {
      ...doc,
      docId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 保存文档
    await this.saveDocument(docId, docWithId);

    // 建立索引
    await this.indexDocument(docId, docWithId, indexFields);

    return docId;
  }

  /**
   * 更新文档
   */
  async updateDocument<T = any>(
    docId: string,
    doc: T,
    indexFields?: string[]
  ): Promise<void> {
    this.ensureInitialized();

    // 删除旧索引
    if (this.invertedIndex) {
      await this.invertedIndex.removeDocumentIndex(docId);
    }

    // 更新文档
    const updatedDoc = {
      ...doc,
      docId,
      updatedAt: Date.now(),
    };

    await this.saveDocument(docId, updatedDoc);

    // 建立新索引
    await this.indexDocument(docId, updatedDoc, indexFields);
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
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
  async getDocument<T = any>(docId: string): Promise<T | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.get(docId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 批量添加文档
   */
  async batchAddDocuments<T = any>(
    docs: T[],
    indexFields?: string[]
  ): Promise<string[]> {
    this.ensureInitialized();

    const docIds: string[] = [];

    for (const doc of docs) {
      const docId = await this.addDocument(doc, indexFields);
      docIds.push(docId);
    }

    return docIds;
  }

  /**
   * 搜索
   */
  async search<T = any>(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult<T>> {
    this.ensureInitialized();

    if (!this.searcher) {
      throw new Error('Searcher not initialized');
    }

    return await this.searcher.search<T>(query, options);
  }

  /**
   * 轻量级搜索（返回ID和指定字段）
   */
  async searchIds(
    query: string,
    options?: SearchIdsOptions
  ): Promise<SearchIdsResult> {
    this.ensureInitialized();

    if (!this.searchIdsInstance) {
      throw new Error('SearchIds not initialized');
    }

    return await this.searchIdsInstance.searchIds(query, options);
  }

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
   * 重建索引
   */
  async rebuildIndex(): Promise<void> {
    this.ensureInitialized();

    // 获取所有文档
    const allDocs = await this.getAllDocuments();

    // 清空索引
    await this.clearIndexes();

    // 重新建立索引
    for (const [docId, doc] of allDocs.entries()) {
      // 提取所有字符串字段作为索引字段
      const indexFields = this.extractIndexableFields(doc);
      await this.indexDocument(docId, doc, indexFields);
    }
  }

  /**
   * 保存文档
   */
  private async saveDocument(docId: string, doc: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS, 'readwrite');
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文档
   */
  private async deleteDocumentFromStore(docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS, 'readwrite');
      const request = store.delete(docId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文档字段索引
   */
  private async deleteDocFields(docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS, 'readwrite');
      const request = store.delete(docId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 建立文档索引
   */
  private async indexDocument(
    docId: string,
    doc: any,
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
      // 索引所有字符串字段
      for (const value of Object.values(doc)) {
        if (typeof value === 'string' && value) {
          texts.push(value);
        }
      }
    }

    // 建立倒排索引
    const combinedText = texts.join(' ');
    if (combinedText) {
      await this.invertedIndex.indexDocument(docId, combinedText);
    }
  }

  /**
   * 保存文档字段索引
   */
  private async saveDocFields(
    docId: string,
    doc: any,
    fields: string[]
  ): Promise<void> {
    const fieldValues: Record<string, any> = {};

    for (const fieldName of fields) {
      const value = this.getFieldValue(doc, fieldName);
      if (value !== undefined) {
        fieldValues[fieldName] = value;
      }
    }

    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS, 'readwrite');
      const request = store.put({
        docId,
        fields: fieldValues,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
   * 获取所有文档
   */
  private async getAllDocuments(): Promise<Map<string, any>> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs = new Map<string, any>();
        if (request.result) {
          for (const doc of request.result) {
            if (doc.docId) {
              docs.set(doc.docId, doc);
            }
          }
        }
        resolve(docs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空索引
   */
  private async clearIndexes(): Promise<void> {
    const promises = [
      this.clearStore(STORE_NAMES.INVERTED_INDEX),
      this.clearStore(STORE_NAMES.DOC_TERMS),
    ];

    await Promise.all(promises);
  }

  /**
   * 清空 Store
   */
  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(storeName, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 提取可索引的字段
   */
  private extractIndexableFields(doc: any): string[] {
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
  ITokenizer,
  Token,
  InitOptions,
  SearchOptions,
  SearchResult,
  SearchIdsOptions,
  SearchIdsResult,
  Stats,
} from './types';

export { DefaultTokenizer } from './indexer/tokenizer';
export { Highlighter } from './utils/highlight';

