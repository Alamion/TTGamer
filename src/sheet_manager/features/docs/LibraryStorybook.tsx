import { type ReactNode, useMemo } from 'react';

import { TickBox, type TickValue } from '../../components/dialogs/library/TickBox';
import { TreeRow, type TreeRowProps } from '../../components/dialogs/library/TreeRow';
import { systemRegistry } from '../../systems';
import type { UserDocumentType, UserSetting } from '../../systems/userTypes';
import { CustomTemplateSchema } from '../../types/template';
import {
    buildLibraryTree,
    countDocuments,
    findNode,
    type LibraryNode,
} from '../sheet/data/libraryTree';

const STAMP = '2026-09-26T00:00:00.000Z';
const SETTING: UserSetting = {
    id: 'user-setting-story001',
    name: 'Ashen Realms',
    description: 'A burnt city after the Second Inquisition',
    systemId: 'wod-v5' as UserSetting['systemId'],
    pages: {},
    createdAt: STAMP,
    updatedAt: STAMP,
};
const TYPE: UserDocumentType = {
    id: 'user-story001',
    name: 'Cult',
    owner: { settingId: SETTING.id },
    defaultTemplateId: 'tpl-story001',
    createdAt: STAMP,
    updatedAt: STAMP,
};
const PAGE = CustomTemplateSchema.parse({
    id: 'tpl-story001',
    name: 'Cult card',
    systemId: 'wod-v5',
    documentKind: TYPE.id,
    schemaVersion: 3,
    children: [{ id: 'motto', type: 'text', label: 'Motto' }],
});

/** A sample library built like the real one, never read from or written to the stores. */
function useSampleTree() {
    return useMemo(() => {
        const shipped = systemRegistry
            .getSystem('star-wars-wod')
            ?.defaultTemplates?.find(({ id }) => id === 'full-sheet');
        return buildLibraryTree({
            registry: systemRegistry,
            types: { [TYPE.id]: TYPE },
            settings: {
                [SETTING.id]: SETTING,
                'user-setting-story002': {
                    ...SETTING,
                    id: 'user-setting-story002',
                    name: 'Far Future',
                    systemId: 'wod-9e' as UserSetting['systemId'],
                },
            },
            templates: [PAGE],
            defaultOverrides: shipped
                ? { 'star-wars-wod:full-sheet': { ...shipped, name: 'Edited full sheet' } }
                : {},
            defaultPages: {},
            counts: countDocuments([]),
        });
    }, []);
}

function Story({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-1" data-library-story={title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                {title}
            </p>
            <div role="tree" aria-label={title} className="rounded border border-border p-1">
                {children}
            </div>
        </div>
    );
}

const noop = () => undefined;

function Row({
    node,
    depth,
    ...rest
}: { node: LibraryNode | undefined; depth: number } & Partial<TreeRowProps>) {
    if (!node) return null;
    return (
        <TreeRow
            node={node}
            depth={depth}
            setSize={1}
            position={1}
            expanded={false}
            selected={false}
            tabbable={false}
            onSelect={noop}
            onToggle={noop}
            onMenu={noop}
            onKeyDown={noop}
            {...rest}
        />
    );
}

const TICKS: Array<{ title: string; value: TickValue; auto?: boolean; disabled?: boolean }> = [
    { title: 'unchecked', value: 'unchecked' },
    { title: 'checked', value: 'checked' },
    { title: 'partial', value: 'partial' },
    { title: 'added automatically (tertiary)', value: 'unchecked', auto: true },
    { title: 'not selectable', value: 'unchecked', disabled: true },
];

/**
 * Library rows and ticks for the dev storybook (constitution VI): every row state of the tree
 * (spec 013) and every export/import box state.
 */
export function LibraryStorybook() {
    const tree = useSampleTree();
    const node = (key: string) => findNode(tree, key)?.node;
    return (
        <div className="space-y-4">
            <Story title="levels">
                <Row node={node('r:wod-v5')} depth={1} expanded />
                <Row node={node('s:rules:wod-v5')} depth={2} />
                <Row node={node(`s:user:${SETTING.id}`)} depth={2} expanded />
                <Row node={node(`t:user:${TYPE.id}`)} depth={3} expanded />
                <Row node={node(`p:user:${PAGE.id}`)} depth={4} />
            </Story>
            <Story title="states">
                <Row node={node(`s:user:${SETTING.id}`)} depth={2} selected tabbable />
                <Row node={node('p:star-wars-wod:full-sheet')} depth={4} />
                <Row node={node(`t:user:${TYPE.id}`)} depth={3} flash />
                <Row
                    node={node(`s:user:${SETTING.id}`)}
                    depth={2}
                    drag={{ draggable: true, over: true }}
                />
                <Row node={node('s:user:user-setting-story002')} depth={2} />
            </Story>
            <Story title="ticks">
                {TICKS.map(({ title, value, auto, disabled }) => (
                    <div key={title} className="flex items-center gap-2 p-1 text-sm">
                        <TickBox
                            value={value}
                            auto={auto}
                            disabled={disabled}
                            label={title}
                            onToggle={noop}
                        />
                        <span className="text-textPrimary">{title}</span>
                    </div>
                ))}
            </Story>
        </div>
    );
}
