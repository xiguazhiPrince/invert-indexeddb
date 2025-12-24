import { IndexedDBWrapper } from '../database/db';
import { STORE_NAMES } from '../database/schema';
import { ITokenizer, InvertedIndexItem, DocTerm } from '../types';

/**
 * 倒排索引管理器
 */
export class InvertedIndex {
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;

  constructor(db: IndexedDBWrapper, tokenizer: ITokenizer) {
    this.db = db;
    this.tokenizer = tokenizer;
  }

  /**
   * 为文档建立索引
   */
  async indexDocument(docId: string, text: string): Promise<void> {
    const tokens = this.tokenizer.tokenize(text);
    const terms = new Set(tokens.map((t) => t.term));

    // 更新倒排索引
    for (const term of terms) {
      await this.addTermToIndex(term, docId);
    }

    // 保存文档-词关系
    for (const term of terms) {
      await this.saveDocTerm(docId, term);
    }
  }

  /**
   * 为多个字段建立索引
   */
  async indexDocumentFields(
    docId: string,
    fields: Record<string, any>,
    indexFields?: string[]
  ): Promise<void> {
    if (!indexFields || indexFields.length === 0) {
      return;
    }

    // 提取需要索引的字段文本
    const texts: string[] = [];
    for (const fieldName of indexFields) {
      const value = fields[fieldName];
      if (value != null) {
        texts.push(String(value));
      }
    }

    // 合并所有文本并建立索引
    const combinedText = texts.join(' ');
    await this.indexDocument(docId, combinedText);
  }

  /**
   * 添加词到倒排索引
   */
  private async addTermToIndex(term: string, docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.get(term);

      request.onsuccess = () => {
        const transaction = request.transaction!;
        const store = transaction.objectStore(STORE_NAMES.INVERTED_INDEX);

        if (request.result) {
          // 更新现有索引项
          const item: InvertedIndexItem = request.result;
          if (!item.docIds) {
            item.docIds = new Set();
          }
          // IndexedDB 不支持 Set，需要转换为数组存储
          const docIdsArray = Array.from(item.docIds);
          if (!docIdsArray.includes(docId)) {
            docIdsArray.push(docId);
            item.docIds = new Set(docIdsArray);
            item.count = docIdsArray.length;
          }

          const updateRequest = store.put({
            term: item.term,
            docIds: Array.from(item.docIds), // 转换为数组存储
            count: item.count,
          });

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => {
            const error = updateRequest.error || new Error('Unknown error');
            reject(error);
          };
        } else {
          // 创建新索引项
          const newItem = {
            term,
            docIds: [docId],
            count: 1,
          };

          const addRequest = store.add(newItem);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => {
            const error = addRequest.error || new Error('Unknown error');
            reject(new Error(`Failed to add term to index: ${error.message}`));
          };
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get term from index: ${error.message}`));
      };
    });
  }

  /**
   * 保存文档-词关系
   */
  private async saveDocTerm(docId: string, term: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS, 'readwrite');
      const docTerm: DocTerm = { docId, term };

      const request = store.put(docTerm);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to save doc term: ${error.message}`));
      };
    });
  }

  /**
   * 从倒排索引中查找文档ID
   */
  async findDocumentsByTerm(term: string): Promise<Set<string>> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX);
      const request = store.get(term);

      request.onsuccess = () => {
        if (request.result) {
          const item = request.result;
          // 从数组恢复 Set
          const docIds = Array.isArray(item.docIds)
            ? new Set<string>(item.docIds as string[])
            : new Set<string>();
          resolve(docIds);
        } else {
          resolve(new Set<string>());
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(error);
      };
    });
  }

  /**
   * 从多个词查找文档ID（AND 操作）
   */
  async findDocumentsByTermsAnd(terms: string[]): Promise<Set<string>> {
    if (terms.length === 0) {
      return new Set();
    }

    const docIdSets = await Promise.all(
      terms.map((term) => this.findDocumentsByTerm(term))
    );

    // 求交集
    if (docIdSets.length === 0) {
      return new Set<string>();
    }

    let result = docIdSets[0];
    for (let i = 1; i < docIdSets.length; i++) {
      result = new Set([...result].filter((id) => docIdSets[i].has(id)));
    }

    return result;
  }

  /**
   * 从多个词查找文档ID（OR 操作）
   */
  async findDocumentsByTermsOr(terms: string[]): Promise<Set<string>> {
    if (terms.length === 0) {
      return new Set();
    }

    const docIdSets = await Promise.all(
      terms.map((term) => this.findDocumentsByTerm(term))
    );

    // 求并集
    const result = new Set<string>();
    for (const docIdSet of docIdSets) {
      for (const docId of docIdSet) {
        result.add(docId);
      }
    }

    return result;
  }

  /**
   * 删除文档的所有索引
   */
  async removeDocumentIndex(docId: string): Promise<void> {
    // 获取文档的所有词
    const terms = await this.getDocumentTerms(docId);

    // 从倒排索引中移除
    for (const term of terms) {
      await this.removeTermFromIndex(term, docId);
    }

    // 删除文档-词关系
    await this.removeDocTerms(docId);
  }

  /**
   * 获取文档的所有词
   */
  private async getDocumentTerms(docId: string): Promise<Set<string>> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS);
      const index = store.index('docId');
      const request = index.getAll(docId);

      request.onsuccess = () => {
        const terms = new Set<string>();
        if (request.result) {
          for (const docTerm of request.result) {
            terms.add(docTerm.term);
          }
        }
        resolve(terms);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get term from index: ${error.message}`));
      };
    });
  }

  /**
   * 从倒排索引中移除词
   */
  private async removeTermFromIndex(term: string, docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.get(term);

      request.onsuccess = () => {
        const transaction = request.transaction!;
        const store = transaction.objectStore(STORE_NAMES.INVERTED_INDEX);

        if (request.result) {
          const item = request.result;
          const docIdsArray = Array.isArray(item.docIds)
            ? [...item.docIds]
            : Array.from(item.docIds || []);

          const index = docIdsArray.indexOf(docId);
          if (index > -1) {
            docIdsArray.splice(index, 1);
            item.count = docIdsArray.length;

            if (docIdsArray.length === 0) {
              // 如果没有文档了，删除整个索引项
              const deleteRequest = store.delete(term);
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => {
                const error = deleteRequest.error || new Error('Unknown error');
                reject(new Error(`Failed to delete term from index: ${error.message}`));
              };
            } else {
              // 更新索引项
              item.docIds = docIdsArray;
              const updateRequest = store.put(item);
              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = () => {
                const error = updateRequest.error || new Error('Unknown error');
                reject(new Error(`Failed to update term in index: ${error.message}`));
              };
            }
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get term from index: ${error.message}`));
      };
    });
  }

  /**
   * 删除文档的所有词关系
   */
  private async removeDocTerms(docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS, 'readwrite');
      const index = store.index('docId');
      const request = index.openCursor(IDBKeyRange.only(docId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to remove doc terms: ${error.message}`));
      };
    });
  }

  /**
   * 获取所有索引词
   */
  async getAllTerms(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get term from index: ${error.message}`));
      };
    });
  }
}

