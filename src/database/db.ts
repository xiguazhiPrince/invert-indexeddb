import { STORE_NAMES, INDEX_NAMES, DB_NAME_PREFIX, DB_VERSION } from './schema';

/**
 * IndexedDB 数据库封装类
 */
export class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly version: number;

  constructor(dbName: string, version: number = DB_VERSION) {
    this.dbName = `${DB_NAME_PREFIX}${dbName}`;
    this.version = version;
  }

  /**
   * 打开数据库
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to open database: ${error.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建 documents store
        if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
          const docStore = db.createObjectStore(STORE_NAMES.DOCUMENTS, {
            keyPath: 'docId',
            autoIncrement: false,
          });
          docStore.createIndex(INDEX_NAMES.CREATED_AT, 'createdAt', { unique: false });
          docStore.createIndex(INDEX_NAMES.UPDATED_AT, 'updatedAt', { unique: false });
        }

        // 创建 invertedIndex store
        if (!db.objectStoreNames.contains(STORE_NAMES.INVERTED_INDEX)) {
          const indexStore = db.createObjectStore(STORE_NAMES.INVERTED_INDEX, {
            keyPath: 'term',
          });
          indexStore.createIndex(INDEX_NAMES.TERM, 'term', { unique: true });
        }

        // 创建 docTerms store
        if (!db.objectStoreNames.contains(STORE_NAMES.DOC_TERMS)) {
          const docTermsStore = db.createObjectStore(STORE_NAMES.DOC_TERMS, {
            keyPath: ['docId', 'term'],
          });
          docTermsStore.createIndex(INDEX_NAMES.DOC_ID, 'docId', { unique: false });
        }
      };
    });
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 获取数据库实例
   */
  getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database is not open. Call open() first.');
    }
    return this.db;
  }

  /**
   * 创建事务
   */
  transaction(storeNames: string[], mode: IDBTransactionMode = 'readonly'): IDBTransaction {
    const db = this.getDB();
    return db.transaction(storeNames, mode);
  }

  /**
   * 获取 ObjectStore
   */
  getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    const database = this.getDB();
    const transaction = database.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  /**
   * 删除数据库
   */
  static async deleteDatabase(dbName: string): Promise<void> {
    const fullName = `${DB_NAME_PREFIX}${dbName}`;
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(fullName);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to delete database: ${String(error)}`));
      };
    });
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    const db = this.getDB();
    const storeNames = Array.from(db.objectStoreNames);

    const promises = storeNames.map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = request.error || new Error('Unknown error');
          reject(new Error(`Failed to clear store: ${String(error)}`));
        };
      });
    });

    await Promise.all(promises);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{ documentCount: number; termCount: number }> {
    const [documentCount, termCount] = await Promise.all([
      this.count(STORE_NAMES.DOCUMENTS),
      this.count(STORE_NAMES.INVERTED_INDEX),
    ]);

    return { documentCount, termCount };
  }

  /**
   * 计算 ObjectStore 中的记录数
   */
  private async count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        const error = request.error || new Error('Unknown error');
        reject(new Error(`Failed to count records: ${String(error)}`));
      };
    });
  }
}
