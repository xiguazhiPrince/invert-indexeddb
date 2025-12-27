/**
 * 基本功能测试
 */

import { InvertedIndexDB } from '../index';

// Mock IndexedDB
const mockIndexedDB = () => {
  const stores: Map<string, Map<any, any>> = new Map();

  return {
    open: jest.fn(),
    objectStoreNames: {
      contains: jest.fn(() => false),
    },
    createObjectStore: jest.fn(() => ({
      createIndex: jest.fn(),
    })),
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        get: jest.fn(),
        put: jest.fn(),
        add: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getAll: jest.fn(),
        getAllKeys: jest.fn(),
        count: jest.fn(),
      })),
    })),
    close: jest.fn(),
  };
};

// 由于 IndexedDB 在 Node.js 环境中不可用，这里只做基本结构测试
describe('InvertedIndexDB', () => {
  it('should create instance', () => {
    const db = new InvertedIndexDB('test-db');
    expect(db).toBeInstanceOf(InvertedIndexDB);
  });

  it('should accept custom tokenizer', () => {
    const customTokenizer = {
      tokenize: jest.fn(() => []),
    };
    const db = new InvertedIndexDB('test-db', {
      tokenizer: customTokenizer,
    });
    expect(db).toBeInstanceOf(InvertedIndexDB);
  });
});
