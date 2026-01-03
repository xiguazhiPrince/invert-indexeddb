/**
 * 文档基础接口，包含所有文档的通用字段
 */
export interface BaseDocument {
  /** 文档ID */
  docId: number;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 更新时间戳（毫秒） */
  updatedAt: number;
  /** 索引词数组 */
  terms?: string[];
}

/**
 * 分词器接口
 */
export interface ITokenizer {
  /**
   * 将文本分词为词数组
   * @param text 待分词的文本
   * @returns 词数组，每个词包含词本身和位置信息
   */
  tokenize(text: string): Token[];
}

/**
 * 词元信息
 */
export interface Token {
  /** 词本身 */
  term: string;
  /** 在原文中的起始位置 */
  position: number;
  /** 词的长度 */
  length: number;
}

/**
 * 自定义索引配置
 */
export interface CustomIndexConfig {
  /** 索引字段名（支持嵌套字段，如 'user.name'） */
  field: string;
  /** 索引名称（如果不指定，默认使用字段名） */
  name?: string;
  /** 是否唯一索引 */
  unique?: boolean;
}

/**
 * 初始化选项
 */
export interface InitOptions {
  /** 自定义分词器 */
  tokenizer?: ITokenizer;
  /** 数据库版本 */
  version?: number;
  /** 自定义索引配置（在 documents store 上创建额外索引） */
  customIndexes?: CustomIndexConfig[];
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 模糊匹配 */
  fuzzy?: boolean;
  /** 精确匹配（短语搜索） */
  exact?: boolean;
  /** 逻辑运算符：AND 或 OR */
  operator?: 'AND' | 'OR';
  /** 限制返回数量 */
  limit?: number;
  /** 分页偏移量 */
  offset?: number;
  /** 是否高亮关键词 */
  highlight?: boolean;
  /** 排序配置 */
  sortBy?: SortField | SortField[];
}

/**
 * 轻量级搜索选项
 */
export interface SearchIdsOptions extends SearchOptions {
  /** 指定需要返回的字段（用于排序和减少内存占用） */
  fields?: string[];
  /** 排序配置 */
  sortBy?: SortField | SortField[];
}

/**
 * 基于游标的搜索选项
 * 用于 searchWithCursor 方法，使用 IndexedDB 游标进行排序和分页
 */
export interface SearchWithCursorOptions {
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'docId';
  /** 排序方向 */
  order?: 'asc' | 'desc';
  /** 逻辑运算符：AND 或 OR */
  operator?: 'AND' | 'OR';
  /** 限制返回数量 */
  limit?: number;
  /** 游标分页的最后一个键值（用于获取下一页） */
  lastKey?: number;
  /** 是否高亮关键词 */
  highlight?: boolean;
  /** 模糊匹配 */
  fuzzy?: boolean;
  /** 精确匹配（短语搜索） */
  exact?: boolean;
}

/**
 * 排序字段配置
 */
export interface SortField {
  /** 排序字段名 */
  field: string;
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/**
 * 搜索结果项
 */
export interface SearchResultItem<T extends BaseDocument = BaseDocument> {
  /** 文档ID */
  docId: number;
  /** 完整文档 */
  doc: T;
  /** 匹配位置信息（用于高亮） */
  matches?: MatchInfo[];
  /** 相关性分数 */
  score?: number;
}

/**
 * 匹配信息
 */
export interface MatchInfo {
  /** 匹配的词 */
  term: string;
  /** 匹配位置 */
  position: number;
  /** 匹配长度 */
  length: number;
  /** 匹配的字段 */
  field?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult<T extends BaseDocument = BaseDocument> {
  /** 匹配的文档ID列表 */
  docIds: number[];
  /** 搜索结果项 */
  items: SearchResultItem<T>[];
  /** 总匹配数 */
  total: number;
}

/**
 * 轻量级搜索结果
 */
export interface SearchIdsResult {
  /** 匹配的文档ID列表 */
  docIds: number[];
  /** 轻量级结果项 */
  items: Array<{
    /** 文档ID */
    docId: number;
    /** 指定字段的值 */
    fields: Record<string, any>;
  }>;
  /** 总匹配数 */
  total: number;
}

/**
 * 统计信息
 */
export interface Stats {
  /** 文档总数 */
  documentCount: number;
  /** 索引词总数 */
  termCount: number;
  /** 数据库大小（字节） */
  size?: number;
}

/**
 * 倒排索引项
 */
export interface InvertedIndexItem {
  /** 词 */
  term: string;
  /** 包含该词的文档ID集合 */
  docIds: Set<number>;
  /** 文档数量 */
  count: number;
}

/**
 * 文档-词关系
 */
export interface DocTerm {
  /** 文档ID */
  docId: number;
  /** 词 */
  term: string;
}

/**
 * 重建索引进度回调
 */
export interface RebuildIndexProgress {
  /** 当前已处理的文档数 */
  current: number;
  /** 总文档数 */
  total: number;
  /** 当前处理的文档ID */
  docId?: number;
  /** 进度百分比 (0-100) */
  percentage: number;
}
