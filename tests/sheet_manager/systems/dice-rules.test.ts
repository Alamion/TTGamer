import { systemRegistry } from '@site/src/sheet_manager/systems';
import { classicWodTraitPool } from '@site/src/sheet_manager/systems/wod-like/dicePool';
import { describe, expect, it } from 'vitest';

const flags = (specialization: boolean, experienced: boolean) => ({
    specialization,
    experienced,
    practiced: false,
});

describe('system dice rules', () => {
    it('keeps the classic WoD pool the Star Wars sheet always built', () => {
        expect(classicWodTraitPool(3, flags(false, false))).toBe('3d10>=6f=1');
        expect(classicWodTraitPool(3, flags(false, true))).toBe('3d10>=6');
        expect(classicWodTraitPool(3, flags(true, false))).toBe('3d10>=6f=1!');
        expect(classicWodTraitPool(3, flags(true, true))).toBe('3d10>=6!');
        expect(classicWodTraitPool(0, flags(true, true))).toBeUndefined();
    });

    it('declares the classic pool for Star Wars WoD', () => {
        const traitPool = systemRegistry.getSystem('star-wars-wod')?.dice?.traitPool;
        expect(traitPool?.(4, flags(true, false))).toBe('4d10>=6f=1!');
        expect(systemRegistry.getSystem('star-wars-wod')?.dice?.reading).toBeUndefined();
    });

    it('builds V5 pools: 6+, no subtracted ones, no explosions, no specialty die', () => {
        const traitPool = systemRegistry.getSystem('wod-v5')?.dice?.traitPool;
        expect(traitPool?.(3, flags(true, false))).toBe('3d10>=6');
        expect(traitPool?.(5, flags(false, false))).toBe('5d10>=6');
        expect(traitPool?.(0, flags(false, false))).toBeUndefined();
    });

    it('declares the V5 reading with the hunter on the Desperation line', () => {
        const reading = systemRegistry.getSystem('wod-v5')?.dice?.reading;
        expect(reading?.id).toBe('v5');
        expect(reading?.lines.map((line) => line.id)).toEqual(['hunger', 'desperation']);
        expect(reading?.lineFor('hunter')).toBe('desperation');
    });
});
