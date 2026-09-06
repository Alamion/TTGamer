import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { buildDiceNotation } from '../../../../shared/utils/diceNotation';
import { CustomTraitsEditor } from '../../../components/sections/DocumentSheetSections';
import {
    CompactConditionTrack,
    CompactRating,
    CompactTextField,
} from '../../../components/stat-fields/CompactSheetFields';
import { TraitRow, TraitRowWithInput } from '../../../components/stat-fields/TraitRow';
import { useCharacter } from '../../../hooks';
import {
    type DocumentBindingDescriptor,
    resolveDocumentBinding,
} from '../../../systems/star-wars-wod/documentBindings';
import type { SheetAccentColor } from '../../../systems/types';
import {
    type CustomSkill,
    DEFAULT_ATTRIBUTE_VALUE,
    DEFAULT_SKILL_VALUE,
    type TraitValue,
} from '../../../types/character';
import type { PrimitiveBlock } from '../../../types/template';

const page = uiMessages.sheet.templates.page;
const fields = uiMessages.sheet.documents.fields;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const HEALTH_LEVEL_NAMES = [
    'Bruised',
    'Hurt',
    'Injured',
    'Wounded',
    'Mauled',
    'Crippled',
    'Incapacitated',
] as const;

function DegradedBinding({ bindingKey }: { bindingKey: string }) {
    return (
        <div
            role="alert"
            className="rounded-lg border border-dashed border-border bg-bgSurface p-4 text-sm text-textSecondary"
        >
            {translate(page.primitiveDegraded, { binding: bindingKey })}
        </div>
    );
}

/** Full-width labeled text field for identity data (compact variant uses CompactTextField). */
function IdentityField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    disabled: boolean;
}) {
    return (
        <label className="grid gap-1 text-xs font-medium text-textSecondary">
            {label}
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className={inputClasses}
            />
        </label>
    );
}

interface PrimitiveBodyProps {
    block: PrimitiveBlock;
    descriptor: DocumentBindingDescriptor;
}

export function PrimitiveBody({ block, descriptor }: PrimitiveBodyProps) {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return <DegradedBinding bindingKey={block.bindingKey} />;
    const label = block.label ?? descriptor.label;
    const data = character as unknown as Record<string, unknown>;

    if (descriptor.kind === 'field') {
        const raw = character.metadata[descriptor.fieldKey as keyof typeof character.metadata];
        const value = typeof raw === 'string' ? raw : '';
        const write = (next: string) =>
            updateCharacter(character.id, {
                metadata: { ...character.metadata, [descriptor.fieldKey]: next },
            });
        return block.compact ? (
            <CompactTextField label={label} value={value} disabled={readOnly} onChange={write} />
        ) : (
            <IdentityField label={label} value={value} disabled={readOnly} onChange={write} />
        );
    }

    if (descriptor.kind === 'trait') {
        const record = data[descriptor.map] as Record<string, TraitValue> | undefined;
        const trait: TraitValue =
            record?.[descriptor.traitKey] ??
            (descriptor.map === 'skills' ? DEFAULT_SKILL_VALUE : DEFAULT_ATTRIBUTE_VALUE);
        const patch = (updates: Partial<TraitValue>) =>
            updateCharacter(character.id, {
                [descriptor.map]: {
                    ...(record ?? {}),
                    [descriptor.traitKey]: { ...trait, ...updates },
                },
            });
        if (block.compact) {
            return (
                <CompactRating
                    label={label}
                    value={trait.value}
                    max={descriptor.maximum}
                    disabled={readOnly}
                    onChange={(next) => patch({ value: next })}
                />
            );
        }
        return (
            <TraitRowWithInput
                name={label}
                specializationText={trait.specializationText}
                value={trait.value}
                disabled={readOnly}
                onChange={(value, specialization, experienced, practiced) =>
                    patch({
                        value,
                        specialization: specialization ?? trait.specialization ?? false,
                        experienced: experienced ?? trait.experienced ?? false,
                        practiced: practiced ?? trait.practiced ?? false,
                    })
                }
                onSpecializationTextChange={(text) => patch({ specializationText: text })}
                size="lg"
                minimal={descriptor.minimum}
                maxValue={descriptor.maximum}
                showFlags
                specialization={trait.specialization ?? false}
                experienced={trait.experienced ?? false}
                practiced={trait.practiced ?? false}
                onDiceRoll={buildDiceNotation}
                characterName={character.metadata.name}
            />
        );
    }

    if (descriptor.kind === 'list') {
        const items = data[descriptor.listId];
        if (!Array.isArray(items)) return <DegradedBinding bindingKey={block.bindingKey} />;
        return (
            <CustomTraitsEditor
                items={(items as CustomSkill[]).filter(
                    (item): item is CustomSkill =>
                        typeof item === 'object' && item !== null && 'label' in item
                )}
                onChange={(next: CustomSkill[]) =>
                    updateCharacter(character.id, { [descriptor.listId]: next })
                }
            />
        );
    }

    if (descriptor.kind === 'resource') {
        const pair =
            descriptor.mode === 'rating'
                ? { current: character.darkSideResistance ?? 0, max: descriptor.maximum }
                : ((descriptor.resourceId === 'willpower'
                      ? character.willpower
                      : character.forcePoints) ?? {
                      current: 0,
                      max: descriptor.maximum,
                  });
        const writeCurrent = (next: number) =>
            updateCharacter(
                character.id,
                descriptor.resourceId === 'dark-side-resistance'
                    ? { darkSideResistance: next }
                    : descriptor.resourceId === 'willpower'
                      ? { willpower: { ...pair, current: next } }
                      : { forcePoints: { ...pair, current: next } }
            );
        return (
            <TraitRow
                label={label}
                value={pair.current}
                maxValue={descriptor.maximum}
                disabled={readOnly}
                onChange={writeCurrent}
                size={block.compact ? 'sm' : 'md'}
            />
        );
    }

    if (descriptor.kind === 'track' && descriptor.trackId === 'health') {
        const healthLabels = fields.healthLevels as Record<string, { message: string }>;
        const levels = block.track
            ? block.track.names.map((name, index) => ({
                  id: `level-${index}`,
                  label: name,
                  penalty: null,
              }))
            : character.health.levels.map((_, index) => {
                  const name = HEALTH_LEVEL_NAMES[Math.min(index, HEALTH_LEVEL_NAMES.length - 1)];
                  const descriptor2 = healthLabels[name];
                  return {
                      id: name.toLowerCase(),
                      label: descriptor2 ? translate(descriptor2) : name,
                      penalty: index,
                  };
              });
        return (
            <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    {label}
                </span>
                <CompactConditionTrack
                    disabled={readOnly}
                    levels={levels}
                    marks={character.health.levels}
                    onChange={(next) => updateCharacter(character.id, { health: { levels: next } })}
                />
            </div>
        );
    }

    return <DegradedBinding bindingKey={block.bindingKey} />;
}

export function PrimitiveBlockView({
    block,
    systemId,
    documentKind,
}: {
    block: PrimitiveBlock;
    accentColor: SheetAccentColor;
    systemId: string;
    documentKind: string;
}) {
    const descriptor = resolveDocumentBinding(systemId, documentKind, block.bindingKey);
    if (!descriptor) return <DegradedBinding bindingKey={block.bindingKey} />;
    return <PrimitiveBody block={block} descriptor={descriptor} />;
}
