import { IndexedDBWrapper } from '../db';
import { STORE_NAMES } from '../schema';

/**
 * Documents Store 操作封装
 */
export class DocumentsStore {
  constructor(private readonly db: IndexedDBWrapper) {}

  /**
   * 获取文档
   */
  async get<T = any>(docId: number): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.get(docId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get document: ${error.message}`));
      };
    });
  }

  /**
   * 保存文档（新增或更新）
   */
  async put<T = any>(doc: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS, 'readwrite');
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to save document: ${error.message}`));
      };
    });
  }

  /**
   * 删除文档
   */
  async delete(docId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS, 'readwrite');
      const request = store.delete(docId);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to delete document: ${error.message}`));
      };
    });
  }

  /**
   * 获取所有文档
   */
  async getAll<T = any>(): Promise<Map<number, T>> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs = new Map<number, T>();
        if (request.result) {
          for (const doc of request.result) {
            if ((doc as any).docId) {
              docs.set((doc as any).docId, doc);
            }
          }
        }
        resolve(docs);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get all documents: ${error.message}`));
      };
    });
  }

  /**
   * 清空 store
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to clear documents: ${error.message}`));
      };
    });
  }
}
