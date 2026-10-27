import { maskMobile } from './mask-mobile';

describe('maskMobile', () => {
  it('returns null when there is no number', () => {
    expect(maskMobile(null)).toBeNull();
    expect(maskMobile(undefined)).toBeNull();
    expect(maskMobile('')).toBeNull();
  });

  it('keeps the country code and last three digits of an international number', () => {
    expect(maskMobile('+26658123456')).toBe('+266 •••••456');
  });

  it('treats spaces and punctuation as formatting, not content', () => {
    expect(maskMobile('+266 5812 3456')).toBe('+266 •••••456');
  });

  it('masks a local number with no country code', () => {
    expect(maskMobile('5812 3456')).toBe('•••••456');
  });

  it('reveals nothing from a number too short to mask safely', () => {
    expect(maskMobile('12345')).toBe('••••');
  });

  it('never leaks the middle digits', () => {
    const masked = maskMobile('+26658123456') ?? '';
    expect(masked).not.toContain('5812');
    expect(masked).not.toContain('58123');
  });
});
