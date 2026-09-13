import {
    collectTemplateFields,
    collectTreeIssues,
    CustomTemplateSchema,
    fieldValueKey,
    TEMPLATE_LIMITS,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import {
    coerceStoredValue,
    validateImageValue,
    validateListValue,
} from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, it } from 'vitest';

function textField(id: string, label = id, valueKey?: string) {
    return {
        id,
        type: 'text' as const,
        label,
        required: false,
        compact: false,
        multiline: false,
        ...(valueKey ? { valueKey } : {}),
    };
}

describe('recursive template schema v3 (T006)', () => {
    it('round-trips a 10-level tree', () => {
        let leaf: TemplateNode = textField('leaf', 'Leaf');
        for (let depth = TEMPLATE_LIMITS.maxDepth - 1; depth >= 1; depth -= 1) {
            leaf =
                depth % 2 === 0
                    ? {
                          id: `container-${depth}`,
                          type: 'section' as const,
                          title: `Level ${depth}`,
                          children: [leaf],
                      }
                    : {
                          id: `container-${depth}`,
                          type: 'group' as const,
                          title: `Level ${depth}`,
                          collapsible: false,
                          children: [leaf],
                      };
        }
        const template = CustomTemplateSchema.parse({
            id: 'deep-tree',
            name: 'Deep Tree',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [leaf],
        });
        let visited = 0;
        walkTemplateNodes(template.children, () => {
            visited += 1;
        });
        expect(visited).toBe(TEMPLATE_LIMITS.maxDepth);
        expect(collectTreeIssues(template)).toHaveLength(0);
        // Round-trip: parse(parse(...)) stays identical.
        expect(CustomTemplateSchema.parse(template)).toEqual(template);
    });

    it('rejects trees beyond the depth guardrail with the depth issue', () => {
        let leaf: TemplateNode = textField('leaf', 'Leaf');
        for (let depth = TEMPLATE_LIMITS.maxDepth; depth >= 1; depth -= 1) {
            leaf = {
                id: `container-${depth}`,
                type: 'section' as const,
                title: `Level ${depth}`,
                children: [leaf],
            };
        }
        // The schema itself refuses the tree…
        expect(
            CustomTemplateSchema.safeParse({
                id: 'too-deep',
                name: 'Too Deep',
                documentKind: 'character',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [leaf],
            }).success
        ).toBe(false);
        // …and the walker names the offending depth.
        const issues = collectTreeIssues({
            id: 'too-deep',
            name: 'Too Deep',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [leaf],
        } as Parameters<typeof collectTreeIssues>[0]);
        expect(issues.some(({ code }) => code === 'depth')).toBe(true);
        expect(issues.find(({ code }) => code === 'depth')?.limit).toBe(TEMPLATE_LIMITS.maxDepth);
    });

    it('rejects duplicate ids across the whole tree', () => {
        const template = {
            id: 'dupe-ids',
            name: 'Dupe IDs',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [
                {
                    id: 'sec',
                    type: 'section' as const,
                    title: 'Outer',
                    children: [textField('dupe', 'A')],
                },
                textField('dupe', 'B'),
            ],
        } as Parameters<typeof collectTreeIssues>[0];
        expect(CustomTemplateSchema.safeParse(template).success).toBe(false);
        expect(collectTreeIssues(template)).toContainEqual({
            code: 'duplicate-id',
            nodeId: 'dupe',
        });
    });

    it('rejects the old v2 sections shape', () => {
        const result = CustomTemplateSchema.safeParse({
            id: 'legacy-shape',
            name: 'Legacy',
            documentKind: 'character',
            schemaVersion: 2,
            sections: [],
        });
        expect(result.success).toBe(false);
    });

    it('collects fields across any depth including table columns', () => {
        const template = CustomTemplateSchema.parse({
            id: 'collector',
            name: 'Collector',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [
                {
                    id: 'sec',
                    type: 'section',
                    title: 'Sec',
                    children: [
                        textField('inner', 'Inner'),
                        {
                            id: 'tbl',
                            type: 'table',
                            minRows: 0,
                            maxRows: 10,
                            columns: [textField('col-a', 'Col A'), textField('col-b', 'Col B')],
                        },
                    ],
                },
                textField('root', 'Root'),
            ],
        });
        const fields = collectTemplateFields(template);
        expect([...fields.keys()].sort()).toEqual(['col-a', 'col-b', 'inner', 'root']);
        expect(fieldValueKey(fields.get('inner')!)).toBe('inner');
    });

    it('enforces list storage exclusivity and image/formula field shapes', () => {
        expect(
            CustomTemplateSchema.safeParse({
                id: 'list-both',
                name: 'Both',
                documentKind: 'character',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [
                    {
                        id: 'lst',
                        type: 'list',
                        valueKey: 'own-key',
                        bindingKey: 'list:customSkills',
                        columns: 1,
                    },
                ],
            }).success
        ).toBe(false);

        expect(
            CustomTemplateSchema.safeParse({
                id: 'list-neither',
                name: 'Neither',
                documentKind: 'character',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [{ id: 'lst', type: 'list', columns: 1 }],
            }).success
        ).toBe(false);

        expect(
            CustomTemplateSchema.safeParse({
                id: 'image-field',
                name: 'Image',
                documentKind: 'character',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [
                    textField('portrait').type === 'text'
                        ? {
                              id: 'portrait',
                              type: 'image',
                              label: 'Portrait',
                              required: false,
                              compact: false,
                          }
                        : textField('portrait'),
                ],
            }).success
        ).toBe(true);

        expect(
            CustomTemplateSchema.safeParse({
                id: 'formula-field',
                name: 'Formula',
                documentKind: 'character',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [
                    {
                        id: 'derived',
                        type: 'formula',
                        label: 'D',
                        formula: 'a + b',
                        required: false,
                        compact: false,
                    },
                ],
            }).success
        ).toBe(true);
    });
});

describe('value shapes: lists and images (T003/T006)', () => {
    it('validates list entry writes on the write path', () => {
        expect(validateListValue([{ id: 'e1', label: 'Entry', value: 2 }])).toEqual({
            ok: true,
            value: [{ id: 'e1', label: 'Entry', value: 2 }],
        });
        // Non-entry shapes are rejected.
        expect(validateListValue('not-a-list').ok).toBe(false);
        expect(validateListValue([{ wrong: 'shape' }]).ok).toBe(false);
    });

    it('validates image values (device blob id or safe URL)', () => {
        expect(validateImageValue({ source: 'device', blobId: 'blob-1' }).ok).toBe(true);
        expect(validateImageValue({ source: 'url', url: 'https://example.test/a.png' }).ok).toBe(
            true
        );
        // Insecure URLs are rejected on the write path.
        expect(validateImageValue({ source: 'url', url: 'http://example.test/a.png' }).ok).toBe(
            false
        );
        expect(validateImageValue('not-an-image').ok).toBe(false);
    });

    it('coerces stored list and image values defensively', () => {
        // An image field reading a legacy string keeps nothing useful but does not crash.
        const imageField = {
            id: 'portrait',
            type: 'image' as const,
            label: 'Portrait',
            required: false,
            compact: false,
        };
        expect(
            coerceStoredValue(imageField, { source: 'url', url: 'https://x.test/a.png' })
        ).toEqual({
            source: 'url',
            url: 'https://x.test/a.png',
        });
        expect(coerceStoredValue(imageField, 'legacy-string')).toBeUndefined();
        expect(coerceStoredValue(imageField, undefined)).toBeUndefined();
    });
});

describe('node schema errors (discriminated union)', () => {
    const parseChildren = (children: unknown[]) =>
        CustomTemplateSchema.safeParse({
            id: 'errors-kit',
            name: 'Errors Kit',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children,
        });

    it('reports an unknown node type as a single discriminator error', () => {
        const result = parseChildren([{ id: 'odd', type: 'date', label: 'When' }]);
        expect(result.success).toBe(false);
        const issues = result.success ? [] : result.error.issues;
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe('invalid_union_discriminator');
    });

    it('reports only the offending property of a known type', () => {
        const result = parseChildren([{ id: 'luck', type: 'rating', label: 'Luck', max: 500 }]);
        const issues = result.success ? [] : result.error.issues;
        expect(issues.map(({ path }) => path.join('.'))).toEqual(['children.0.max']);
    });

    it('keeps cross-property rules with their paths', () => {
        const result = parseChildren([
            { id: 'luck', type: 'number', label: 'Luck', min: 5, max: 1 },
            { id: 'kit-list', type: 'list' },
        ]);
        const messages = result.success ? [] : result.error.issues.map(({ message }) => message);
        expect(messages).toContain('Minimum cannot exceed maximum');
        expect(messages).toContain(
            'A list must use exactly one storage mode: valueKey or bindingKey'
        );
    });
});

describe('feature 007 schema additions', () => {
    const base = { id: 'kit-007', name: 'Kit', documentKind: 'creature', schemaVersion: 3 };

    it('accepts render conditions, collapsed defaults, member caps, and option labels', () => {
        const parsed = CustomTemplateSchema.parse({
            ...base,
            children: [
                {
                    id: 'details',
                    type: 'section',
                    title: 'Details',
                    defaultCollapsed: true,
                    visibleWhen: { coordinate: 'threat-tier', equals: 'fodder', not: true },
                    children: [
                        {
                            id: 'threat-tier',
                            type: 'select',
                            label: 'Tier',
                            options: [
                                {
                                    id: 'named',
                                    label: 'Named',
                                    labelMessage: 'ttgamer.ui.sheet.templates.entities.tierNamed',
                                },
                            ],
                        },
                        {
                            id: 'damage-track',
                            type: 'primitive',
                            bindingKey: 'track:members-health',
                            cohort: { maxMembers: 12 },
                            visibleWhen: { coordinate: 'size', equals: 3 },
                        },
                    ],
                },
            ],
        });
        expect(parsed.children[0]).toMatchObject({ defaultCollapsed: true });
    });

    it('rejects malformed conditions and member caps', () => {
        const withChild = (child: unknown) =>
            CustomTemplateSchema.safeParse({ ...base, children: [child] }).success;
        expect(
            withChild({ ...textField('a'), visibleWhen: { coordinate: 'Not Kebab', equals: 'x' } })
        ).toBe(false);
        expect(
            withChild({ id: 'p', type: 'primitive', bindingKey: 'x', cohort: { maxMembers: 30 } })
        ).toBe(false);
        expect(
            withChild({ ...textField('b'), visibleWhen: { coordinate: 'ok', equals: 'x' } })
        ).toBe(true);
    });
});
