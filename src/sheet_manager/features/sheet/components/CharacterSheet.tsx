import { SheetLayout } from './SheetLayout';
import { BaseBlock } from './BaseBlock';
import { AttributeBlock } from './AttributeBlock';
import { SkillBlock } from './SkillBlock';
import { AdvantagesBlock } from './AdvantagesBlock';
import { ForceBlock } from './ForceBlock';
import { BodyBlock } from './BodyBlock';
import { OtherBlock } from './OtherBlock';

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
