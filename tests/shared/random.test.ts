import { afterEach, describe, expect, it, vi } from 'vitest';

import { compactId, generateId, randomToken } from '../../src/shared/utils/random';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateId', () => {
    afterEach(() => vi.useRealTimers());

    it('returns a UUIDv7 with the RFC 9562 variant', () => {
        expect(generateId()).toMatch(UUID_V7);
    });

    it('carries the creation time, so ids from later milliseconds sort after earlier ones', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_700_000_000_000);
        const earlier = generateId();
        vi.setSystemTime(1_700_000_000_001);
        const later = generateId();
        expect(earlier < later).toBe(true);
        expect(earlier.slice(0, 13)).toBe('018bcfe5-6800');
    });

    it('never repeats across 10 000 ids', () => {
        const ids = new Set(Array.from({ length: 10_000 }, generateId));
        expect(ids.size).toBe(10_000);
    });

    it('has a compact form of 32 hex digits', () => {
        expect(compactId()).toMatch(/^[0-9a-f]{12}7[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    });
});

describe('randomToken', () => {
    it('returns lowercase hex of the asked length', () => {
        expect(randomToken(8)).toMatch(/^[0-9a-f]{8}$/);
        expect(randomToken(5)).toMatch(/^[0-9a-f]{5}$/);
    });

    it('stays random within one millisecond, unlike the time-ordered id prefix', () => {
        const tokens = new Set(Array.from({ length: 1_000 }, () => randomToken(8)));
        expect(tokens.size).toBe(1_000);
    });
});
