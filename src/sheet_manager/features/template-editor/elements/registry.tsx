import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import {
    legacyListItem,
    type TemplateField,
    type TemplateNode,
    type TemplateNodeType,
} from '../../../types/template';
import { newField } from '../draft';
import { elementKind } from '../elementKinds';
import { fieldSettings } from '../FieldEditor';
import { generateDraftId } from '../model/ids';
import { primitiveSettings } from '../PrimitiveConfig';
import { fieldEditsFor, type NodeEdits } from '../session/useNodeEdits';
import type { GroupedSettings } from '../settings/groupedSettings';
import { listSettings, tableSettings } from './collections';
import { groupSettings, sectionSettings } from './containers';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

type NodeOf<T extends TemplateNodeType> = Extract<TemplateNode, { type: T }>;

/** What a settings builder gets besides its element. */
export interface SettingsContext {
    edits: NodeEdits;
    bindings: readonly DocumentBindingDescriptor[];
}

/** An entry of the "+" menu at an insertion slot. */
export interface PaletteEntry {
    key: string;
    label: { id: string; message: string };
    hint: { id: string; message: string };
    build(atRoot: boolean): TemplateNode;
}

/**
 * What the editor needs for one element type (spec 025, D8): its name in the outline and the
 * header, its settings, and the "+" menu entry that creates it, if any. Group and list kinds
 * (Section/Card, Entries/Table) are switched by `elementKinds.ts`.
 */
export interface ElementEditor<N extends TemplateNode> {
    /** The type as authors see it ("Rating", "Built-in"); groups and lists add their kind. */
    typeLabel: { id: string; message: string };
    /** What the outline, chips, and announcements call the element. */
    name(node: N): string | undefined;
    settings(node: N, context: SettingsContext): GroupedSettings;
    palette?: PaletteEntry;
}

function field<T extends TemplateField['type']>(type: T): ElementEditor<NodeOf<T>> {
    return {
        typeLabel: fieldTypes[type],
        name: (node) => (node as TemplateField).label,
        settings: (node, { edits, bindings }) => {
            const own = node as TemplateField;
            return fieldSettings({ bindings, callbacks: fieldEditsFor(edits, own.id), field: own });
        },
    };
}

/**
 * Every element type, once: a missing type fails the type check, and the add menu, the outline,
 * the settings panel, and announcements read this list.
 */
export const ELEMENT_EDITORS: { [T in TemplateNodeType]: ElementEditor<NodeOf<T>> } = {
    section: {
        typeLabel: editor.elementGroup,
        name: (node) => node.title,
        settings: (node, { edits }) => sectionSettings(node, edits),
        palette: {
            key: 'group',
            label: editor.paletteGroup,
            hint: editor.paletteGroupHint,
            // A group starts as a section on the page and as a card inside another group.
            build: (atRoot) =>
                atRoot
                    ? {
                          id: generateDraftId('sec'),
                          type: 'section',
                          title: translate(editor.paletteGroup),
                          children: [],
                      }
                    : {
                          id: generateDraftId('grp'),
                          type: 'group',
                          title: translate(editor.paletteGroup),
                          collapsible: false,
                          children: [],
                      },
        },
    },
    group: {
        typeLabel: editor.elementGroup,
        name: (node) => node.title,
        settings: (node, { edits }) => groupSettings(node, edits),
    },
    table: {
        typeLabel: editor.elementList,
        name: (node) => node.title,
        settings: (node, { edits }) => tableSettings(node, edits),
    },
    list: {
        typeLabel: editor.elementList,
        name: (node) => node.title ?? node.bindingKey ?? node.valueKey,
        settings: (node, { edits }) => listSettings(node, edits),
        palette: {
            key: 'list',
            label: editor.paletteList,
            hint: editor.paletteListHint,
            build: () => {
                const id = generateDraftId('lst');
                const title = translate(editor.paletteList);
                return {
                    id,
                    type: 'list',
                    title,
                    columns: 1,
                    valueKey: `${id}-entries`,
                    // Starts as the classic trait row; the author picks another entry type.
                    item: { ...legacyListItem({ id, title }), id: generateDraftId('f') },
                };
            },
        },
    },
    primitive: {
        typeLabel: fieldTypes.builtIn,
        name: (node) => node.label ?? node.bindingKey,
        settings: (node, { edits, bindings }) =>
            primitiveSettings({
                bindings,
                node,
                onUpdate: edits.onUpdate,
                onReplace: edits.onReplace,
            }),
    },
    text: {
        ...field('text'),
        palette: {
            key: 'field',
            label: editor.paletteField,
            hint: editor.paletteFieldHint,
            build: () => newField('text', translate(editor.paletteField)),
        },
    },
    number: field('number'),
    toggle: field('toggle'),
    select: field('select'),
    rating: field('rating'),
    resource: field('resource'),
    reference: field('reference'),
    image: field('image'),
    formula: field('formula'),
    tracker: {
        ...field('tracker'),
        palette: {
            key: 'tracker',
            label: editor.paletteTracker,
            hint: editor.paletteTrackerHint,
            // An own tracker; its Source setting switches it to a game's built-in track.
            build: () =>
                newField('tracker', translate(uiMessages.sheet.templates.tracker.defaultLabel)),
        },
    },
};

export function elementEditor<N extends TemplateNode>(node: N): ElementEditor<N> {
    return ELEMENT_EDITORS[node.type] as unknown as ElementEditor<N>;
}

/** The "+" menu in display order. */
export const PALETTE: readonly PaletteEntry[] = (
    ['section', 'text', 'list', 'tracker'] as const
).map((type) => ELEMENT_EDITORS[type].palette!);

export const KIND_NAMES = {
    section: editor.kindSection,
    card: editor.kindCard,
    entries: editor.kindEntries,
    table: editor.kindTable,
} as const;

/** The translated element type ("Group · Section", "List · Table", Rating, …). */
export function elementTypeLabel(node: TemplateNode): string {
    const label = translate(elementEditor(node).typeLabel);
    const kind = elementKind(node);
    return kind
        ? translate(editor.kindOf, { element: label, kind: translate(KIND_NAMES[kind.kind]) })
        : label;
}

/** The kind alone for groups and lists ("Section", "Table"), else the type label. */
export function elementTypeShort(node: TemplateNode): string {
    const kind = elementKind(node);
    return kind ? translate(KIND_NAMES[kind.kind]) : elementTypeLabel(node);
}

/** What the outline, chips, and announcements call an element. */
export function elementName(node: TemplateNode): string {
    return elementEditor(node).name(node) || '—';
}
