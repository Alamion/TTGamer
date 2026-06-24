import { SheetLayout } from './SheetLayout.tsx';
import { BaseBlock } from './BaseBlock.tsx';
import { AttributeBlock } from './AttributeBlock.tsx';
import { SkillBlock } from './SkillBlock.tsx';
import { AdvantagesBlock } from './AdvantagesBlock.tsx';
import { ForceBlock } from './ForceBlock.tsx';
import { BodyBlock } from './BodyBlock.tsx';
import { OtherBlock } from './OtherBlock.tsx';

export function CharacterSheet() {
    return (
        <SheetLayout>
            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                <BaseBlock accentColor="primary" />
                <AttributeBlock accentColor="secondary" />
                <SkillBlock accentColor="primary" />
                <AdvantagesBlock accentColor="secondary" />
                <ForceBlock accentColor="primary" />
                <BodyBlock accentColor="secondary" />
                <OtherBlock accentColor="primary" />
            </div>
        </SheetLayout>
    );
}
