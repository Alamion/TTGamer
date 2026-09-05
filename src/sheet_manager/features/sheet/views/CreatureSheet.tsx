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
import type { CreatureData } from '../../../systems';
import {
    CombatScaleSchema,
    CreatureDataSchema,
    starWarsAttributeGroups,
} from '../../../systems/star-wars-wod';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';
import {
    conditionMembers,
    localizeAttributeLabel,
    localizedConditionTrack,
    scaleOptions,
    TableInput,
    useCurrentDocument,
} from './StarWarsSheetSupport';

type AttackRow = CreatureData['attacks'][number];

export function CreatureSheet() {
    const { i18n } = useDocusaurusContext();
    const { document, updateDocumentData, updateDocumentMetadata } = useCurrentDocument();
    if (!document) return null;
    const data = CreatureDataSchema.parse(document.data);
    const update = (next: CreatureData) => updateDocumentData(document.id, () => next);
    const fields = uiMessages.sheet.documents.fields;
    const physicalMentalGroups = starWarsAttributeGroups.filter(({ id }) => id !== 'social');
    const updateAttack = (id: string, key: keyof AttackRow, value: string) =>
        update({
            ...data,
            attacks: data.attacks.map((attack) =>
                attack.id === id ? { ...attack, [key]: value } : attack
            ),
        });
    return (
        <div className="mx-auto grid max-w-7xl gap-8 p-4 lg:p-6">
            <DocumentFieldsBlock
                title={translate(fields.identity)}
                storageKey="creatureIdentity"
                docsPath="/docs/star-wars-wod-2e/creatures/mechanics"
                fields={[
                    {
                        id: 'name',
                        label: translate(fields.name),
                        value: data.name,
                        onChange: (name) => {
                            update({ ...data, name });
                            updateDocumentMetadata(document.id, { title: name || data.species });
                        },
                    },
                    {
                        id: 'species',
                        label: translate(fields.species),
                        value: data.species,
                        onChange: (species) => update({ ...data, species }),
                    },
                    {
                        id: 'type',
                        label: translate(fields.type),
                        value: data.type,
                        onChange: (type) => update({ ...data, type }),
                    },
                    {
                        id: 'scale',
                        label: translate(fields.scale),
                        value: data.scale,
                        options: scaleOptions(),
                        onChange: (scale) =>
                            update({ ...data, scale: CombatScaleSchema.parse(scale) }),
                    },
                    {
                        id: 'size',
                        label: translate(fields.size),
                        value: data.size,
                        onChange: (size) => update({ ...data, size }),
                    },
                    {
                        id: 'owner',
                        label: translate(fields.owner),
                        value: data.owner,
                        onChange: (owner) => update({ ...data, owner }),
                    },
                ]}
            />
            <TraitGroupsBlock
                title={translate(fields.attributes)}
                storageKey="creatureAttributes"
                groups={physicalMentalGroups}
                values={data.attributes}
                defaultValue={DEFAULT_ATTRIBUTE_VALUE}
                onChange={(key, trait) =>
                    update({ ...data, attributes: { ...data.attributes, [key]: trait } })
                }
                localizeLabel={localizeAttributeLabel(i18n.currentLocale)}
                docsPath="/docs/star-wars-wod-2e/creatures/mechanics"
            />
            <CustomTraitsBlock
                title={translate(fields.abilities)}
                storageKey="creatureAbilities"
                items={data.abilities}
                onChange={(abilities) => update({ ...data, abilities })}
                accentColor="secondary"
                docsPath="/docs/star-wars-wod-2e/creatures/mechanics"
            />
            <ResourceBlock
                title={translate(fields.resources)}
                storageKey="creatureResources"
                currentLabel={translate(fields.current)}
                maximumLabel={translate(fields.maximum)}
                resources={[
                    {
                        id: 'willpower',
                        label: translate(fields.willpower),
                        current: data.willpower.current,
                        maximum: data.willpower.max,
                        onChange: (current, max) =>
                            update({ ...data, willpower: { current, max } }),
                    },
                ]}
            />
            <DocumentFieldsBlock
                title={translate(fields.armor)}
                storageKey="creatureArmor"
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
                docsPath="/docs/star-wars-wod-2e/creatures/mechanics"
            />
            <EditableTableBlock
                title={translate(fields.attacks)}
                storageKey="creatureAttacks"
                accentColor="secondary"
                items={data.attacks}
                addLabel={translate(fields.addAttack)}
                emptyMessage={translate(fields.none)}
                onAdd={() =>
                    update({
                        ...data,
                        attacks: [
                            ...data.attacks,
                            { id: generateId(), name: '', type: '', damage: '', range: '' },
                        ],
                    })
                }
                onRemove={(id) =>
                    update({ ...data, attacks: data.attacks.filter((attack) => attack.id !== id) })
                }
                columns={[
                    {
                        header: translate(fields.name),
                        render: (attack) => (
                            <TableInput
                                ariaLabel={translate(fields.name)}
                                value={attack.name}
                                onChange={(value) => updateAttack(attack.id, 'name', value)}
                            />
                        ),
                    },
                    {
                        header: translate(fields.attackType),
                        render: (attack) => (
                            <TableInput
                                ariaLabel={translate(fields.attackType)}
                                value={attack.type}
                                onChange={(value) => updateAttack(attack.id, 'type', value)}
                            />
                        ),
                    },
                    {
                        header: translate(fields.damage),
                        render: (attack) => (
                            <TableInput
                                ariaLabel={translate(fields.damage)}
                                value={attack.damage}
                                onChange={(value) => updateAttack(attack.id, 'damage', value)}
                            />
                        ),
                    },
                    {
                        header: translate(fields.range),
                        render: (attack) => (
                            <TableInput
                                ariaLabel={translate(fields.range)}
                                value={attack.range ?? ''}
                                onChange={(value) => updateAttack(attack.id, 'range', value)}
                            />
                        ),
                    },
                ]}
            />
            <ConditionTrackBlock
                title={translate(fields.health)}
                storageKey="creatureHealth"
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
            <DocumentFieldsBlock
                title={translate(fields.notes)}
                storageKey="creatureNotes"
                columns={1}
                fields={[
                    {
                        id: 'notes',
                        label: translate(fields.notes),
                        value: data.notes,
                        multiline: true,
                        onChange: (notes) => update({ ...data, notes }),
                    },
                ]}
            />
        </div>
    );
}
