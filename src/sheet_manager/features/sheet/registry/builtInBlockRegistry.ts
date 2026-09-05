import type { ComponentType } from 'react';

import type { SheetAccentColor } from '../../../systems/types';
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
