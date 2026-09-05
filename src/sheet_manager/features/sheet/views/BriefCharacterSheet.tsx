import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { localizeCatalogEntry } from '@site/src/data/localizeCatalogEntry';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { generateId } from '@site/src/shared/utils/random';
import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';

import {
    CompactConditionTrack,
    CompactRating,
    CompactResource,
    CompactSectionHeading,
    CompactTextField,
} from '../../../components';
import { useCharacter } from '../../../hooks';
import {
    starWarsAbilityGroups,
    starWarsAttributeGroups,
    starWarsForceSkills,
    starWarsVirtues,
    starWarsWodProfile,
} from '../../../systems/star-wars-wod';
import type { WodTraitGroup } from '../../../systems/wod-like';
import { getWodConditionTrack } from '../../../systems/wod-like';
import type {
    ArmorItem,
    BaseCharacter,
    CustomSkill,
    TraitValue,
    WeaponItem,
} from '../../../types/character';
import { DEFAULT_ATTRIBUTE_VALUE, DEFAULT_SKILL_VALUE } from '../../../types/character';

function EquipmentInput({
    ariaLabel,
    disabled,
    onChange,
    value,
}: {
    ariaLabel: string;
    disabled: boolean;
    value: string | number;
    onChange: (value: string) => void;
}) {
    return (
        <input
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-label={ariaLabel}
            className="min-w-0 w-full border-0 bg-transparent px-1 py-1 text-xs text-textPrimary outline-none focus:bg-bgBase"
        />
    );
}

export function BriefCharacterSheet() {
    const { character, readOnly, updateCharacter } = useCharacter();
    const { i18n } = useDocusaurusContext();
    if (!character) return null;

    const fields = uiMessages.sheet.documents.fields;
    const baseFields = uiMessages.sheet.base.fields;
    const isMechanical = character.metadata.type === 'droid';
    const conditionTrack = isMechanical
        ? getWodConditionTrack(starWarsWodProfile, 'vehicle-damage')
        : getWodConditionTrack(starWarsWodProfile, 'health');
    const updateMetadata = (updates: Partial<BaseCharacter['metadata']>) =>
        updateCharacter(character.id, { metadata: { ...character.metadata, ...updates } });
    const localizeTrait = (name: string) =>
        localizeCatalogEntry(
            'attributes',
            name.replaceAll(' ', '-').toLowerCase(),
            i18n.currentLocale,
            { name }
        ).name;
    const updateTrait = (
        collection: 'attributes' | 'skills' | 'forceSkills' | 'virtues',
        name: string,
        value: number
    ) => {
        const traits: Record<string, TraitValue> = character[collection] ?? {};
        const fallback =
            collection === 'attributes' || collection === 'virtues'
                ? DEFAULT_ATTRIBUTE_VALUE
                : DEFAULT_SKILL_VALUE;
        updateCharacter(character.id, {
            [collection]: {
                ...traits,
                [name]: { ...(traits[name] ?? fallback), value },
            },
        });
    };
    const customSkillsByGroup: Partial<Record<WodTraitGroup['id'], CustomSkill[]>> = {
        talents: character.customTalents,
        skills: character.customSkills,
        knowledges: character.customKnowledges,
    };
    const updateCustomSkill = (groupId: WodTraitGroup['id'], id: string, value: number) => {
        const field =
            groupId === 'talents'
                ? 'customTalents'
                : groupId === 'skills'
                  ? 'customSkills'
                  : 'customKnowledges';
        updateCharacter(character.id, {
            [field]: (customSkillsByGroup[groupId] ?? []).map((skill) =>
                skill.id === id ? { ...skill, value } : skill
            ),
        });
    };
    const updateArmor = (id: string, key: keyof ArmorItem, value: string) =>
        updateCharacter(character.id, {
            armor: character.armor.map((item) =>
                item.id === id ? { ...item, [key]: value } : item
            ),
        });
    const updateWeapon = (id: string, key: keyof WeaponItem, value: string) =>
        updateCharacter(character.id, {
            weapons: character.weapons.map((item) => {
                if (item.id !== id) return item;
                if (key === 'ammo') {
                    return {
                        ...item,
                        ammo: Math.min(item.maxAmmo, Math.max(0, Number(value) || 0)),
                    };
                }
                if (key === 'maxAmmo') {
                    const maxAmmo = Math.max(0, Number(value) || 0);
                    return { ...item, ammo: Math.min(item.ammo, maxAmmo), maxAmmo };
                }
                return { ...item, [key]: value };
            }),
        });

    return (
        <article className="mx-auto my-5 max-w-6xl overflow-hidden rounded-xl border border-border bg-bgSurface text-textPrimary shadow-md">
            <header className="border-b border-border bg-bgBase/60 px-4 py-3 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h1 className="text-lg font-bold tracking-wide">
                        {translate(uiMessages.sheet.documents.views.brief)}
                    </h1>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <CompactTextField
                        label={translate(baseFields.name.label)}
                        value={character.metadata.name}
                        disabled={readOnly}
                        onChange={(name) => updateMetadata({ name })}
                    />
                    <CompactTextField
                        label={translate(baseFields.concept.label)}
                        value={character.metadata.concept ?? ''}
                        disabled={readOnly}
                        onChange={(concept) => updateMetadata({ concept })}
                    />
                    <CompactTextField
                        label={translate(baseFields.demeanor.label)}
                        value={character.metadata.demeanor ?? ''}
                        disabled={readOnly}
                        onChange={(demeanor) => updateMetadata({ demeanor })}
                    />
                </div>
            </header>

            <div className="grid gap-4 p-4 sm:p-5">
                <section>
                    <CompactSectionHeading>{translate(fields.attributes)}</CompactSectionHeading>
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
                        {starWarsAttributeGroups.map((group) => (
                            <div key={group.id} className="grid gap-1.5">
                                {group.traits.map((trait) => (
                                    <CompactRating
                                        key={trait.key}
                                        label={localizeTrait(trait.key)}
                                        value={
                                            (
                                                character.attributes[trait.key] ??
                                                DEFAULT_ATTRIBUTE_VALUE
                                            ).value
                                        }
                                        disabled={readOnly}
                                        onChange={(value) =>
                                            updateTrait('attributes', trait.key, value)
                                        }
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <CompactSectionHeading>{translate(fields.abilities)}</CompactSectionHeading>
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
                        {starWarsAbilityGroups.map((group) => (
                            <div key={group.id} className="grid gap-1.5">
                                {group.traits.map((trait) => (
                                    <CompactRating
                                        key={trait.key}
                                        label={trait.label}
                                        value={
                                            (character.skills[trait.key] ?? DEFAULT_SKILL_VALUE)
                                                .value
                                        }
                                        disabled={readOnly}
                                        onChange={(value) =>
                                            updateTrait('skills', trait.key, value)
                                        }
                                    />
                                ))}
                                {(customSkillsByGroup[group.id] ?? []).map((skill) => (
                                    <CompactRating
                                        key={skill.id}
                                        label={skill.label}
                                        value={skill.value}
                                        disabled={readOnly}
                                        onChange={(value) =>
                                            updateCustomSkill(group.id, skill.id, value)
                                        }
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <CompactSectionHeading>
                        {translate(isMechanical ? fields.resources : fields.forceAndResolve)}
                    </CompactSectionHeading>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid content-start gap-1.5">
                            {!isMechanical &&
                                starWarsForceSkills.traits.map((trait) => (
                                    <CompactRating
                                        key={trait.key}
                                        label={trait.label}
                                        value={
                                            (
                                                character.forceSkills?.[trait.key] ??
                                                DEFAULT_SKILL_VALUE
                                            ).value
                                        }
                                        disabled={readOnly}
                                        onChange={(value) =>
                                            updateTrait('forceSkills', trait.key, value)
                                        }
                                    />
                                ))}
                        </div>
                        <div className="grid content-start gap-1.5">
                            {!isMechanical && (
                                <>
                                    <CompactResource
                                        label={translate(fields.forcePoints)}
                                        current={character.forcePoints?.current ?? 0}
                                        maximum={character.forcePoints?.max ?? 0}
                                        currentLabel={translate(fields.current)}
                                        maximumLabel={translate(fields.maximum)}
                                        disabled={readOnly}
                                        onChange={(current, max) =>
                                            updateCharacter(character.id, {
                                                forcePoints: { current, max },
                                            })
                                        }
                                    />
                                    <CompactRating
                                        label={translate(fields.darkSideResistance)}
                                        value={character.darkSideResistance ?? 5}
                                        max={10}
                                        disabled={readOnly}
                                        onChange={(darkSideResistance) =>
                                            updateCharacter(character.id, { darkSideResistance })
                                        }
                                    />
                                </>
                            )}
                            <label className="grid gap-1 text-xs text-textSecondary">
                                {translate(fields.notes)}
                                <textarea
                                    value={character.notes}
                                    disabled={readOnly}
                                    onChange={(event) =>
                                        updateCharacter(character.id, { notes: event.target.value })
                                    }
                                    className="min-h-16 resize-y rounded border border-border bg-bgBase p-2 text-xs text-textPrimary outline-none focus:border-primary"
                                />
                            </label>
                        </div>
                        <div className="grid content-start gap-1.5">
                            {starWarsVirtues.traits.map((trait) => (
                                <CompactRating
                                    key={trait.key}
                                    label={trait.label}
                                    value={
                                        (character.virtues?.[trait.key] ?? DEFAULT_ATTRIBUTE_VALUE)
                                            .value
                                    }
                                    disabled={readOnly}
                                    onChange={(value) => updateTrait('virtues', trait.key, value)}
                                />
                            ))}
                            <CompactResource
                                label={translate(fields.willpower)}
                                current={character.willpower?.current ?? 0}
                                maximum={character.willpower?.max ?? 0}
                                currentLabel={translate(fields.current)}
                                maximumLabel={translate(fields.maximum)}
                                disabled={readOnly}
                                onChange={(current, max) =>
                                    updateCharacter(character.id, { willpower: { current, max } })
                                }
                            />
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]">
                    <div className="grid content-start gap-4">
                        <EquipmentTable
                            kind="armor"
                            items={character.armor}
                            disabled={readOnly}
                            onAdd={() =>
                                updateCharacter(character.id, {
                                    armor: [
                                        ...character.armor,
                                        {
                                            id: generateId(),
                                            name: '',
                                            classVal: '',
                                            ar: '',
                                            dex: '',
                                        },
                                    ],
                                })
                            }
                            onRemove={(id) =>
                                updateCharacter(character.id, {
                                    armor: character.armor.filter((item) => item.id !== id),
                                })
                            }
                            onArmorChange={updateArmor}
                        />
                        <EquipmentTable
                            kind="weapon"
                            items={character.weapons}
                            disabled={readOnly}
                            onAdd={() =>
                                updateCharacter(character.id, {
                                    weapons: [
                                        ...character.weapons,
                                        {
                                            id: generateId(),
                                            name: '',
                                            damage: '',
                                            range: '',
                                            ammo: 0,
                                            maxAmmo: 0,
                                        },
                                    ],
                                })
                            }
                            onRemove={(id) =>
                                updateCharacter(character.id, {
                                    weapons: character.weapons.filter((item) => item.id !== id),
                                })
                            }
                            onWeaponChange={updateWeapon}
                        />
                    </div>

                    <section>
                        <CompactSectionHeading>
                            {translate(isMechanical ? fields.damage : fields.health)}
                        </CompactSectionHeading>
                        <CompactConditionTrack
                            disabled={readOnly}
                            levels={conditionTrack.levels.map((conditionLevel) => {
                                const labels = isMechanical
                                    ? fields.damageLevels
                                    : fields.healthLevels;
                                return {
                                    ...conditionLevel,
                                    label: translate(
                                        labels[conditionLevel.id as keyof typeof labels]
                                    ),
                                };
                            })}
                            marks={character.health.levels}
                            onChange={(levels) =>
                                updateCharacter(character.id, { health: { levels } })
                            }
                        />
                    </section>
                </div>
            </div>
        </article>
    );
}

type EquipmentTableProps =
    | {
          kind: 'armor';
          items: ArmorItem[];
          disabled: boolean;
          onAdd: () => void;
          onRemove: (id: string) => void;
          onArmorChange: (id: string, key: keyof ArmorItem, value: string) => void;
          onWeaponChange?: never;
      }
    | {
          kind: 'weapon';
          items: WeaponItem[];
          disabled: boolean;
          onAdd: () => void;
          onRemove: (id: string) => void;
          onWeaponChange: (id: string, key: keyof WeaponItem, value: string) => void;
          onArmorChange?: never;
      };

function EquipmentTable(props: EquipmentTableProps) {
    const fields = uiMessages.sheet.documents.fields;
    const isArmor = props.kind === 'armor';
    const columns = isArmor
        ? [fields.armorType, fields.armorClass, fields.armorRating, fields.dexterity]
        : [fields.weapon, fields.damage, fields.range, fields.ammunition, fields.maximum];
    const gridClass = isArmor
        ? 'grid-cols-[minmax(10rem,1fr)_4rem_4rem_4rem_2rem] min-w-[28rem]'
        : 'grid-cols-[minmax(10rem,1fr)_5rem_6rem_4rem_4rem_2rem] min-w-[32rem]';

    return (
        <section>
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-1">
                <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.16em]">
                    {translate(isArmor ? fields.armor : fields.weapons)}
                </h2>
                <button
                    type="button"
                    disabled={props.disabled}
                    onClick={props.onAdd}
                    className="inline-flex items-center gap-1 text-[0.65rem] text-primary disabled:opacity-50"
                >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    {translate(isArmor ? fields.addArmor : fields.addWeapon)}
                </button>
            </div>
            <div className="overflow-x-auto rounded border border-border">
                <div
                    className={clsx(
                        'grid bg-bgBase px-1 py-1 text-[0.6rem] font-bold uppercase text-textSecondary',
                        gridClass
                    )}
                >
                    {columns.map((column) => (
                        <span key={column.id}>{translate(column)}</span>
                    ))}
                    <span />
                </div>
                {props.items.length === 0 && (
                    <p className="px-2 py-2 text-xs italic text-textSecondary">
                        {translate(fields.none)}
                    </p>
                )}
                {props.kind === 'armor'
                    ? props.items.map((item) => (
                          <div
                              key={item.id}
                              className={clsx('grid border-t border-border', gridClass)}
                          >
                              {(['name', 'classVal', 'ar', 'dex'] as const).map((key) => (
                                  <EquipmentInput
                                      key={key}
                                      ariaLabel={`${translate(fields.armor)}: ${key}`}
                                      disabled={props.disabled}
                                      value={item[key]}
                                      onChange={(value) => props.onArmorChange(item.id, key, value)}
                                  />
                              ))}
                              <button
                                  type="button"
                                  disabled={props.disabled}
                                  onClick={() => props.onRemove(item.id)}
                                  aria-label={translate(fields.removeRow)}
                                  className="grid place-items-center text-error disabled:opacity-50"
                              >
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                              </button>
                          </div>
                      ))
                    : props.items.map((item) => (
                          <div
                              key={item.id}
                              className={clsx('grid border-t border-border', gridClass)}
                          >
                              {(['name', 'damage', 'range', 'ammo', 'maxAmmo'] as const).map(
                                  (key) => (
                                      <EquipmentInput
                                          key={key}
                                          ariaLabel={`${translate(fields.weapons)}: ${key}`}
                                          disabled={props.disabled}
                                          value={item[key]}
                                          onChange={(value) =>
                                              props.onWeaponChange(item.id, key, value)
                                          }
                                      />
                                  )
                              )}
                              <button
                                  type="button"
                                  disabled={props.disabled}
                                  onClick={() => props.onRemove(item.id)}
                                  aria-label={translate(fields.removeRow)}
                                  className="grid place-items-center text-error disabled:opacity-50"
                              >
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                              </button>
                          </div>
                      ))}
            </div>
        </section>
    );
}
