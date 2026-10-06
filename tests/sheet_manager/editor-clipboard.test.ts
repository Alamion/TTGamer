import {
    copySelection,
    parseCopied,
    pasteCopied,
    serializeCopied,
} from '@site/src/sheet_manager/features/template-editor/clipboard';
import {
    duplicateNode,
    type EditorDraft,
    findNode,
} from '@site/src/sheet_manager/features/template-editor/draft';
import {
    collectTemplateNodes,
    CustomTemplateSchema,
    TEMPLATE_LIMITS,
    type TemplateNode,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const page = (id: string, children: unknown[]): EditorDraft =>
    CustomTemplateSchema.parse({
        id,
        name: id,
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children,
    });

const source = () =>
    page('src', [
        {
            id: 'stats',
            type: 'section',
            title: 'Stats',
            children: [
                { id: 'might', type: 'rating', label: 'Might', valueKey: 'might', max: 5 },
                { id: 'total', type: 'formula', label: 'Total', formula: 'might + 2' },
                {
                    id: 'note',
                    type: 'text',
                    label: 'Note',
                    visibleWhen: { coordinate: 'might', equals: 3 },
                },
                { id: 'outside', type: 'formula', label: 'Outside', formula: 'luck * 2' },
            ],
        },
        { id: 'luck', type: 'number', label: 'Luck' },
        {
            id: 'deep',
            type: 'section',
            title: 'Deep',
            children: [{ id: 'g1', type: 'group', title: 'G1', children: [] }],
        },
    ]);

const ids = (node: TemplateNode | undefined): string[] => {
    if (!node) return [];
    const all: string[] = [node.id];
    if (node.type === 'section' || node.type === 'group') {
        for (const child of node.children) all.push(...ids(child));
    }
    return all;
};

const roundTrip = (draft: EditorDraft, target: EditorDraft, selected: string[]) => {
    const parsed = parseCopied(serializeCopied(copySelection(draft, selected)!), target);
    expect(parsed.ok).toBe(true);
    return (parsed as Extract<typeof parsed, { ok: true }>).copied;
};

describe('copied elements text (spec 023)', () => {
    it('round-trips the normalized selection', () => {
        const copied = roundTrip(source(), source(), ['might', 'stats']);
        expect(copied.nodes.map(({ id }) => id)).toEqual(['stats']);
        expect(copied.source).toEqual({
            templateId: 'src',
            systemId: 'wod-v5',
            documentKind: 'mortal',
        });
    });

    it('ignores text that is not a copy of elements', () => {
        expect(parseCopied('plain words', source())).toEqual({ ok: false, stage: 'ignored' });
        expect(parseCopied('{"format":"other"}', source())).toEqual({
            ok: false,
            stage: 'ignored',
        });
    });

    it('refuses newer versions and nodes that break the template rules', () => {
        const base = { format: 'ttgamer-template-elements', formatVersion: 1, source: {} };
        expect(
            parseCopied(JSON.stringify({ ...base, formatVersion: 2, nodes: [] }), source())
        ).toMatchObject({ ok: false, stage: 'version' });
        for (const nodes of [
            [],
            [{ id: 'x', type: 'text', label: '' }],
            [{ id: 'x', type: 'teleporter', label: 'X' }],
            [
                {
                    id: 'x',
                    type: 'select',
                    label: 'X',
                    options: Array.from(
                        { length: TEMPLATE_LIMITS.optionsPerField + 1 },
                        (_, i) => ({
                            id: `o${i}`,
                            label: `O${i}`,
                        })
                    ),
                },
            ],
        ]) {
            expect(parseCopied(JSON.stringify({ ...base, nodes }), source())).toMatchObject({
                ok: false,
                stage: 'schema',
            });
        }
    });

    it('strips unknown keys and never pollutes prototypes', () => {
        const text =
            '{"format":"ttgamer-template-elements","formatVersion":1,"source":{},"__proto__":{"polluted":1},' +
            '"nodes":[{"id":"x","type":"text","label":"X","script":"alert(1)","__proto__":{"polluted":1}}]}';
        const parsed = parseCopied(text, source());
        expect(parsed.ok).toBe(true);
        const node = (parsed as Extract<typeof parsed, { ok: true }>).copied.nodes[0]!;
        expect(Object.keys(node)).not.toContain('script');
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});

describe('pasting copied elements (spec 023)', () => {
    it('gives every pasted element a new identity and drops custom keys on the same page', () => {
        const draft = source();
        const copied = roundTrip(draft, draft, ['stats']);
        const result = pasteCopied(draft, copied, ['luck']);
        expect(result.ok).toBe(true);
        const pasted = (result as Extract<typeof result, { ok: true }>).ids;
        const next = (result as Extract<typeof result, { ok: true }>).draft;
        const copy = findNode(next, pasted[0]!)!;
        const originals = new Set(ids(findNode(draft, 'stats')));
        for (const id of ids(copy)) expect(originals.has(id)).toBe(false);
        expect(copy).toMatchObject({ title: expect.stringContaining('Stats') });
        expect((copy as { title: string }).title).not.toBe('Stats');
        const rating = (copy as { children: TemplateNode[] }).children[0] as { valueKey?: string };
        expect(rating.valueKey).toBeUndefined();
        expect(CustomTemplateSchema.safeParse(next).success).toBe(true);
    });

    it('points formulas and conditions inside the copy at the copy', () => {
        const draft = source();
        const result = pasteCopied(draft, roundTrip(draft, draft, ['stats']), []);
        const next = (result as Extract<typeof result, { ok: true }>).draft;
        const copy = next.children[next.children.length - 1] as { children: TemplateNode[] };
        const [rating, total, note, outside] = copy.children as Array<Record<string, unknown>>;
        expect(total!.formula).toBe(`${rating!.id as string} + 2`);
        expect((note!.visibleWhen as { coordinate: string }).coordinate).toBe(rating!.id);
        // A reference to an element outside the copy is kept as written.
        expect(outside!.formula).toBe('luck * 2');
    });

    it('keeps names and custom keys on another page unless they are taken there', () => {
        const draft = source();
        const blank = page('other', [{ id: 'free', type: 'text', label: 'Free' }]);
        const copied = roundTrip(draft, blank, ['stats']);
        const result = pasteCopied(blank, copied, []);
        const next = (result as Extract<typeof result, { ok: true }>).draft;
        const copy = next.children[1] as { title: string; children: TemplateNode[] };
        expect(copy.title).toBe('Stats');
        expect((copy.children[0] as { valueKey?: string }).valueKey).toBe('might');
        expect((copy.children[1] as { formula: string }).formula).toBe('might + 2');

        const taken = page('taken', [{ id: 'might', type: 'number', label: 'Might' }]);
        const again = pasteCopied(taken, roundTrip(draft, taken, ['stats']), []);
        const copyAgain = (again as Extract<typeof again, { ok: true }>).draft.children[1] as {
            children: TemplateNode[];
        };
        const rating = copyAgain.children[0]!;
        expect((rating as { valueKey?: string }).valueKey).toBeUndefined();
        expect((copyAgain.children[1] as { formula: string }).formula).toBe(`${rating.id} + 2`);
    });

    it('places a paste after a field, inside a group, or at the end', () => {
        const draft = source();
        const copied = roundTrip(draft, draft, ['luck']);
        const at = (selected: string[]) => {
            const result = pasteCopied(draft, copied, selected);
            const next = (result as Extract<typeof result, { ok: true }>).draft;
            const id = (result as Extract<typeof result, { ok: true }>).ids[0]!;
            return { next, id };
        };
        let { next, id } = at(['luck']);
        expect(next.children.map((node) => node.id)).toEqual(['stats', 'luck', id, 'deep']);
        ({ next, id } = at(['stats']));
        expect((findNode(next, 'stats') as { children: TemplateNode[] }).children.at(-1)!.id).toBe(
            id
        );
        ({ next, id } = at([]));
        expect(next.children.at(-1)!.id).toBe(id);
    });

    it('falls back past the depth limit and refuses past the element limit', () => {
        const nest = (depth: number): unknown =>
            depth === 0
                ? { id: `leaf`, type: 'text', label: 'Leaf' }
                : {
                      id: `n${depth}`,
                      type: 'group',
                      title: `N${depth}`,
                      children: [nest(depth - 1)],
                  };
        const deep = page('deep', [nest(TEMPLATE_LIMITS.maxDepth - 1)]);
        const tall = page('tall', [nest(3)]);
        const copied = roundTrip(tall, deep, ['n3']);
        const innermost = `n1`;
        const result = pasteCopied(deep, copied, [innermost]);
        expect(result.ok).toBe(true);
        // The nearest enclosing group with room for the copy's depth takes it.
        const { draft: next, ids: pasted } = result as Extract<typeof result, { ok: true }>;
        expect(findNode(next, pasted[0]!)).toBeDefined();
        expect(CustomTemplateSchema.safeParse(next).success).toBe(true);
        expect(findNode(next, 'n1')).toMatchObject({ children: [{ id: 'leaf' }] });

        const full = page(
            'full',
            Array.from({ length: TEMPLATE_LIMITS.nodesPerTemplate }, (_, i) => ({
                id: `t${i}`,
                type: 'text',
                label: `T${i}`,
            }))
        );
        expect(pasteCopied(full, copied, [])).toMatchObject({ ok: false, error: 'count' });
        expect(collectTemplateNodes(full)).toHaveLength(TEMPLATE_LIMITS.nodesPerTemplate);
    });

    it('fixes duplicates whose formulas read their own children', () => {
        const draft = source();
        const result = duplicateNode(draft, 'stats');
        const copy = findNode(
            (result as Extract<typeof result, { ok: true }>).draft,
            result.copyId!
        ) as { children: Array<Record<string, unknown>> };
        expect(copy.children[1]!.formula).toBe(`${copy.children[0]!.id as string} + 2`);
    });
});

describe('renaming formula coordinates', () => {
    it('renames whole coordinates only and keeps pool parts', async () => {
        const { renameFormulaCoordinates } =
            await import('@site/src/sheet_manager/features/sheet/declarative/formula');
        const rename = (name: string) => (name === 'might' ? 'f-new' : undefined);
        expect(renameFormulaCoordinates('might + mighty - max(might.current, 2)', rename)).toBe(
            'f-new + mighty - max(f-new.current, 2)'
        );
        expect(renameFormulaCoordinates('might +', rename)).toBe('f-new +');
        expect(renameFormulaCoordinates('might $ 2', rename)).toBe('might $ 2');
    });
});
