import { IndexedDBWrapper } from '../db';
import { STORE_NAMES } from '../schema';
import { InvertedIndexItem } from '../../types';

/**
 * InvertedIndex Store 操作封装
 */
export class InvertedIndexStore {
  constructor(private readonly db: IndexedDBWrapper) {}

  /**
   * 获取索引项
   */
  async get(term: string): Promise<InvertedIndexItem | null> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX);
      const request = store.get(term);

      request.onsuccess = () => {
        if (request.result) {
          const item = request.result;
          // 从数组恢复 Set
          const docIds = Array.isArray(item.docIds)
            ? new Set<number>(item.docIds as number[])
            : new Set<number>();
          resolve({
            term: item.term,
            docIds,
            count: item.count || docIds.size,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get term from index: ${error.message}`));
      };
    });
  }

  /**
   * 保存索引项（更新）
   */
  async put(item: InvertedIndexItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.put({
        term: item.term,
        docIds: Array.from(item.docIds), // 转换为数组存储
        count: item.count,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to update term in index: ${error.message}`));
      };
    });
  }

  /**
   * 添加索引项（新增）
   */
  async add(item: InvertedIndexItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.add({
        term: item.term,
        docIds: Array.from(item.docIds), // 转换为数组存储
        count: item.count,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to add term to index: ${error.message}`));
      };
    });
  }

  /**
   * 删除索引项
   */
  async delete(term: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.delete(term);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to delete term from index: ${error.message}`));
      };
    });
  }

  /**
   * 获取所有词
   */
  async getAllKeys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to get all terms: ${error.message}`));
      };
    });
  }

  /**
   * 清空 store
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.INVERTED_INDEX, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to clear inverted index: ${error.message}`));
      };
    });
  }
}
