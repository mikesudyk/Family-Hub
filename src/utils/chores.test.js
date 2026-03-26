import { describe, it, expect } from 'vitest';
import { parseRepeat, repeatLabel, choreAppliesOnDay, isBiweeklyActiveWeek } from './chores';

// --- parseRepeat ---

describe('parseRepeat', () => {
  it('returns falsy values as-is', () => {
    expect(parseRepeat(null)).toBe(null);
    expect(parseRepeat(undefined)).toBe(undefined);
    expect(parseRepeat('')).toBe('');
  });

  it('returns plain string schedules as-is', () => {
    expect(parseRepeat('once')).toBe('once');
    expect(parseRepeat('daily')).toBe('daily');
    expect(parseRepeat('biweekly')).toBe('biweekly');
  });

  it('returns arrays as-is', () => {
    expect(parseRepeat(['Mon', 'Wed'])).toEqual(['Mon', 'Wed']);
  });

  it('returns biweekly objects as-is (the crash bug)', () => {
    const obj = { biweekly: ['Mon', 'Fri'] };
    expect(parseRepeat(obj)).toBe(obj);
  });

  it('parses biweekly object from JSON string', () => {
    expect(parseRepeat('{"biweekly":["Mon"]}')).toEqual({ biweekly: ['Mon'] });
  });

  it('parses day array from JSON string', () => {
    expect(parseRepeat('["Mon","Wed"]')).toEqual(['Mon', 'Wed']);
  });

  it('parses PostgreSQL array format {Mon,Wed}', () => {
    expect(parseRepeat('{Mon,Wed}')).toEqual(['Mon', 'Wed']);
  });

  it('parses PostgreSQL quoted array format {"Mon","Wed"}', () => {
    expect(parseRepeat('{"Mon","Wed"}')).toEqual(['Mon', 'Wed']);
  });
});

// --- repeatLabel ---

describe('repeatLabel', () => {
  it('returns null for once or falsy', () => {
    expect(repeatLabel('once')).toBe(null);
    expect(repeatLabel(null)).toBe(null);
  });

  it('returns "Every day" for daily', () => {
    expect(repeatLabel('daily')).toBe('Every day');
  });

  it('returns "Every other week" for biweekly string', () => {
    expect(repeatLabel('biweekly')).toBe('Every other week');
  });

  it('returns "Every other week · Mon, Fri" for biweekly object', () => {
    expect(repeatLabel({ biweekly: ['Mon', 'Fri'] })).toBe('Every other week · Mon, Fri');
  });

  it('returns joined days for day array', () => {
    expect(repeatLabel(['Mon', 'Wed'])).toBe('Mon · Wed');
  });
});

// --- isBiweeklyActiveWeek ---

describe('isBiweeklyActiveWeek', () => {
  // Use local date construction (not ISO strings) to avoid UTC timezone shifts
  // Epoch is Mon Jan 6, 2025 — week 0 is active
  it('week 0 (Jan 6 2025) is active', () => {
    expect(isBiweeklyActiveWeek(new Date(2025, 0, 6))).toBe(true);
  });

  it('week 1 (Jan 13 2025) is inactive', () => {
    expect(isBiweeklyActiveWeek(new Date(2025, 0, 13))).toBe(false);
  });

  it('week 2 (Jan 20 2025) is active', () => {
    expect(isBiweeklyActiveWeek(new Date(2025, 0, 20))).toBe(true);
  });

  it('treats all days within the same week consistently', () => {
    // Jan 6–12 2025 (Mon–Sun) should all return the same value
    const results = [6, 7, 8, 9, 10, 11, 12].map(d =>
      isBiweeklyActiveWeek(new Date(2025, 0, d))
    );
    expect(new Set(results).size).toBe(1);
  });
});

// --- choreAppliesOnDay ---

describe('choreAppliesOnDay', () => {
  const activeDate = new Date(2025, 0, 6);   // biweekly active week, Monday
  const inactiveDate = new Date(2025, 0, 13); // biweekly inactive week, Monday

  it('once chore only applies on today', () => {
    const chore = { repeat: 'once' };
    expect(choreAppliesOnDay(chore, 'Mon', true, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(false);
  });

  it('daily chore always applies', () => {
    const chore = { repeat: 'daily' };
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Sat', false, inactiveDate)).toBe(true);
  });

  it('biweekly string applies only on active weeks', () => {
    const chore = { repeat: 'biweekly' };
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Mon', false, inactiveDate)).toBe(false);
  });

  it('biweekly object applies on active weeks and matching days', () => {
    const chore = { repeat: { biweekly: ['Mon', 'Wed'] } };
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Tue', false, activeDate)).toBe(false);
    expect(choreAppliesOnDay(chore, 'Mon', false, inactiveDate)).toBe(false);
  });

  it('biweekly object from JSON string applies correctly', () => {
    const chore = { repeat: '{"biweekly":["Mon"]}' };
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Mon', false, inactiveDate)).toBe(false);
  });

  it('day array chore applies on matching days only', () => {
    const chore = { repeat: ['Mon', 'Wed'] };
    expect(choreAppliesOnDay(chore, 'Mon', false, activeDate)).toBe(true);
    expect(choreAppliesOnDay(chore, 'Tue', false, activeDate)).toBe(false);
  });
});
