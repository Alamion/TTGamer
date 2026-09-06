import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { ComponentType } from 'react';

import { systemRegistry } from '../../../systems';
import type { SheetAccentColor } from '../../../systems/types';
import type { DocumentKind } from '../../../types/document';
import { AdvantagesBlock } from '../blocks/AdvantagesBlock';
import { AttributeBlock } from '../blocks/AttributeBlock';
import { BaseBlock } from '../blocks/BaseBlock';
import { BodyBlock } from '../blocks/BodyBlock';
import { ForceBlock } from '../blocks/ForceBlock';
import { OtherBlock } from '../blocks/OtherBlock';
import { SkillBlock } from '../blocks/SkillBlock';
import { BriefDocumentSheet } from '../views/BriefDocumentSheet';
import { CreatureSheet } from '../views/CreatureSheet';
import { FodderSheet } from '../views/FodderSheet';
import { VehicleSheet } from '../views/VehicleSheet';

interface BuiltInBlockProps {
    accentColor?: SheetAccentColor;
}

const builtInBlockRegistry: Readonly<Record<string, ComponentType<BuiltInBlockProps>>> = {
    advantages: AdvantagesBlock,
    attributes: AttributeBlock,
    base: BaseBlock,
    body: BodyBlock,
    force: ForceBlock,
    'brief-document': BriefDocumentSheet,
    other: OtherBlock,
    skills: SkillBlock,
    'star-wars-creature-sheet': CreatureSheet,
    'star-wars-fodder-sheet': FodderSheet,
    'star-wars-vehicle-sheet': VehicleSheet,
};

export function getBuiltInSheetBlock(blockId: string) {
    return builtInBlockRegistry[blockId];
}

/**
 * Block → document kinds that register it, derived from the system's views. A ready-made block
 * is only compatible with the kinds whose views use it (a fodder page part must never render
 * character data, and vice versa).
 */
function blockKinds(systemId: string, blockId: string): ReadonlySet<string> {
    const kinds = new Set<string>();
    for (const definition of systemRegistry.getSystem(systemId)?.documents ?? []) {
        for (const view of definition.views) {
            if (
                view.layout.type === 'built-in' &&
                view.layout.blocks.some((placement) => placement.id === blockId)
            ) {
                kinds.add(definition.kind);
            }
        }
    }
    return kinds;
}

/** FR-4: availability is system- AND kind-scoped. */
export function isBuiltInBlockAvailable(
    systemId: string,
    blockId: string,
    documentKind: DocumentKind | string
): boolean {
    return (
        builtInBlockRegistry[blockId] !== undefined &&
        blockKinds(systemId, blockId).has(documentKind)
    );
}

/** Editor block-picker listing: available ready-made blocks with their own (block) names. */
export function listBuiltInBlocks(
    systemId: string,
    documentKind: DocumentKind | string
): ReadonlyArray<{ id: string; label: { id: string; message: string } }> {
    const blockLabels = uiMessages.sheet.templates.builtInBlocks as Record<
        string,
        { id: string; message: string }
    >;
    const labels = new Map<string, { id: string; message: string }>();
    for (const definition of systemRegistry.getSystem(systemId)?.documents ?? []) {
        if (definition.kind !== documentKind) continue;
        for (const view of definition.views) {
            if (view.layout.type !== 'built-in') continue;
            for (const placement of view.layout.blocks) {
                const label = blockLabels[placement.id];
                if (builtInBlockRegistry[placement.id] && label && !labels.has(placement.id)) {
                    labels.set(placement.id, label);
                }
            }
        }
    }
    return [...labels.entries()].map(([id, label]) => ({ id, label }));
}

/** Accent is automatic (user review 2026-09-05): primary → secondary by element parity. */
export function blockAccentColor(index: number): SheetAccentColor {
    return index % 2 === 0 ? 'primary' : 'secondary';
}
