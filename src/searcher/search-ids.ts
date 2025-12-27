import { Searcher } from "./search";
import { Sorter } from "./sorter";
import { IndexedDBWrapper } from "../database/db";
import { STORE_NAMES } from "../database/schema";
import { SearchIdsOptions, SearchIdsResult } from "../types";

/**
 * 轻量级搜索器（返回ID和指定字段）
 */
export class SearchIds {
  private readonly searcher: Searcher;
  private readonly sorter: Sorter;
  private readonly db: IndexedDBWrapper;

  constructor(searcher: Searcher, sorter: Sorter, db: IndexedDBWrapper) {
    this.searcher = searcher;
    this.sorter = sorter;
    this.db = db;
  }

  /**
   * 执行轻量级搜索
   */
  async searchIds(
    query: string,
    options: SearchIdsOptions = {}
  ): Promise<SearchIdsResult> {
    const { fields = [], sortBy, limit, offset = 0 } = options;

    // 先执行普通搜索获取匹配的文档ID
    const searchResult = await this.searcher.search(query, {
      fuzzy: options.fuzzy,
      exact: options.exact,
      operator: options.operator,
      limit: undefined, // 先不限制，等排序后再限制
      offset: 0,
      highlight: false,
    });

    let docIds = searchResult.docIds;

    // 如果有排序要求，进行排序
    if (sortBy && docIds.length > 0) {
      docIds = await this.sorter.sort(docIds, sortBy);
    }

    // 应用分页
    const total = docIds.length;
    if (offset > 0) {
      docIds = docIds.slice(offset);
    }
    if (limit && limit > 0) {
      docIds = docIds.slice(0, limit);
    }

    // 获取指定字段
    const items = await this.getFieldsForDocs(docIds, fields);

    return {
      docIds,
      items,
      total,
    };
  }

  /**
   * 获取文档的指定字段
   */
  private async getFieldsForDocs(
    docIds: string[],
    fields: string[]
  ): Promise<Array<{ docId: string; fields: Record<string, any> }>> {
    if (fields.length === 0) {
      // 如果没有指定字段，只返回ID
      return docIds.map((docId) => ({ docId, fields: {} }));
    }

    const items: Array<{ docId: string; fields: Record<string, any> }> = [];

    for (const docId of docIds) {
      const docFields = await this.getDocFields(docId, fields);
      items.push({
        docId,
        fields: docFields,
      });
    }

    return items;
  }

  /**
   * 获取文档的指定字段值
   */
  private async getDocFields(
    docId: string,
    fieldNames: string[]
  ): Promise<Record<string, any>> {
    // 先从 docFields store 获取
    const docFields = await this.getDocFieldsFromStore(docId);
    if (docFields) {
      return this.extractFields(docFields, fieldNames);
    }

    // 如果 docFields 中没有，从完整文档中提取
    const fullDoc = await this.getFullDocument(docId);
    if (fullDoc) {
      return this.extractFields(fullDoc, fieldNames);
    }

    return {};
  }

  /**
   * 从 docFields store 获取
   */
  private async getDocFieldsFromStore(
    docId: string
  ): Promise<Record<string, any> | null> {
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
        const error = request.error || new Error("Unknown error");
        reject(new Error(`Failed to get doc fields: ${String(error)}`));
      };
    });
  }

  /**
   * 获取完整文档
   */
  private async getFullDocument(docId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const store = this.db.getStore(STORE_NAMES.DOCUMENTS);
      const request = store.get(docId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        const error = request.error || new Error("Unknown error");
        reject(new Error(`Failed to get document: ${String(error)}`));
      };
    });
  }

  /**
   * 提取指定字段
   */
  private extractFields(
    doc: Record<string, any>,
    fieldNames: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const fieldName of fieldNames) {
      // 支持嵌套字段（如 'user.name'）
      const parts = fieldName.split(".");
      let value: any = doc;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }

      if (value !== undefined) {
        result[fieldName] = value;
      }
    }

    return result;
  }
}
