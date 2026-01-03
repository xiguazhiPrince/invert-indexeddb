import { IndexedDBWrapper } from '../db';
import { STORE_NAMES } from '../schema';
import { BaseDocument } from '../../types';

/**
 * Documents Store 操作封装
 */
export class DocumentsStore {
  constructor(private readonly db: IndexedDBWrapper) {}

  /**
   * 获取文档
   */
  async get<T extends BaseDocument = BaseDocument>(docId: number): Promise<T | null> {
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
  async put<T extends BaseDocument>(doc: T): Promise<void> {
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
  async getAll<T extends BaseDocument = BaseDocument>(): Promise<Map<number, T>> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs = new Map<number, T>();
        if (request.result) {
          for (const doc of request.result) {
            const typedDoc = doc as T;
            if (typedDoc.docId) {
              docs.set(typedDoc.docId, typedDoc);
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
   * 使用游标遍历所有文档（逐个处理，避免内存爆炸）
   * @param callback 处理每个文档的回调函数
   * @param onProgress 进度回调函数（可选）
   */
  async iterateAll<T extends BaseDocument = BaseDocument>(
    callback: (doc: T, docId: number) => Promise<void> | void,
    onProgress?: (current: number, docId: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.db.getDB();
      const transaction = db.transaction([STORE_NAMES.DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.DOCUMENTS);
      const request = store.openCursor();

      // 使用队列存储文档数据，在事务内快速读取，在事务外处理
      // 批量大小：每次处理 50 个文档，避免内存占用过大
      const BATCH_SIZE = 50;
      const docQueue: Array<{ doc: T; docId: number }> = [];
      let isReading = true;
      let currentIndex = 0;
      let processingError: Error | null = null;
      let isProcessing = false;

      // 检查是否所有工作都已完成
      const checkComplete = (): void => {
        if (!isReading && docQueue.length === 0 && !isProcessing && !processingError) {
          resolve();
        }
      };

      // 在事务内快速读取文档到队列
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (!cursor) {
          // 读取完成
          isReading = false;
          // 如果队列中还有文档，处理它们
          if (docQueue.length > 0 && !isProcessing) {
            processQueue();
          } else {
            // 检查是否完成
            checkComplete();
          }
          return;
        }

        const doc = cursor.value as T;
        const docId = doc.docId;

        if (docId !== undefined) {
          // 深拷贝文档数据，避免事务结束后数据失效
          const docCopy = JSON.parse(JSON.stringify(doc)) as T;
          docQueue.push({ doc: docCopy, docId });

          // 当队列达到批量大小时，开始处理（如果当前没有在处理）
          if (docQueue.length >= BATCH_SIZE && !isProcessing) {
            processQueue();
          }
        }

        // 继续读取下一个文档
        try {
          cursor.continue();
        } catch (error) {
          // 如果游标已经无效，停止读取
          isReading = false;
          if (docQueue.length > 0 && !isProcessing) {
            processQueue();
          } else {
            checkComplete();
          }
        }
      };

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to iterate documents: ${error.message}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction error: ${transaction.error?.message || 'Unknown error'}`));
      };

      // 在事务外处理文档队列
      const processQueue = async (): Promise<void> => {
        if (isProcessing) {
          return; // 已经在处理中，避免重复处理
        }

        isProcessing = true;

        while (docQueue.length > 0) {
          // 处理队列中的文档（批量处理）
          const item = docQueue.shift();
          if (!item) {
            continue;
          }

          try {
            await Promise.resolve(callback(item.doc, item.docId));
            currentIndex++;

            // 调用进度回调
            if (onProgress) {
              onProgress(currentIndex, item.docId);
            }
          } catch (error) {
            processingError = error instanceof Error ? error : new Error(String(error));
            isProcessing = false;
            reject(processingError);
            return;
          }
        }

        isProcessing = false;

        // 检查是否所有工作都已完成
        checkComplete();
      };
    });
  }

  /**
   * 获取文档总数
   */
  async count(): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to count documents: ${error.message}`));
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
