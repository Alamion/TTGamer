import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { generateId } from '@site/src/shared/utils/random';

import {
    ConditionTrackBlock,
    DocumentFieldsBlock,
    EditableTableBlock,
    TraitGroupsBlock,
} from '../../../components';
import type { VehicleData } from '../../../systems';
import {
    CombatScaleSchema,
    starWarsVehicleSystems,
    VehicleDataSchema,
} from '../../../systems/star-wars-wod';
import type { TraitValue } from '../../../types/character';
import { DEFAULT_SKILL_VALUE } from '../../../types/character';
import {
    conditionMembers,
    localizedConditionTrack,
    scaleOptions,
    TableInput,
    useCurrentDocument,
} from './StarWarsSheetSupport';

type VehicleWeaponRow = VehicleData['weapons'][number];
type ConfigurationRow = VehicleData['configuration'][number];

const vehicleSystemKeys: Record<string, keyof VehicleData> = {
    Durability: 'durability',
    Maneuverability: 'maneuverability',
    'Communications / Sensors': 'communicationsSensors',
    Hyperdrive: 'hyperdrive',
    Shields: 'shields',
    'Front Shields': 'frontShields',
    'Rear Shields': 'rearShields',
};

export function VehicleSheet() {
    const { document, updateDocumentData, updateDocumentMetadata } = useCurrentDocument();
    if (!document) return null;
    const data = VehicleDataSchema.parse(document.data);
    const update = (next: VehicleData) => updateDocumentData(document.id, () => next);
    const fields = uiMessages.sheet.documents.fields;
    const values = Object.fromEntries(
        starWarsVehicleSystems.traits.map(({ key }) => [
            key,
            { value: Number(data[vehicleSystemKeys[key]]) },
        ])
    ) as Record<string, TraitValue>;
    const updateConfiguration = (id: string, value: string) =>
        update({
            ...data,
            configuration: data.configuration.map((item) =>
                item.id === id ? { ...item, label: value } : item
            ),
        });
    const updateWeapon = (id: string, key: keyof VehicleWeaponRow, value: string) =>
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
                storageKey="vehicleIdentity"
                docsPath="/docs/star-wars-wod-2e/vehicles-mechanisms/traits-systems"
                fields={[
                    {
                        id: 'name',
                        label: translate(fields.name),
                        value: data.name,
                        onChange: (name) => {
                            update({ ...data, name });
                            updateDocumentMetadata(document.id, { title: name });
                        },
                    },
                    {
                        id: 'model',
                        label: translate(fields.model),
                        value: data.model,
                        onChange: (model) => update({ ...data, model }),
                    },
                    {
                        id: 'owner',
                        label: translate(fields.owner),
                        value: data.owner,
                        onChange: (owner) => update({ ...data, owner }),
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
                        id: 'crew',
                        label: translate(fields.crew),
                        value: data.crew,
                        onChange: (crew) => update({ ...data, crew }),
                    },
                    {
                        id: 'length',
                        label: translate(fields.length),
                        value: data.length,
                        onChange: (length) => update({ ...data, length }),
                    },
                    {
                        id: 'cargo',
                        label: translate(fields.cargoCapacity),
                        value: data.cargoCapacity,
                        onChange: (cargoCapacity) => update({ ...data, cargoCapacity }),
                    },
                    {
                        id: 'passengers',
                        label: translate(fields.passengers),
                        value: data.passengers,
                        onChange: (passengers) => update({ ...data, passengers }),
                    },
                    {
                        id: 'consumables',
                        label: translate(fields.consumables),
                        value: data.consumables,
                        onChange: (consumables) => update({ ...data, consumables }),
                    },
                ]}
            />
            <TraitGroupsBlock
                title={translate(fields.systems)}
                storageKey="vehicleSystems"
                groups={[starWarsVehicleSystems]}
                values={values}
                defaultValue={DEFAULT_SKILL_VALUE}
                onChange={(key, trait) =>
                    update({ ...data, [vehicleSystemKeys[key]]: trait.value })
                }
                accentColor="secondary"
                docsPath="/docs/star-wars-wod-2e/vehicles-mechanisms/traits-systems"
            />
            <DocumentFieldsBlock
                title={translate(fields.movementAndNavigation)}
                storageKey="vehicleMovement"
                fields={[
                    {
                        id: 'speed',
                        label: translate(fields.speed),
                        value: data.speed,
                        onChange: (speed) => update({ ...data, speed }),
                    },
                    {
                        id: 'altitude',
                        label: translate(fields.altitude),
                        value: data.altitude,
                        onChange: (altitude) => update({ ...data, altitude }),
                    },
                    {
                        id: 'sensor-range',
                        label: translate(fields.sensorRange),
                        value: data.sensorRange,
                        onChange: (sensorRange) => update({ ...data, sensorRange }),
                    },
                    {
                        id: 'nav-computer',
                        label: translate(fields.navigationComputer),
                        value: data.navigationComputer,
                        onChange: (navigationComputer) => update({ ...data, navigationComputer }),
                    },
                ]}
                columns={2}
            />
            <EditableTableBlock<ConfigurationRow>
                title={translate(fields.configuration)}
                storageKey="vehicleConfiguration"
                items={data.configuration}
                addLabel={translate(fields.addRow)}
                emptyMessage={translate(fields.none)}
                onAdd={() =>
                    update({
                        ...data,
                        configuration: [...data.configuration, { id: generateId(), label: '' }],
                    })
                }
                onRemove={(id) =>
                    update({
                        ...data,
                        configuration: data.configuration.filter((item) => item.id !== id),
                    })
                }
                columns={[
                    {
                        header: translate(fields.label),
                        render: (item) => (
                            <TableInput
                                ariaLabel={translate(fields.label)}
                                value={item.label}
                                onChange={(value) => updateConfiguration(item.id, value)}
                            />
                        ),
                    },
                ]}
                docsPath="/docs/star-wars-wod-2e/vehicles-mechanisms/modifications"
            />
            <EditableTableBlock<VehicleWeaponRow>
                title={translate(fields.weapons)}
                storageKey="vehicleWeapons"
                accentColor="secondary"
                items={data.weapons}
                addLabel={translate(fields.addWeapon)}
                emptyMessage={translate(fields.none)}
                onAdd={() =>
                    update({
                        ...data,
                        weapons: [
                            ...data.weapons,
                            {
                                id: generateId(),
                                name: '',
                                type: '',
                                damage: '',
                                range: '',
                                arc: '',
                            },
                        ],
                    })
                }
                onRemove={(id) =>
                    update({ ...data, weapons: data.weapons.filter((weapon) => weapon.id !== id) })
                }
                columns={(
                    [
                        ['name', fields.name],
                        ['arc', fields.arc],
                        ['range', fields.range],
                        ['damage', fields.damage],
                    ] as const
                ).map(([key, descriptor]) => ({
                    header: translate(descriptor),
                    render: (weapon: VehicleWeaponRow) => (
                        <TableInput
                            ariaLabel={translate(descriptor)}
                            value={weapon[key as keyof VehicleWeaponRow] ?? ''}
                            onChange={(value) =>
                                updateWeapon(weapon.id, key as keyof VehicleWeaponRow, value)
                            }
                        />
                    ),
                }))}
                docsPath="/docs/star-wars-wod-2e/vehicles-mechanisms/space-combat"
            />
            <ConditionTrackBlock
                title={translate(fields.damage)}
                storageKey="vehicleDamage"
                track={localizedConditionTrack('vehicle-damage')}
                members={conditionMembers(data.members, 'damage')}
                addMemberLabel={translate(fields.addMember)}
                removeMemberLabel={translate(fields.removeMember)}
                memberLabel={translate(fields.member)}
                onChange={(members) =>
                    update({
                        ...data,
                        members: members.map((member) => ({
                            id: member.id,
                            label: member.label,
                            damage: { levels: member.levels },
                        })),
                    })
                }
                docsPath="/docs/star-wars-wod-2e/vehicles-mechanisms/durability-damage-repair"
            />
            <DocumentFieldsBlock
                title={translate(fields.notes)}
                storageKey="vehicleNotes"
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
