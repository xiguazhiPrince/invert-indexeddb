/**
 * N-gram 测试
 */

import {
  generateNGrams,
  generateNGramsCombined,
  levenshteinDistance,
  similarity,
  findSimilarTerms,
} from '../indexer/ngram';

describe('N-gram', () => {
  describe('generateNGrams', () => {
    it('should generate bigrams', () => {
      const grams = generateNGrams('hello', 2);
      expect(grams).toEqual(['he', 'el', 'll', 'lo']);
    });

    it('should generate trigrams', () => {
      const grams = generateNGrams('hello', 3);
      expect(grams).toEqual(['hel', 'ell', 'llo']);
    });

    it('should handle short text', () => {
      const grams = generateNGrams('hi', 3);
      expect(grams).toEqual(['hi']);
    });
  });

  describe('generateNGramsCombined', () => {
    it('should generate both bigrams and trigrams', () => {
      const grams = generateNGramsCombined('hello');
      expect(grams.length).toBeGreaterThan(0);
      expect(grams).toContain('he');
      expect(grams).toContain('hel');
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate distance for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate distance for different strings', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });
  });

  describe('similarity', () => {
    it('should return 1 for identical strings', () => {
      expect(similarity('hello', 'hello')).toBe(1);
    });

    it('should return value between 0 and 1', () => {
      const sim = similarity('hello', 'world');
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);
    });
  });

  describe('findSimilarTerms', () => {
    it('should find similar terms', () => {
      const candidates = ['hello', 'world', 'hell', 'help'];
      const similar = findSimilarTerms('hello', candidates, 0.6);
      
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].term).toBe('hello');
    });

    it('should return empty array if no similar terms', () => {
      const candidates = ['world', 'test'];
      const similar = findSimilarTerms('hello', candidates, 0.9);
      
      expect(similar.length).toBe(0);
    });
  });
});

