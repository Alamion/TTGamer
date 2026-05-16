import { SheetLayout } from './SheetLayout';
import { BaseBlock } from './BaseBlock';
import { AttributeBlock } from './AttributeBlock';
import { SkillBlock } from './SkillBlock';
import { AdvantagesBlock } from './AdvantagesBlock';
import { PowerBlock } from './PowerBlock';
import { BodyBlock } from './BodyBlock';
import { OtherBlock } from './OtherBlock';
import type { AccentColor } from '../../../components/shared';

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
                <PowerBlock accentColor={BLOCK_ACCENT_COLORS[4]} />
                <BodyBlock accentColor={BLOCK_ACCENT_COLORS[5]} />
                <OtherBlock accentColor={BLOCK_ACCENT_COLORS[6]} />
            </div>
        </SheetLayout>
    );
}
