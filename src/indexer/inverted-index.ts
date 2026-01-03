import { IndexedDBWrapper } from '../database/db';
import { InvertedIndexStore } from '../database/stores/inverted-index-store';
import { DocumentsStore } from '../database/stores/documents-store';
import { ITokenizer, InvertedIndexItem } from '../types';

/**
 * 倒排索引管理器
 */
export class InvertedIndex {
  private readonly tokenizer: ITokenizer;
  private readonly invertedIndexStore: InvertedIndexStore;
  private readonly documentsStore: DocumentsStore;

  constructor(db: IndexedDBWrapper, tokenizer: ITokenizer) {
    this.tokenizer = tokenizer;
    this.invertedIndexStore = new InvertedIndexStore(db);
    this.documentsStore = new DocumentsStore(db);
  }

  /**
   * 为文档建立索引数据
   *
   * @param docId 文档ID
   * @param text 文档文本
   * @returns 返回文档的所有分词结果（去重后的字符串数组）
   */
  async indexDocument(docId: number, text: string): Promise<string[]> {
    const tokens = this.tokenizer.tokenize(text);
    const terms = new Set(tokens.map((t) => t.term));

    // 更新倒排索引
    for (const term of terms) {
      await this.addTermToIndex(term, docId);
    }

    // 返回去重后的 terms 数组
    return Array.from(terms);
  }

  /**
   * 添加词到倒排索引
   * 如果词不存在，则创建新倒排索引项
   * 如果词存在，则更新现有倒排索引项：
   *   如果文档ID不存在，则添加文档ID
   *   如果文档ID存在，则更新文档ID的计数
   *
   * @param term 词
   * @param docId 文档ID
   * @returns 返回添加的词
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
   * 删除文档的所有索引
   */
  async removeDocumentIndex(docId: number): Promise<void> {
    // 获取文档对象
    const doc = await this.documentsStore.get(docId);
    if (!doc) {
      return;
    }

    // 从文档的 terms 字段获取所有词
    const terms = doc.terms || [];

    // 从倒排索引中移除
    for (const term of terms) {
      await this.removeTermFromIndex(term, docId);
    }
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
   * 获取所有索引词
   */
  async getAllTerms(): Promise<string[]> {
    return await this.invertedIndexStore.getAllKeys();
  }
}
