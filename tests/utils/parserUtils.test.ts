import {
  createCharacterMask,
  markRegion,
  isMasked,
  findAllMatches,
  maskInlineCode,
  maskHtmlComments,
  findTransclusionTokens,
  createReferenceFromToken,
  Token
} from '../../src/utils/parserUtils';

describe('parserUtils', () => {
  describe('createCharacterMask', () => {
    it('should create mask with default value true', () => {
      const mask = createCharacterMask(5);
      expect(mask.length).toBe(5);
      expect(mask.mask).toEqual([true, true, true, true, true]);
    });

    it('should create mask with custom default value', () => {
      const mask = createCharacterMask(3, false);
      expect(mask.mask).toEqual([false, false, false]);
    });

    it('should handle zero length', () => {
      const mask = createCharacterMask(0);
      expect(mask.length).toBe(0);
      expect(mask.mask).toEqual([]);
    });
  });

  describe('markRegion', () => {
    it('should mark region as false', () => {
      const mask = createCharacterMask(10);
      markRegion(mask, 2, 5, false);
      
      expect(mask.mask).toEqual([
        true, true, false, false, false, true, true, true, true, true
      ]);
    });

    it('should mark region as true', () => {
      const mask = createCharacterMask(5, false);
      markRegion(mask, 1, 3, true);
      
      expect(mask.mask).toEqual([false, true, true, false, false]);
    });

    it('should handle out of bounds gracefully', () => {
      const mask = createCharacterMask(5);
      markRegion(mask, 3, 10, false);
      
      expect(mask.mask).toEqual([true, true, true, false, false]);
    });
  });

  describe('isMasked', () => {
    it('should return true for masked positions', () => {
      const mask = createCharacterMask(5);
      markRegion(mask, 2, 4, false);
      
      expect(isMasked(mask, 2)).toBe(true);
      expect(isMasked(mask, 3)).toBe(true);
    });

    it('should return false for unmasked positions', () => {
      const mask = createCharacterMask(5);
      markRegion(mask, 2, 4, false);
      
      expect(isMasked(mask, 0)).toBe(false);
      expect(isMasked(mask, 4)).toBe(false);
    });

    it('should handle out of bounds', () => {
      const mask = createCharacterMask(5);
      
      expect(isMasked(mask, -1)).toBe(false);
      expect(isMasked(mask, 10)).toBe(false);
    });
  });

  describe('findAllMatches', () => {
    it('should find all matches', () => {
      const text = 'foo bar foo baz foo';
      const pattern = /foo/g;
      const matches = findAllMatches(text, pattern);
      
      expect(matches).toHaveLength(3);
      expect(matches[0]).toEqual({ match: expect.any(Array), start: 0, end: 3 });
      expect(matches[1]).toEqual({ match: expect.any(Array), start: 8, end: 11 });
      expect(matches[2]).toEqual({ match: expect.any(Array), start: 16, end: 19 });
    });

    it('should handle pattern without global flag', () => {
      const text = 'foo bar foo';
      const pattern = /foo/;
      const matches = findAllMatches(text, pattern);
      
      expect(matches).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const matches = findAllMatches('hello world', /xyz/g);
      expect(matches).toEqual([]);
    });
  });

  describe('maskInlineCode', () => {
    it('should mask inline code regions', () => {
      const text = 'Text `code` more `inline` text';
      const mask = createCharacterMask(text.length);
      
      maskInlineCode(text, mask);
      
      // Check that code regions are masked
      expect(isMasked(mask, 5)).toBe(true); // inside `code`
      expect(isMasked(mask, 18)).toBe(true); // inside `inline`
      expect(isMasked(mask, 0)).toBe(false); // outside code
    });

    it('should handle multiple inline codes', () => {
      const text = '`a` and `b` and `c`';
      const mask = createCharacterMask(text.length);
      
      maskInlineCode(text, mask);
      
      expect(isMasked(mask, 1)).toBe(true); // inside `a`
      expect(isMasked(mask, 9)).toBe(true); // inside `b`
      expect(isMasked(mask, 17)).toBe(true); // inside `c`
    });
  });

  describe('maskHtmlComments', () => {
    it('should mask HTML comment regions', () => {
      const text = 'Text <!-- comment --> more text';
      const mask = createCharacterMask(text.length);
      
      maskHtmlComments(text, mask);
      
      expect(isMasked(mask, 10)).toBe(true); // inside comment
      expect(isMasked(mask, 0)).toBe(false); // outside comment
    });

    it('should handle multiline comments on single line', () => {
      const text = 'Start <!-- multi\nline --> end';
      const mask = createCharacterMask(text.length);
      
      maskHtmlComments(text, mask);
      
      expect(isMasked(mask, 12)).toBe(true); // inside comment
    });
  });

  describe('findTransclusionTokens', () => {
    it('should find simple transclusion', () => {
      const tokens = findTransclusionTokens('![[file]]');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'transclusion',
        value: '![[file]]',
        startIndex: 0,
        endIndex: 9,
        path: 'file'
      });
    });

    it('should find transclusion with heading', () => {
      const tokens = findTransclusionTokens('![[file#section]]');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'transclusion',
        value: '![[file#section]]',
        startIndex: 0,
        endIndex: 17,
        path: 'file',
        heading: 'section'
      });
    });

    it('should find multiple transclusions', () => {
      const tokens = findTransclusionTokens('![[a]] and ![[b]]');
      
      expect(tokens).toHaveLength(2);
      expect(tokens[0].path).toBe('a');
      expect(tokens[1].path).toBe('b');
    });

    it('should skip empty paths', () => {
      const tokens = findTransclusionTokens('![[]] ![[  ]]');
      
      expect(tokens).toHaveLength(0);
    });
  });

  describe('createReferenceFromToken', () => {
    it('should create reference from transclusion token', () => {
      const token: Token = {
        type: 'transclusion',
        value: '![[file]]',
        startIndex: 5,
        endIndex: 14,
        path: 'file'
      };
      
      const ref = createReferenceFromToken(token);
      
      expect(ref).toEqual({
        original: '![[file]]',
        path: 'file',
        startIndex: 5,
        endIndex: 14
      });
    });

    it('should include heading if present', () => {
      const token: Token = {
        type: 'transclusion',
        value: '![[file#heading]]',
        startIndex: 0,
        endIndex: 17,
        path: 'file',
        heading: 'heading'
      };
      
      const ref = createReferenceFromToken(token);
      
      expect(ref?.heading).toBe('heading');
    });

    it('should return null for non-transclusion tokens', () => {
      const token: Token = {
        type: 'text',
        value: 'plain text',
        startIndex: 0,
        endIndex: 10
      };
      
      const ref = createReferenceFromToken(token);
      
      expect(ref).toBeNull();
    });

    it('should return null for transclusion without path', () => {
      const token: Token = {
        type: 'transclusion',
        value: '![[]]',
        startIndex: 0,
        endIndex: 5
      };
      
      const ref = createReferenceFromToken(token);
      
      expect(ref).toBeNull();
    });
  });
});