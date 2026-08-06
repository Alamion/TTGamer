import { AdvantagesBlock } from './AdvantagesBlock';
import { AttributeBlock } from './AttributeBlock';
import { BaseBlock } from './BaseBlock';
import { BodyBlock } from './BodyBlock';
import { ForceBlock } from './ForceBlock';
import { OtherBlock } from './OtherBlock';
import { SheetLayout } from './SheetLayout';
import { SkillBlock } from './SkillBlock';

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
