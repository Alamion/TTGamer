import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { FodderData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import type { ConditionMark } from '@site/src/sheet_manager/types/character';

export const EMPTY: ConditionMark[] = [
    'empty',
    'empty',
    'empty',
    'empty',
    'empty',
    'empty',
    'empty',
];

export function template(id: string) {
    return systemRegistry.getSystem('star-wars-wod')!.defaultTemplates!.find((t) => t.id === id)!;
}

export function seed(data: unknown, kind: string, definitionId: string) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-cohort',
                kind,
                systemId: 'star-wars-wod',
                definitionId,
                schemaVersion: 1,
                metadata: { title: 'Squad', tags: [] },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: 'doc-cohort',
    });
}

export const storedData = () => useDocumentStore.getState().documents[0]!.data as FodderData;

export function trackOnly(id: string, node = 'damage-track') {
    const source = template(id);
    const found: typeof source.children = [];
    const walk = (nodes: typeof source.children) => {
        for (const child of nodes) {
            if (child.id === node) found.push(child);
            if (child.type === 'section' || child.type === 'group') walk(child.children);
        }
    };
    walk(source.children);
    return { ...source, children: found };
}
