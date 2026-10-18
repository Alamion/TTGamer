// @vitest-environment happy-dom
import { findLinkingDocuments } from '@site/src/sheet_manager/features/documents/linkedFrom';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { describe, expect, it } from 'vitest';

/** "Member of" at table scale (spec 040, SC-004): 50 groups of 30 members each. */
describe('documents linking here at scale', () => {
    it('lists a member’s groups within 200 ms', async () => {
        const members = Array.from({ length: 30 }, (_, index) => `m${index}`);
        useDocumentStore.setState({
            documents: Array.from(
                { length: 50 },
                (_, index) =>
                    ({
                        id: `g${index}`,
                        kind: 'v5-group',
                        systemId: 'wod-v5',
                        definitionId: 'v5-group',
                        schemaVersion: 1,
                        metadata: { title: `Group ${index}`, tags: [] },
                        templateValues: { members },
                        data: {},
                    }) as unknown as UnknownDocumentEnvelope
            ),
        });
        const scope = { systemId: 'wod-v5', settingId: undefined, kinds: new Set(['v5-group']) };
        await findLinkingDocuments('m3', scope);
        let best = Number.POSITIVE_INFINITY;
        for (let run = 0; run < 5; run += 1) {
            const started = performance.now();
            const { documents } = await findLinkingDocuments('m3', scope);
            best = Math.min(best, performance.now() - started);
            expect(documents).toHaveLength(50);
        }
        expect(best).toBeLessThan(200);
    });
});
