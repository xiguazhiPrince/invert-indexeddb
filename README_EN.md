# invert-indexeddb

English | [中文](README.md)

A full-text search SDK for IndexedDB based on inverted index algorithm, supporting fast keyword retrieval, fuzzy matching, sorting, and more.

## Features

- 🔍 **Full-text Search**: Based on inverted index algorithm with O(1) time complexity for keyword lookup
- 🔤 **Pluggable Tokenizer**: Support for custom tokenization algorithms, easy to extend
- 🎯 **Fuzzy Matching**: Support N-gram and edit distance algorithms for fuzzy search
- 📊 **Sorting Support**: Sort by fields, support multi-field sorting
- 💾 **Lightweight Queries**: Return only specified fields to reduce memory usage
- ⚡ **High Performance**: Leverage IndexedDB indexes to accelerate queries
- 🌐 **Multi-language Support**: Support mixed Chinese-English tokenization

## Installation

```bash
npm install invert-indexeddb
```

or

```bash
pnpm install invert-indexeddb
```

## Quick Start

### Basic Usage

```typescript
import { InvertedIndexDB } from 'invert-indexeddb';

// Initialize
const search = new InvertedIndexDB('mySearchDB');
await search.init();

// Add document
const docId = await search.addDocument(
  {
    title: 'Example Document',
    content: 'This is an example content',
    createdAt: Date.now(),
  },
  ['title', 'createdAt']
); // Specify fields to be indexed

// Search
const results = await search.search('example');
console.log(results.items); // Search results
```

### Cursor-based Search (Recommended for Sorting and Pagination)

```typescript
// Use cursor-based search with efficient sorting and pagination
const results = await search.searchWithCursor('example', {
  sortBy: 'createdAt', // Sort by creation time
  order: 'desc', // Descending order
  limit: 20, // 20 items per page
  fuzzy: false, // Whether to use fuzzy matching
  exact: false, // Whether to use exact matching (phrase search)
  highlight: true, // Whether to highlight keywords
});

console.log(results.items); // Search results
console.log(results.nextKey); // Cursor key for next page

// Get next page
if (results.nextKey) {
  const nextPage = await search.searchWithCursor('example', {
    sortBy: 'createdAt',
    order: 'desc',
    limit: 20,
    lastKey: results.nextKey, // Use nextKey from previous page
  });
}
```

> **Note**: The `searchIds` method is deprecated. Please use `searchWithCursor` instead.

### Using Custom Tokenizer

```typescript
import { InvertedIndexDB, ITokenizer, Token } from 'invert-indexeddb';

// Implement custom tokenizer
class MyTokenizer implements ITokenizer {
  tokenize(text: string): Token[] {
    // Implement your tokenization logic
    // For example, use jieba or other Chinese tokenization libraries
    return tokens;
  }
}

// Use custom tokenizer
const search = new InvertedIndexDB('myDB', {
  tokenizer: new MyTokenizer(),
});
await search.init();
```

## API Documentation

### InvertedIndexDB

Main class that provides all search functionality.

#### Constructor

```typescript
new InvertedIndexDB(dbName: string, options?: InitOptions)
```

- `dbName`: Database name
- `options.tokenizer`: Optional, custom tokenizer
- `options.version`: Optional, database version number

#### Methods

##### init()

Initialize the database, must be called before other operations.

```typescript
await search.init();
```

##### addDocument<T>(doc, indexFields?)

Add a document and build index. Supports generic type constraints and automatically handles `createdAt` and `updatedAt` timestamps.

```typescript
interface MyDocument extends BaseDocument {
  title: string;
  content: string;
  category: string;
}

const docId = await search.addDocument<MyDocument>(
  {
    title: 'Title',
    content: 'Content',
    category: 'Technology',
    // createdAt and updatedAt are automatically set, no need to specify manually
  },
  ['title', 'content'] // Specify fields to be indexed
);
```

##### updateDocument<T>(docId, doc, indexFields?)

Update a document and rebuild index. Supports generic type constraints and automatically updates `updatedAt` timestamp.

```typescript
await search.updateDocument<MyDocument>(
  docId,
  {
    title: 'New Title',
    content: 'New Content',
    category: 'Technology',
    // updatedAt is automatically updated, no need to specify manually
  },
  ['title']
);
```

##### deleteDocument(docId)

Delete a document and its index.

```typescript
await search.deleteDocument(docId);
```

##### getDocument<T>(docId)

Get a single document. Supports generic type constraints.

```typescript
const doc = await search.getDocument<MyDocument>(docId);
```

##### search(query, options?)

Execute search and return full documents.

```typescript
const results = await search.search('keyword', {
  fuzzy: false, // Whether to use fuzzy matching
  exact: false, // Whether to use exact matching (phrase search)
  operator: 'AND', // 'AND' or 'OR'
  limit: 10, // Limit number of results
  offset: 0, // Pagination offset
  highlight: true, // Whether to highlight keywords
});
```

##### searchWithCursor<T>(query, options?)

Cursor-based search with efficient sorting and pagination. **Recommended to use this method instead of the deprecated `searchIds` method**.

```typescript
const results = await search.searchWithCursor<MyDocument>('keyword', {
  sortBy: 'createdAt', // Sort field: 'createdAt' | 'updatedAt' | 'docId'
  order: 'desc', // Sort direction: 'asc' | 'desc'
  limit: 20, // Items per page
  lastKey: undefined, // nextKey from previous page, used for pagination
  operator: 'AND', // Logical operator: 'AND' | 'OR'
  fuzzy: false, // Whether to use fuzzy matching
  exact: false, // Whether to use exact matching (phrase search)
  highlight: true, // Whether to highlight keywords
});

// Results contain full documents and next page cursor
console.log(results.items); // SearchResultItem<T>[]
console.log(results.nextKey); // Cursor key for next page
```

> **Note**: The `searchIds` method is deprecated. Please use `searchWithCursor` instead.

##### clear()

Clear all data.

```typescript
await search.clear();
```

##### getStats()

Get statistics.

```typescript
const stats = await search.getStats();
console.log(stats.documentCount); // Document count
console.log(stats.termCount); // Index term count
```

##### rebuildIndex(onProgress?)

Rebuild all indexes. Uses cursors to process documents one by one, avoiding memory overflow. Supports progress callback.

```typescript
await search.rebuildIndex((progress) => {
  console.log(`Progress: ${progress.current}/${progress.total} (${progress.percentage}%)`);
  console.log(`Current document ID: ${progress.docId}`);
});
```

## Algorithm Description

### Inverted Index

Maps each word in documents to a list of document IDs containing that word, achieving O(1) time complexity for keyword lookup.

### N-gram Fuzzy Matching

Uses 2-gram and 3-gram to generate candidate terms, combined with edit distance (Levenshtein Distance) to calculate similarity, supporting fuzzy search.

### Tokenization Strategy

The default tokenizer is based on spaces and punctuation marks, supporting mixed Chinese-English. You can customize the tokenization algorithm by implementing the `ITokenizer` interface.

## Performance Optimization

- Use IndexedDB indexes to accelerate queries
- Cursor-based search and index rebuilding to avoid memory overflow
- Batch operations to reduce transaction overhead
- Asynchronous processing without blocking the main thread
- Support progress callback for real-time monitoring of index rebuilding progress

### Performance Benchmarks

- **Rebuild index for 10,000 documents**: 655,956.70 ms (approximately 656 seconds / 11 minutes)
- **Cursor-based index rebuilding**: Avoids loading all documents into memory at once, suitable for processing large amounts of data

## Browser Support

Supports all modern browsers (with IndexedDB support):

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Opera 15+

## License

MIT
