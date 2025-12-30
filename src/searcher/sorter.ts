import { SortField } from '../types';
import { IndexedDBWrapper } from '../database/db';
import { DocumentsStore } from '../database/stores/documents-store';
import { DocFieldsStore } from '../database/stores/doc-fields-store';

/**
 * 排序器
 */
export class Sorter {
  private readonly db: IndexedDBWrapper;
  private readonly documentsStore: DocumentsStore;
  private readonly docFieldsStore: DocFieldsStore;

  constructor(db: IndexedDBWrapper) {
    this.db = db;
    this.documentsStore = new DocumentsStore(db);
    this.docFieldsStore = new DocFieldsStore(db);
  }

  /**
   * 对文档ID数组进行排序
   */
  async sort(docIds: number[], sortBy: SortField | SortField[]): Promise<number[]> {
    if (!sortBy || docIds.length === 0) {
      return docIds;
    }

    const sortFields = Array.isArray(sortBy) ? sortBy : [sortBy];

    // 获取所有文档的字段值
    const docFields = await this.getDocFields(docIds);

    // 排序
    const sorted = [...docIds].sort((a, b) => {
      for (const sortField of sortFields) {
        const aValue = this.getFieldValue(docFields, a, sortField.field);
        const bValue = this.getFieldValue(docFields, b, sortField.field);

        const comparison = this.compareValues(aValue, bValue);
        if (comparison !== 0) {
          return sortField.order === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });

    return sorted;
  }

  /**
   * 获取文档字段值
   */
  private async getDocFields(docIds: number[]): Promise<Map<number, Record<string, any>>> {
    const result = new Map<number, Record<string, any>>();

    // 先从 docFields store 获取
    const docFieldsPromises = docIds.map(async (docId) => {
      const fields = await this.getDocFieldsFromStore(docId);
      if (fields) {
        result.set(docId, fields);
      }
    });

    await Promise.all(docFieldsPromises);

    // 如果 docFields 中没有，从完整文档中提取
    const missingIds = docIds.filter((id) => !result.has(id));
    if (missingIds.length > 0) {
      const fullDocs = await this.getFullDocuments(missingIds);
      for (const [docId, doc] of fullDocs.entries()) {
        result.set(docId, doc);
      }
    }

    return result;
  }

  /**
   * 从 docFields store 获取字段
   */
  private async getDocFieldsFromStore(docId: number): Promise<Record<string, any> | null> {
    return await this.docFieldsStore.get(docId);
  }

  /**
   * 获取完整文档
   */
  private async getFullDocuments(docIds: number[]): Promise<Map<number, Record<string, any>>> {
    const result = new Map<number, Record<string, any>>();

    const promises = docIds.map(async (docId) => {
      const doc = await this.getDocument(docId);
      if (doc) {
        result.set(docId, doc);
      }
    });

    await Promise.all(promises);
    return result;
  }

  /**
   * 获取单个文档
   */
  private async getDocument(docId: number): Promise<any> {
    return await this.documentsStore.get(docId);
  }

  /**
   * 获取字段值
   */
  private getFieldValue(
    docFields: Map<number, Record<string, any>>,
    docId: number,
    fieldPath: string
  ): any {
    const doc = docFields.get(docId);
    if (!doc) {
      return null;
    }

    // 支持嵌套字段（如 'user.name'）
    const parts = fieldPath.split('.');
    let value: any = doc;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * 比较两个值
   */
  private compareValues(a: any, b: any): number {
    // null/undefined 排在最后
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // 数字比较
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // 日期比较
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // 字符串比较
    const aStr = String(a);
    const bStr = String(b);
    return aStr.localeCompare(bStr);
  }
}
