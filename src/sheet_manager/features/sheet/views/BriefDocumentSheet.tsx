import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    CompactConditionTrack,
    CompactRating,
    CompactSectionHeading,
    CompactTextField,
} from '../../../components';
import type { CreatureData, FodderData, VehicleData } from '../../../systems';
import { systemRegistry } from '../../../systems';
import {
    CreatureDataSchema,
    FodderDataSchema,
    starWarsAttributeGroups,
    starWarsVehicleSystems,
    starWarsWodProfile,
    VehicleDataSchema,
} from '../../../systems/star-wars-wod';
import { getWodConditionTrack } from '../../../systems/wod-like';
import type { ConditionMark, CustomSkill, TraitValue } from '../../../types/character';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';
import { BriefCharacterSheet } from './BriefCharacterSheet';
import { useCurrentDocument } from './StarWarsSheetSupport';

interface BriefShellProps {
    identity: Array<{
        id: string;
        label: string;
        value: string;
        onChange: (value: string) => void;
    }>;
    children: React.ReactNode;
}

function BriefShell({ children, identity }: BriefShellProps) {
    return (
        <article className="mx-auto my-5 max-w-6xl overflow-hidden rounded-xl border border-border bg-bgSurface text-textPrimary shadow-md">
            <header className="border-b border-border bg-bgBase/60 px-4 py-3 sm:px-5">
                <h1 className="mb-3 text-lg font-bold tracking-wide">
                    {translate(uiMessages.sheet.documents.views.brief)}
                </h1>
                <div className="grid gap-3 sm:grid-cols-3">
                    {identity.map((field) => (
                        <CompactTextField key={field.id} disabled={false} {...field} />
                    ))}
                </div>
            </header>
            <div className="grid gap-4 p-4 sm:p-5">{children}</div>
        </article>
    );
}

interface TraitGridProps {
    groups: typeof starWarsAttributeGroups;
    values: Record<string, TraitValue>;
    onChange: (key: string, value: TraitValue) => void;
}

function TraitGrid({ groups, onChange, values }: TraitGridProps) {
    return (
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {groups.map((group) => (
                <div key={group.id} className="grid content-start gap-1.5">
                    {group.traits.map((definition) => {
                        const trait = values[definition.key] ?? DEFAULT_ATTRIBUTE_VALUE;
                        return (
                            <CompactRating
                                key={definition.key}
                                label={definition.label}
                                value={trait.value}
                                max={definition.maximum}
                                disabled={false}
                                onChange={(value) => onChange(definition.key, { ...trait, value })}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function CustomRatingGrid({
    items,
    onChange,
}: {
    items: CustomSkill[];
    onChange: (items: CustomSkill[]) => void;
}) {
    return (
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {items.map((item) => (
                <CompactRating
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    disabled={false}
                    onChange={(value) =>
                        onChange(
                            items.map((candidate) =>
                                candidate.id === item.id ? { ...candidate, value } : candidate
                            )
                        )
                    }
                />
            ))}
        </div>
    );
}

function localizedConditionLevels(kind: 'health' | 'vehicle-damage') {
    const fields = uiMessages.sheet.documents.fields;
    const labels = kind === 'health' ? fields.healthLevels : fields.damageLevels;
    return getWodConditionTrack(starWarsWodProfile, kind).levels.map((level) => ({
        ...level,
        label: translate(labels[level.id as keyof typeof labels]),
    }));
}

function CohortConditionTracks({
    kind,
    members,
    onChange,
}: {
    kind: 'health' | 'vehicle-damage';
    members: Array<{ id: string; label: string; levels: ConditionMark[] }>;
    onChange: (id: string, levels: ConditionMark[]) => void;
}) {
    const fields = uiMessages.sheet.documents.fields;
    return (
        <section>
            <CompactSectionHeading>
                {translate(kind === 'health' ? fields.health : fields.damage)}
            </CompactSectionHeading>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {members.map((member) => (
                    <div key={member.id} className="rounded border border-border p-3">
                        {members.length > 1 && (
                            <h3 className="mb-2 text-xs font-semibold text-textSecondary">
                                {member.label}
                            </h3>
                        )}
                        <CompactConditionTrack
                            disabled={false}
                            levels={localizedConditionLevels(kind)}
                            marks={member.levels}
                            onChange={(levels) => onChange(member.id, levels)}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}

function CreatureBrief({
    data,
    update,
    updateTitle,
}: {
    data: CreatureData;
    update: (data: CreatureData) => void;
    updateTitle: (title: string) => void;
}) {
    const fields = uiMessages.sheet.documents.fields;
    const groups = starWarsAttributeGroups.filter(({ id }) => id !== 'social');
    return (
        <BriefShell
            identity={[
                {
                    id: 'name',
                    label: translate(fields.name),
                    value: data.name,
                    onChange: (name) => {
                        update({ ...data, name });
                        updateTitle(name);
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
            ]}
        >
            <section>
                <CompactSectionHeading>{translate(fields.attributes)}</CompactSectionHeading>
                <TraitGrid
                    groups={groups}
                    values={data.attributes}
                    onChange={(key, trait) =>
                        update({ ...data, attributes: { ...data.attributes, [key]: trait } })
                    }
                />
            </section>
            <section>
                <CompactSectionHeading>{translate(fields.abilities)}</CompactSectionHeading>
                <CustomRatingGrid
                    items={data.abilities}
                    onChange={(abilities) => update({ ...data, abilities })}
                />
            </section>
            <CohortConditionTracks
                kind="health"
                members={data.members.map((member) => ({
                    id: member.id,
                    label: member.label,
                    levels: member.health.levels,
                }))}
                onChange={(id, levels) =>
                    update({
                        ...data,
                        members: data.members.map((member) =>
                            member.id === id ? { ...member, health: { levels } } : member
                        ),
                    })
                }
            />
        </BriefShell>
    );
}

const vehicleSystemKeys: Record<string, keyof VehicleData> = {
    Durability: 'durability',
    Maneuverability: 'maneuverability',
    'Communications / Sensors': 'communicationsSensors',
    Hyperdrive: 'hyperdrive',
    Shields: 'shields',
    'Front Shields': 'frontShields',
    'Rear Shields': 'rearShields',
};

function VehicleBrief({
    data,
    update,
    updateTitle,
}: {
    data: VehicleData;
    update: (data: VehicleData) => void;
    updateTitle: (title: string) => void;
}) {
    const fields = uiMessages.sheet.documents.fields;
    const values = Object.fromEntries(
        starWarsVehicleSystems.traits.map(({ key }) => [
            key,
            { value: Number(data[vehicleSystemKeys[key]]) },
        ])
    ) as Record<string, TraitValue>;
    return (
        <BriefShell
            identity={[
                {
                    id: 'name',
                    label: translate(fields.name),
                    value: data.name,
                    onChange: (name) => {
                        update({ ...data, name });
                        updateTitle(name);
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
            ]}
        >
            <section>
                <CompactSectionHeading>{translate(fields.systems)}</CompactSectionHeading>
                <TraitGrid
                    groups={[starWarsVehicleSystems]}
                    values={values}
                    onChange={(key, trait) =>
                        update({ ...data, [vehicleSystemKeys[key]]: trait.value })
                    }
                />
            </section>
            <CohortConditionTracks
                kind="vehicle-damage"
                members={data.members.map((member) => ({
                    id: member.id,
                    label: member.label,
                    levels: member.damage.levels,
                }))}
                onChange={(id, levels) =>
                    update({
                        ...data,
                        members: data.members.map((member) =>
                            member.id === id ? { ...member, damage: { levels } } : member
                        ),
                    })
                }
            />
        </BriefShell>
    );
}

function FodderBrief({
    data,
    update,
    updateTitle,
}: {
    data: FodderData;
    update: (data: FodderData) => void;
    updateTitle: (title: string) => void;
}) {
    const fields = uiMessages.sheet.documents.fields;
    return (
        <BriefShell
            identity={[
                {
                    id: 'concept',
                    label: translate(fields.concept),
                    value: data.concept,
                    onChange: (concept) => {
                        update({ ...data, concept });
                        updateTitle(concept);
                    },
                },
                {
                    id: 'notes',
                    label: translate(fields.notes),
                    value: data.notes,
                    onChange: (notes) => update({ ...data, notes }),
                },
            ]}
        >
            <section>
                <CompactSectionHeading>{translate(fields.attributes)}</CompactSectionHeading>
                <TraitGrid
                    groups={starWarsAttributeGroups}
                    values={data.attributes}
                    onChange={(key, trait) =>
                        update({ ...data, attributes: { ...data.attributes, [key]: trait } })
                    }
                />
            </section>
            <section>
                <CompactSectionHeading>{translate(fields.abilities)}</CompactSectionHeading>
                <CustomRatingGrid
                    items={data.abilities}
                    onChange={(abilities) => update({ ...data, abilities })}
                />
            </section>
            <CohortConditionTracks
                kind="health"
                members={data.members.map((member) => ({
                    id: member.id,
                    label: member.label,
                    levels: member.health.levels,
                }))}
                onChange={(id, levels) =>
                    update({
                        ...data,
                        members: data.members.map((member) =>
                            member.id === id ? { ...member, health: { levels } } : member
                        ),
                    })
                }
            />
        </BriefShell>
    );
}

export function BriefDocumentSheet() {
    const { document, updateDocumentData, updateDocumentMetadata } = useCurrentDocument();
    if (!document) return null;

    // Definitions with a character capability share the character brief organism.
    const definition = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    );
    if (definition?.capabilities?.character) {
        return <BriefCharacterSheet />;
    }

    const updateTitle = (title: string) => updateDocumentMetadata(document.id, { title });
    if (document.definitionId === 'creature') {
        const data = CreatureDataSchema.parse(document.data);
        return (
            <CreatureBrief
                data={data}
                update={(next) => updateDocumentData(document.id, () => next)}
                updateTitle={updateTitle}
            />
        );
    }
    if (document.definitionId === 'vehicle') {
        const data = VehicleDataSchema.parse(document.data);
        return (
            <VehicleBrief
                data={data}
                update={(next) => updateDocumentData(document.id, () => next)}
                updateTitle={updateTitle}
            />
        );
    }
    if (document.definitionId === 'fodder-group') {
        const data = FodderDataSchema.parse(document.data);
        return (
            <FodderBrief
                data={data}
                update={(next) => updateDocumentData(document.id, () => next)}
                updateTitle={updateTitle}
            />
        );
    }
    return null;
}
