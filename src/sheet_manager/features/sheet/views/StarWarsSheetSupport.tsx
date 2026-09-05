import { translate } from '@docusaurus/Translate';
import { localizeCatalogEntry } from '@site/src/data/localizeCatalogEntry';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { ConditionTrackMember } from '../../../components';
import { useDocumentStore } from '../../../store/documentStore';
import { CombatScaleSchema, starWarsWodProfile } from '../../../systems/star-wars-wod';
import { getWodConditionTrack } from '../../../systems/wod-like';

type CombatScale = (typeof CombatScaleSchema.options)[number];

export function useCurrentDocument() {
    const store = useDocumentStore();
    const document = store.documents.find(({ id }) => id === store.currentDocumentId);
    return {
        document,
        updateDocumentData: store.updateDocumentData,
        updateDocumentMetadata: store.updateDocumentMetadata,
    };
}

export function TableInput({
    ariaLabel,
    onChange,
    value,
}: {
    ariaLabel: string;
    value: string | number;
    onChange: (value: string) => void;
}) {
    return (
        <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={ariaLabel}
            className="w-full min-w-20 rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary"
        />
    );
}

export function scaleOptions() {
    const options = uiMessages.sheet.documents.fields.scaleOptions;
    const labels: Record<CombatScale, (typeof options)[keyof typeof options]> = {
        'death-star': options.deathStar,
        capital: options.capital,
        transport: options.transport,
        starfighter: options.starfighter,
        walker: options.walker,
        speeder: options.speeder,
        character: options.character,
        vermin: options.vermin,
    };
    return CombatScaleSchema.options.map((value) => ({
        value,
        label: translate(labels[value]),
    }));
}

export function localizeAttributeLabel(locale: string) {
    return (_group: unknown, key: string, fallback: string) =>
        localizeCatalogEntry('attributes', key.replaceAll(' ', '-').toLowerCase(), locale, {
            name: fallback,
        }).name;
}

export function localizedConditionTrack(id: 'health' | 'vehicle-damage') {
    const fields = uiMessages.sheet.documents.fields;
    const track = getWodConditionTrack(starWarsWodProfile, id);
    const descriptors = id === 'health' ? fields.healthLevels : fields.damageLevels;
    return {
        ...track,
        label: translate(id === 'health' ? fields.health : fields.damage),
        levels: track.levels.map((level) => ({
            ...level,
            label: translate(descriptors[level.id as keyof typeof descriptors]),
        })),
    };
}

export function conditionMembers<T extends { id: string; label: string }>(
    members: T[],
    key: 'health' | 'damage'
): ConditionTrackMember[] {
    return members.map((member) => ({
        id: member.id,
        label: member.label,
        levels: (member as T & Record<typeof key, { levels: ConditionTrackMember['levels'] }>)[key]
            .levels,
    }));
}
