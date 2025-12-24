/**
 * 数据库 Schema 定义
 */

export const DB_NAME_PREFIX = 'invert_indexeddb_';

export const STORE_NAMES = {
  DOCUMENTS: 'documents',
  INVERTED_INDEX: 'invertedIndex',
  DOC_TERMS: 'docTerms',
  DOC_FIELDS: 'docFields',
} as const;

export const INDEX_NAMES = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  TERM: 'term',
  DOC_ID: 'docId',
} as const;

/**
 * 数据库版本
 */
export const DB_VERSION = 1;

