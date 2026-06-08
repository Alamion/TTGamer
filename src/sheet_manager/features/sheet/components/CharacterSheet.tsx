import { SheetLayout } from './SheetLayout.tsx';
import { BaseBlock } from './BaseBlock.tsx';
import { AttributeBlock } from './AttributeBlock.tsx';
import { SkillBlock } from './SkillBlock.tsx';
import { AdvantagesBlock } from './AdvantagesBlock.tsx';
import { ForceBlock } from './ForceBlock.tsx';
import { BodyBlock } from './BodyBlock.tsx';
import { OtherBlock } from './OtherBlock.tsx';
import type { AccentColor } from '../../../components';

const BLOCK_ACCENT_COLORS: AccentColor[] = [
    'primary',
    'secondary',
    'primary',
    'secondary',
    'primary',
    'secondary',
    'primary',
];

export function CharacterSheet() {
    return (
        <SheetLayout>
            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                <BaseBlock accentColor={BLOCK_ACCENT_COLORS[0]} />
                <AttributeBlock accentColor={BLOCK_ACCENT_COLORS[1]} />
                <SkillBlock accentColor={BLOCK_ACCENT_COLORS[2]} />
                <AdvantagesBlock accentColor={BLOCK_ACCENT_COLORS[3]} />
                <ForceBlock accentColor={BLOCK_ACCENT_COLORS[4]} />
                <BodyBlock accentColor={BLOCK_ACCENT_COLORS[5]} />
                <OtherBlock accentColor={BLOCK_ACCENT_COLORS[6]} />
            </div>
        </SheetLayout>
    );
}
