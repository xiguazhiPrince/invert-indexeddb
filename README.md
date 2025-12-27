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

### 轻量级搜索（用于排序）

```typescript
// 只返回ID和指定字段，减少内存占用
const lightResults = await search.searchIds('示例', {
  fields: ['title', 'createdAt', 'score'],
  sortBy: { field: 'createdAt', order: 'desc' },
  limit: 20,
  offset: 0,
});

// 结果只包含ID和指定字段
console.log(lightResults.items);
// [
//   { docId: '1', fields: { title: '...', createdAt: 123456, score: 95 } },
//   ...
// ]

// 然后可以根据需要获取完整文档
const fullDocs = await Promise.all(lightResults.docIds.map((id) => search.getDocument(id)));
```

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

##### addDocument(doc, indexFields?)

添加文档并建立索引。

```typescript
const docId = await search.addDocument(
  {
    title: '标题',
    content: '内容',
    createdAt: Date.now(),
  },
  ['title', 'createdAt']
); // 指定需要索引的字段
```

##### updateDocument(docId, doc, indexFields?)

更新文档并重建索引。

```typescript
await search.updateDocument(
  docId,
  {
    title: '新标题',
    content: '新内容',
  },
  ['title']
);
```

##### deleteDocument(docId)

删除文档及其索引。

```typescript
await search.deleteDocument(docId);
```

##### getDocument(docId)

获取单个文档。

```typescript
const doc = await search.getDocument(docId);
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

##### searchIds(query, options?)

轻量级搜索，只返回ID和指定字段。

```typescript
const results = await search.searchIds('关键词', {
  fields: ['title', 'createdAt'], // 指定返回字段
  sortBy: { field: 'createdAt', order: 'desc' }, // 排序
  limit: 20,
  offset: 0,
});
```

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

##### rebuildIndex()

重建所有索引。

```typescript
await search.rebuildIndex();
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
- 批量操作减少事务开销
- 轻量级查询只返回必要字段
- 异步处理，不阻塞主线程

### 性能测试

- **1万条数据重建索引耗时**：655,956.70 毫秒（约 656 秒 / 11 分钟）

## 浏览器支持

支持所有现代浏览器（支持 IndexedDB）：

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Opera 15+

## 许可证

MIT
