import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedTransitions } from '../lib/status-transitions.js';
import type { V2Status } from '../types/v2.js';

const ALL_STATUSES: V2Status[] = ['queued', 'claimed', 'in_progress', 'review', 'done', 'archived'];

describe('isValidTransition', () => {
  describe('AL (superuser)', () => {
    it('can transition between any two distinct statuses', () => {
      for (const from of ALL_STATUSES) {
        for (const to of ALL_STATUSES) {
          if (from === to) {
            expect(isValidTransition(from, to, 'al')).toBe(false);
          } else {
            expect(isValidTransition(from, to, 'al')).toBe(true);
          }
        }
      }
    });
  });

  describe('AI', () => {
    const allowed: [V2Status, V2Status][] = [
      ['queued', 'claimed'],
      ['claimed', 'in_progress'],
      ['claimed', 'queued'],
      ['in_progress', 'review'],
      ['in_progress', 'queued'],
      ['done', 'archived'],
      ['review', 'queued'],
      ['archived', 'queued'],
      ['done', 'queued'],
    ];

    const blocked: [V2Status, V2Status][] = [
      ['queued', 'in_progress'],
      ['queued', 'review'],
      ['queued', 'done'],
      ['queued', 'archived'],
      ['claimed', 'review'],
      ['claimed', 'done'],
      ['claimed', 'archived'],
      ['in_progress', 'claimed'],
      ['in_progress', 'done'],
      ['in_progress', 'archived'],
      ['review', 'claimed'],
      ['review', 'in_progress'],
      ['review', 'done'],
      ['review', 'archived'],
      ['done', 'claimed'],
      ['done', 'in_progress'],
      ['done', 'review'],
      ['archived', 'claimed'],
      ['archived', 'in_progress'],
      ['archived', 'review'],
      ['archived', 'done'],
    ];

    it.each(allowed)('allows %s → %s', (from, to) => {
      expect(isValidTransition(from, to, 'ai')).toBe(true);
    });

    it.each(blocked)('blocks %s → %s', (from, to) => {
      expect(isValidTransition(from, to, 'ai')).toBe(false);
    });
  });

  describe('System', () => {
    const allowed: [V2Status, V2Status][] = [
      ['claimed', 'queued'],
      ['in_progress', 'queued'],
      ['review', 'queued'],
      ['done', 'archived'],
      ['done', 'queued'],
      ['archived', 'queued'],
    ];

    const blocked: [V2Status, V2Status][] = [
      ['queued', 'claimed'],
      ['queued', 'in_progress'],
      ['queued', 'review'],
      ['queued', 'done'],
      ['queued', 'archived'],
      ['claimed', 'in_progress'],
      ['claimed', 'review'],
      ['claimed', 'done'],
      ['claimed', 'archived'],
      ['in_progress', 'claimed'],
      ['in_progress', 'review'],
      ['in_progress', 'done'],
      ['in_progress', 'archived'],
      ['review', 'claimed'],
      ['review', 'in_progress'],
      ['review', 'done'],
      ['review', 'archived'],
      ['done', 'claimed'],
      ['done', 'in_progress'],
      ['done', 'review'],
      ['archived', 'claimed'],
      ['archived', 'in_progress'],
      ['archived', 'review'],
      ['archived', 'done'],
    ];

    it.each(allowed)('allows %s → %s', (from, to) => {
      expect(isValidTransition(from, to, 'system')).toBe(true);
    });

    it.each(blocked)('blocks %s → %s', (from, to) => {
      expect(isValidTransition(from, to, 'system')).toBe(false);
    });
  });

  it('rejects same-status transitions for all actors', () => {
    for (const s of ALL_STATUSES) {
      expect(isValidTransition(s, s, 'al')).toBe(false);
      expect(isValidTransition(s, s, 'ai')).toBe(false);
      expect(isValidTransition(s, s, 'system')).toBe(false);
    }
  });
});

describe('getAllowedTransitions', () => {
  it('AL gets all statuses minus current', () => {
    for (const from of ALL_STATUSES) {
      const result = getAllowedTransitions(from, 'al');
      expect(result).toHaveLength(5);
      expect(result).not.toContain(from);
      for (const s of ALL_STATUSES) {
        if (s !== from) expect(result).toContain(s);
      }
    }
  });

  it('AI gets only allowed transitions', () => {
    expect(getAllowedTransitions('queued', 'ai').sort()).toEqual(['claimed']);
    expect(getAllowedTransitions('claimed', 'ai').sort()).toEqual(['in_progress', 'queued']);
    expect(getAllowedTransitions('in_progress', 'ai').sort()).toEqual(['queued', 'review']);
    expect(getAllowedTransitions('review', 'ai')).toEqual(['queued']);
    expect(getAllowedTransitions('done', 'ai').sort()).toEqual(['archived', 'queued'].sort());
    expect(getAllowedTransitions('archived', 'ai')).toEqual(['queued']);
  });

  it('System gets only allowed transitions', () => {
    expect(getAllowedTransitions('queued', 'system')).toEqual([]);
    expect(getAllowedTransitions('claimed', 'system')).toEqual(['queued']);
    expect(getAllowedTransitions('in_progress', 'system')).toEqual(['queued']);
    expect(getAllowedTransitions('review', 'system')).toEqual(['queued']);
    expect(getAllowedTransitions('done', 'system').sort()).toEqual(['archived', 'queued']);
    expect(getAllowedTransitions('archived', 'system')).toEqual(['queued']);
  });
});
