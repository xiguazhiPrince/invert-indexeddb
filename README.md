# invert-indexeddb

[English](README_EN.md) | 中文

一个基于倒排索引算法的 IndexedDB 全文搜索 SDK，支持快速关键词检索、模糊匹配、排序等功能。

## 特性

- 🔍 **全文搜索**：基于倒排索引算法，O(1) 时间复杂度查找关键词
- 🔤 **可插拔分词器**：支持自定义分词算法，方便扩展
- 🎯 **模糊匹配**：支持 N-gram 和编辑距离算法进行模糊搜索
- 📊 **排序支持**：按字段排序，支持多字段排序
- 💾 **轻量级查询**：只返回指定字段，减少内存占用
- ⚡ **高性能**：利用 IndexedDB 索引加速查询
- 🌐 **多语言支持**：支持中英文混合分词

## 安装

```bash
npm install invert-indexeddb
```

或者

```bash
pnpm install invert-indexeddb
```

## 快速开始

### 基本使用

```typescript
import { InvertedIndexDB } from 'invert-indexeddb';

// 初始化
const search = new InvertedIndexDB('mySearchDB');
await search.init();

// 添加文档
const docId = await search.addDocument(
  {
    title: '示例文档',
    content: '这是一段示例内容',
    createdAt: Date.now(),
  },
  ['title', 'createdAt']
); // 指定需要索引的字段

// 搜索
const results = await search.search('示例');
console.log(results.items); // 搜索结果
```

### 基于游标的搜索（推荐用于排序和分页）

```typescript
// 使用游标搜索，支持高效排序和分页
const results = await search.searchWithCursor('示例', {
  sortBy: 'createdAt', // 按创建时间排序
  order: 'desc', // 降序
  limit: 20, // 每页20条
  fuzzy: false, // 是否模糊匹配
  exact: false, // 是否精确匹配（短语搜索）
  highlight: true, // 是否高亮关键词
});

console.log(results.items); // 搜索结果
console.log(results.nextKey); // 下一页的游标键值

// 获取下一页
if (results.nextKey) {
  const nextPage = await search.searchWithCursor('示例', {
    sortBy: 'createdAt',
    order: 'desc',
    limit: 20,
    lastKey: results.nextKey, // 使用上一页的 nextKey
  });
}
```

> **注意**：`searchIds` 方法已废弃，请使用 `searchWithCursor` 代替。

### 使用自定义分词器

```typescript
import { InvertedIndexDB, ITokenizer, Token } from 'invert-indexeddb';

// 实现自定义分词器
class MyTokenizer implements ITokenizer {
  tokenize(text: string): Token[] {
    // 实现你的分词逻辑
    // 例如使用 jieba 等中文分词库
    return tokens;
  }
}

// 使用自定义分词器
const search = new InvertedIndexDB('myDB', {
  tokenizer: new MyTokenizer(),
});
await search.init();
```

## API 文档

### InvertedIndexDB

主类，提供所有搜索功能。

#### 构造函数

```typescript
new InvertedIndexDB(dbName: string, options?: InitOptions)
```

- `dbName`: 数据库名称
- `options.tokenizer`: 可选，自定义分词器
- `options.version`: 可选，数据库版本号

#### 方法

##### init()

初始化数据库，必须在其他操作前调用。

```typescript
await search.init();
```

##### addDocument<T>(doc, indexFields?)

添加文档并建立索引。支持泛型类型约束，自动处理 `createdAt` 和 `updatedAt` 时间戳。

```typescript
interface MyDocument extends BaseDocument {
  title: string;
  content: string;
  category: string;
}

const docId = await search.addDocument<MyDocument>(
  {
    title: '标题',
    content: '内容',
    category: '技术',
    // createdAt 和 updatedAt 会自动设置，无需手动指定
  },
  ['title', 'content'] // 指定需要索引的字段
);
```

##### updateDocument<T>(docId, doc, indexFields?)

更新文档并重建索引。支持泛型类型约束，自动更新 `updatedAt` 时间戳。

```typescript
await search.updateDocument<MyDocument>(
  docId,
  {
    title: '新标题',
    content: '新内容',
    category: '技术',
    // updatedAt 会自动更新，无需手动指定
  },
  ['title']
);
```

##### deleteDocument(docId)

删除文档及其索引。

```typescript
await search.deleteDocument(docId);
```

##### getDocument<T>(docId)

获取单个文档。支持泛型类型约束。

```typescript
const doc = await search.getDocument<MyDocument>(docId);
```

##### search(query, options?)

执行搜索，返回完整文档。

```typescript
const results = await search.search('关键词', {
  fuzzy: false, // 是否模糊匹配
  exact: false, // 是否精确匹配（短语搜索）
  operator: 'AND', // 'AND' 或 'OR'
  limit: 10, // 限制返回数量
  offset: 0, // 分页偏移量
  highlight: true, // 是否高亮关键词
});
```

##### searchWithCursor<T>(query, options?)

基于游标的搜索，支持高效排序和分页。**推荐使用此方法替代已废弃的 `searchIds` 方法**。

```typescript
const results = await search.searchWithCursor<MyDocument>('关键词', {
  sortBy: 'createdAt', // 排序字段：'createdAt' | 'updatedAt' | 'docId'
  order: 'desc', // 排序方向：'asc' | 'desc'
  limit: 20, // 每页数量
  lastKey: undefined, // 上一页的 nextKey，用于分页
  operator: 'AND', // 逻辑运算符：'AND' | 'OR'
  fuzzy: false, // 是否模糊匹配
  exact: false, // 是否精确匹配（短语搜索）
  highlight: true, // 是否高亮关键词
});

// 结果包含完整文档和下一页游标
console.log(results.items); // SearchResultItem<T>[]
console.log(results.nextKey); // 下一页的游标键值
```

> **注意**：`searchIds` 方法已废弃，请使用 `searchWithCursor` 代替。

##### clear()

清空所有数据。

```typescript
await search.clear();
```

##### getStats()

获取统计信息。

```typescript
const stats = await search.getStats();
console.log(stats.documentCount); // 文档数
console.log(stats.termCount); // 索引词数
```

##### rebuildIndex(onProgress?)

重建所有索引。使用游标逐个处理文档，避免内存溢出。支持进度回调。

```typescript
await search.rebuildIndex((progress) => {
  console.log(`进度: ${progress.current}/${progress.total} (${progress.percentage}%)`);
  console.log(`当前处理文档ID: ${progress.docId}`);
});
```

## 算法说明

### 倒排索引

将文档中的每个词映射到包含该词的文档ID列表，实现 O(1) 时间复杂度的关键词查找。

### N-gram 模糊匹配

使用 2-gram 和 3-gram 生成候选词，结合编辑距离（Levenshtein Distance）计算相似度，支持模糊搜索。

### 分词策略

默认分词器基于空格和标点符号，支持中英文混合。可以通过实现 `ITokenizer` 接口自定义分词算法。

## 性能优化

- 使用 IndexedDB 索引加速查询
- 基于游标的搜索和索引重建，避免内存溢出
- 批量操作减少事务开销
- 异步处理，不阻塞主线程
- 支持进度回调，实时监控重建索引进度

### 性能测试

- **1万条数据重建索引耗时**：655,956.70 毫秒（约 656 秒 / 11 分钟）
- **游标化重建索引**：避免一次性加载所有文档到内存，适合处理大量数据

## 浏览器支持

支持所有现代浏览器（支持 IndexedDB）：

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Opera 15+

## 许可证

MIT
