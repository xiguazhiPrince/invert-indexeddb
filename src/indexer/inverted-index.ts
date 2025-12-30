import { IndexedDBWrapper } from '../database/db';
import { InvertedIndexStore } from '../database/stores/inverted-index-store';
import { DocTermsStore } from '../database/stores/doc-terms-store';
import { ITokenizer, InvertedIndexItem, DocTerm } from '../types';

/**
 * 倒排索引管理器
 */
export class InvertedIndex {
  private readonly db: IndexedDBWrapper;
  private readonly tokenizer: ITokenizer;
  private readonly invertedIndexStore: InvertedIndexStore;
  private readonly docTermsStore: DocTermsStore;

  constructor(db: IndexedDBWrapper, tokenizer: ITokenizer) {
    this.db = db;
    this.tokenizer = tokenizer;
    this.invertedIndexStore = new InvertedIndexStore(db);
    this.docTermsStore = new DocTermsStore(db);
  }

  /**
   * 为文档建立索引
   */
  async indexDocument(docId: number, text: string): Promise<void> {
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
    docId: number,
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
  private async addTermToIndex(term: string, docId: number): Promise<void> {
    const existingItem = await this.invertedIndexStore.get(term);

    if (existingItem) {
      // 更新现有索引项
      if (!existingItem.docIds.has(docId)) {
        existingItem.docIds.add(docId);
        existingItem.count = existingItem.docIds.size;
        await this.invertedIndexStore.put(existingItem);
      }
    } else {
      // 创建新索引项
      const newItem: InvertedIndexItem = {
        term,
        docIds: new Set([docId]),
        count: 1,
      };
      await this.invertedIndexStore.add(newItem);
    }
  }

  /**
   * 保存文档-词关系
   */
  private async saveDocTerm(docId: number, term: string): Promise<void> {
    const docTerm: DocTerm = { docId, term };
    await this.docTermsStore.put(docTerm);
  }

  /**
   * 从倒排索引中查找文档ID
   */
  async findDocumentsByTerm(term: string): Promise<Set<number>> {
    const item = await this.invertedIndexStore.get(term);
    if (item) {
      return item.docIds;
    }
    return new Set<number>();
  }

  /**
   * 从多个词查找文档ID（AND 操作）
   */
  async findDocumentsByTermsAnd(terms: string[]): Promise<Set<number>> {
    if (terms.length === 0) {
      return new Set();
    }

    const docIdSets = await Promise.all(terms.map((term) => this.findDocumentsByTerm(term)));

    // 求交集
    if (docIdSets.length === 0) {
      return new Set<number>();
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
  async findDocumentsByTermsOr(terms: string[]): Promise<Set<number>> {
    if (terms.length === 0) {
      return new Set();
    }

    const docIdSets = await Promise.all(terms.map((term) => this.findDocumentsByTerm(term)));

    // 求并集
    const result = new Set<number>();
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
  async removeDocumentIndex(docId: number): Promise<void> {
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
  private async getDocumentTerms(docId: number): Promise<Set<string>> {
    const docTerms = await this.docTermsStore.getByDocId(docId);
    const terms = new Set<string>();
    for (const docTerm of docTerms) {
      terms.add(docTerm.term);
    }
    return terms;
  }

  /**
   * 从倒排索引中移除词
   */
  private async removeTermFromIndex(term: string, docId: number): Promise<void> {
    const item = await this.invertedIndexStore.get(term);

    if (item && item.docIds.has(docId)) {
      item.docIds.delete(docId);
      item.count = item.docIds.size;

      if (item.docIds.size === 0) {
        // 如果没有文档了，删除整个索引项
        await this.invertedIndexStore.delete(term);
      } else {
        // 更新索引项
        await this.invertedIndexStore.put(item);
      }
    }
  }

  /**
   * 删除文档的所有词关系
   */
  private async removeDocTerms(docId: number): Promise<void> {
    await this.docTermsStore.deleteByDocId(docId);
  }

  /**
   * 获取所有索引词
   */
  async getAllTerms(): Promise<string[]> {
    return await this.invertedIndexStore.getAllKeys();
  }
}
