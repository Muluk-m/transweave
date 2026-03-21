import { levenshteinDistance, similarity } from '../levenshtein';

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('should return length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('should calculate single character difference', () => {
    expect(levenshteinDistance('cat', 'car')).toBe(1);
  });

  it('should handle insertions', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('should handle deletions', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('should handle completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});

describe('similarity', () => {
  it('should return 100 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(100);
  });

  it('should return 100 for two empty strings', () => {
    expect(similarity('', '')).toBe(100);
  });

  it('should be case insensitive', () => {
    expect(similarity('Hello', 'hello')).toBe(100);
  });

  it('should return 0 for completely different strings of same length', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('should return reasonable values for similar strings', () => {
    const s = similarity('Hello World', 'Hello Wrold');
    expect(s).toBeGreaterThan(70);
    expect(s).toBeLessThan(100);
  });
});
