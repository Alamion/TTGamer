import {
    uniqueImageName,
    withImage,
    withoutUnusedImages,
} from '@site/src/sheet_manager/features/sheet/declarative/markdownImages';
import { deviceImageIdsOf } from '@site/src/sheet_manager/store/documentContent';
import { TEMPLATE_VALUES_LIMITS } from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, it } from 'vitest';

/** Pictures in a markdown text (spec 043, US4). */

const device = (blobId: string) => ({ source: 'device' as const, blobId });

describe('markdown images', () => {
    it('gives each new picture a name `![[…]]` can carry, unique in the text', () => {
        expect(uniqueImageName('map.png', {})).toBe('map.png');
        expect(uniqueImageName('map.png', { 'map.png': 1, 'map-2.png': 1 })).toBe('map-3.png');
        expect(uniqueImageName('a[b]|c#d.png', {})).toBe('abcd.png');
        expect(uniqueImageName('', {})).toBe('image.png');
    });

    it('stores the picture and puts its reference at the cursor', () => {
        const next = withImage({ text: 'before after' }, 7, 'map.png', device('blob-1'));
        expect(next).toEqual({
            text: 'before ![[map.png]]after',
            images: { 'map.png': device('blob-1') },
        });
        expect([...deviceImageIdsOf({ templateValues: { body: next } })]).toEqual(['blob-1']);
    });

    it('refuses a picture past the limit', () => {
        const images = Object.fromEntries(
            Array.from({ length: TEMPLATE_VALUES_LIMITS.markdownImagesMax }, (_, index) => [
                `i${String(index)}.png`,
                device(`b${String(index)}`),
            ])
        );
        expect(withImage({ text: '', images }, 0, 'one.png', device('x'))).toBeUndefined();
    });

    it('drops pictures the text no longer names, so their blobs are freed', () => {
        const value = {
            text: 'kept ![[a.png]]',
            images: { 'a.png': device('blob-a'), 'b.png': device('blob-b') },
        };
        const pruned = withoutUnusedImages(value)!;
        expect(pruned).toEqual({ text: 'kept ![[a.png]]', images: { 'a.png': device('blob-a') } });
        expect([...deviceImageIdsOf({ templateValues: { body: pruned } })]).toEqual(['blob-a']);
        expect(withoutUnusedImages(pruned)).toBeUndefined();
        expect(withoutUnusedImages({ text: 'none', images: { 'a.png': device('x') } })).toEqual({
            text: 'none',
        });
    });
});
