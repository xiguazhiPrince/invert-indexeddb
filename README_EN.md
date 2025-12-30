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

````bash
pnpm install invert-indexeddb

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
````

### Lightweight Search (for sorting)

```typescript
// Only return IDs and specified fields to reduce memory usage
const lightResults = await search.searchIds('example', {
  fields: ['title', 'createdAt', 'score'],
  sortBy: { field: 'createdAt', order: 'desc' },
  limit: 20,
  offset: 0,
});

// Results only contain IDs and specified fields
console.log(lightResults.items);
// [
//   { docId: '1', fields: { title: '...', createdAt: 123456, score: 95 } },
//   ...
// ]

// Then fetch full documents as needed
const fullDocs = await Promise.all(lightResults.docIds.map((id) => search.getDocument(id)));
```

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

##### addDocument(doc, indexFields?)

Add a document and build index.

```typescript
const docId = await search.addDocument(
  {
    title: 'Title',
    content: 'Content',
    createdAt: Date.now(),
  },
  ['title', 'createdAt']
); // Specify fields to be indexed
```

##### updateDocument(docId, doc, indexFields?)

Update a document and rebuild index.

```typescript
await search.updateDocument(
  docId,
  {
    title: 'New Title',
    content: 'New Content',
  },
  ['title']
);
```

##### deleteDocument(docId)

Delete a document and its index.

```typescript
await search.deleteDocument(docId);
```

##### getDocument(docId)

Get a single document.

```typescript
const doc = await search.getDocument(docId);
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

##### searchIds(query, options?)

Lightweight search that only returns IDs and specified fields.

```typescript
const results = await search.searchIds('keyword', {
  fields: ['title', 'createdAt'], // Specify fields to return
  sortBy: { field: 'createdAt', order: 'desc' }, // Sorting
  limit: 20,
  offset: 0,
});
```

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

##### rebuildIndex()

Rebuild all indexes.

```typescript
await search.rebuildIndex();
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
- Batch operations to reduce transaction overhead
- Lightweight queries return only necessary fields
- Asynchronous processing without blocking the main thread

### Performance Benchmarks

- **Rebuild index for 10,000 documents**: 655,956.70 ms (approximately 656 seconds / 11 minutes)

## Browser Support

Supports all modern browsers (with IndexedDB support):

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Opera 15+

## License

MIT
