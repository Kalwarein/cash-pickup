import { describe, expect, it } from 'vitest';
import { cardProfit, editionRemaining, quoteChange } from './cardTrading';

describe('card values', () => {
  it('a SLE 300 card sold at SLE 600 earns SLE 300, or 100%', () => {
    expect(cardProfit(300, 600)).toBe(300);
    expect(quoteChange(600, 300)).toBe(100);
  });
  it('a lower resale quote carries the full loss', () => {
    expect(cardProfit(300, 240)).toBe(-60);
  });
  it('closes limited editions after 20 issued cards', () => {
    expect(editionRemaining(20, 19)).toBe(1);
    expect(editionRemaining(20, 20)).toBe(0);
  });
});