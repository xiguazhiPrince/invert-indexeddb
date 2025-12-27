import { IndexedDBWrapper } from '../db';
import { STORE_NAMES, INDEX_NAMES } from '../schema';
import { DocTerm } from '../../types';

/**
 * DocTerms Store 操作封装
 */
export class DocTermsStore {
  constructor(private readonly db: IndexedDBWrapper) {}

  /**
   * 保存文档-词关系
   */
  async put(docTerm: DocTerm): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS, 'readwrite');
      const request = store.put(docTerm);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to save doc term: ${error.message}`));
      };
    });
  }

  /**
   * 根据文档ID获取所有词
   */
  async getByDocId(docId: string): Promise<DocTerm[]> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS);
      const index = store.index(INDEX_NAMES.DOC_ID);
      const request = index.getAll(docId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get doc terms: ${error.message}`));
      };
    });
  }

  /**
   * 删除文档的所有词关系
   */
  async deleteByDocId(docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS, 'readwrite');
      const index = store.index(INDEX_NAMES.DOC_ID);
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
   * 清空 store
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_TERMS, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to clear doc terms: ${error.message}`));
      };
    });
  }
}
