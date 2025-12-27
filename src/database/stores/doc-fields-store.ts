import { IndexedDBWrapper } from '../db';
import { STORE_NAMES } from '../schema';

/**
 * DocFields Store 操作封装
 */
export class DocFieldsStore {
  constructor(private readonly db: IndexedDBWrapper) {}

  /**
   * 获取文档字段
   */
  async get(docId: string): Promise<Record<string, any> | null> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS);
      const request = store.get(docId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.fields || null);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get doc fields: ${error.message}`));
      };
    });
  }

  /**
   * 保存文档字段
   */
  async put(docId: string, fields: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS, 'readwrite');
      const request = store.put({
        docId,
        fields,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to save doc fields: ${error.message}`));
      };
    });
  }

  /**
   * 删除文档字段
   */
  async delete(docId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS, 'readwrite');
      const request = store.delete(docId);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to delete doc fields: ${error.message}`));
      };
    });
  }

  /**
   * 清空 store
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOC_FIELDS, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to clear doc fields: ${error.message}`));
      };
    });
  }
}
