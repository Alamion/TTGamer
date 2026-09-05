import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { generateId } from '@site/src/shared/utils/random';

import {
    ConditionTrackBlock,
    CustomTraitsBlock,
    DocumentFieldsBlock,
    EditableTableBlock,
    ResourceBlock,
    TraitGroupsBlock,
} from '../../../components';
import type { FodderData } from '../../../systems';
import { FodderDataSchema, starWarsAttributeGroups } from '../../../systems/star-wars-wod';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';
import {
    conditionMembers,
    localizeAttributeLabel,
    localizedConditionTrack,
    TableInput,
    useCurrentDocument,
} from './StarWarsSheetSupport';

type AttackRow = FodderData['weapons'][number];

export function FodderSheet() {
    const { i18n } = useDocusaurusContext();
    const { document, updateDocumentData, updateDocumentMetadata } = useCurrentDocument();
    if (!document) return null;
    const data = FodderDataSchema.parse(document.data);
    const update = (next: FodderData) => updateDocumentData(document.id, () => next);
    const fields = uiMessages.sheet.documents.fields;
    const updateWeapon = (id: string, key: keyof AttackRow, value: string) =>
        update({
            ...data,
            weapons: data.weapons.map((weapon) =>
                weapon.id === id ? { ...weapon, [key]: value } : weapon
            ),
        });
    return (
        <div className="mx-auto grid max-w-7xl gap-8 p-4 lg:p-6">
            <DocumentFieldsBlock
                title={translate(fields.identity)}
                storageKey="fodderIdentity"
                fields={[
                    {
                        id: 'concept',
                        label: translate(fields.concept),
                        value: data.concept,
                        onChange: (concept) => {
                            update({ ...data, concept });
                            updateDocumentMetadata(document.id, { title: concept });
                        },
                    },
                    {
                        id: 'notes',
                        label: translate(fields.notes),
                        value: data.notes,
                        multiline: true,
                        onChange: (notes) => update({ ...data, notes }),
                    },
                ]}
                columns={2}
                docsPath="/docs/star-wars-wod-2e/gm/building-encounters"
            />
            <TraitGroupsBlock
                title={translate(fields.attributes)}
                storageKey="fodderAttributes"
                groups={starWarsAttributeGroups}
                values={data.attributes}
                defaultValue={DEFAULT_ATTRIBUTE_VALUE}
                onChange={(key, trait) =>
                    update({ ...data, attributes: { ...data.attributes, [key]: trait } })
                }
                localizeLabel={localizeAttributeLabel(i18n.currentLocale)}
            />
            <CustomTraitsBlock
                title={translate(fields.abilities)}
                storageKey="fodderAbilities"
                items={data.abilities}
                onChange={(abilities) => update({ ...data, abilities })}
                accentColor="secondary"
            />
            <ResourceBlock
                title={translate(fields.resources)}
                storageKey="fodderResources"
                currentLabel={translate(fields.current)}
                maximumLabel={translate(fields.maximum)}
                resources={[
                    {
                        id: 'willpower',
                        label: translate(fields.willpower),
                        current: data.willpower,
                        maximum: 10,
                        mode: 'rating',
                        onChange: (current) => update({ ...data, willpower: current }),
                    },
                ]}
            />
            <DocumentFieldsBlock
                title={translate(fields.armor)}
                storageKey="fodderArmor"
                fields={[
                    {
                        id: 'name',
                        label: translate(fields.armorType),
                        value: data.armor.name,
                        onChange: (name) => update({ ...data, armor: { ...data.armor, name } }),
                    },
                    {
                        id: 'rating',
                        label: translate(fields.armorRating),
                        value: data.armor.armorRating,
                        onChange: (armorRating) =>
                            update({ ...data, armor: { ...data.armor, armorRating } }),
                    },
                    {
                        id: 'dexterity',
                        label: translate(fields.dexterityModifier),
                        value: data.armor.dexterityModifier,
                        onChange: (dexterityModifier) =>
                            update({ ...data, armor: { ...data.armor, dexterityModifier } }),
                    },
                ]}
            />
            <EditableTableBlock<AttackRow>
                title={translate(fields.weapons)}
                storageKey="fodderWeapons"
                accentColor="secondary"
                items={data.weapons}
                addLabel={translate(fields.addWeapon)}
                emptyMessage={translate(fields.none)}
                onAdd={() =>
                    update({
                        ...data,
                        weapons: [
                            ...data.weapons,
                            { id: generateId(), name: '', type: '', damage: '', range: '' },
                        ],
                    })
                }
                onRemove={(id) =>
                    update({ ...data, weapons: data.weapons.filter((weapon) => weapon.id !== id) })
                }
                columns={(
                    [
                        ['name', fields.name],
                        ['damage', fields.damage],
                        ['range', fields.range],
                    ] as const
                ).map(([key, descriptor]) => ({
                    header: translate(descriptor),
                    render: (weapon: AttackRow) => (
                        <TableInput
                            ariaLabel={translate(descriptor)}
                            value={weapon[key as keyof AttackRow] ?? ''}
                            onChange={(value) =>
                                updateWeapon(weapon.id, key as keyof AttackRow, value)
                            }
                        />
                    ),
                }))}
            />
            <ConditionTrackBlock
                title={translate(fields.health)}
                storageKey="fodderHealth"
                track={localizedConditionTrack('health')}
                members={conditionMembers(data.members, 'health')}
                addMemberLabel={translate(fields.addMember)}
                removeMemberLabel={translate(fields.removeMember)}
                memberLabel={translate(fields.member)}
                onChange={(members) =>
                    update({
                        ...data,
                        members: members.map((member) => ({
                            id: member.id,
                            label: member.label,
                            health: { levels: member.levels },
                        })),
                    })
                }
                docsPath="/docs/star-wars-wod-2e/combat/health-damage-heal"
            />
        </div>
    );
}
