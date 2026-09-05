import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { HelpCircle } from 'lucide-react';

import { CompactConditionTrack } from '../../../components';
import { useCharacter } from '../../../hooks';
import { starWarsWodProfile } from '../../../systems/star-wars-wod';
import { getWodConditionTrack } from '../../../systems/wod-like';

interface HealthBlockProps {
    conditionKind?: 'health' | 'vehicle-damage';
    docsPath?: string;
}

export function HealthBlock({ conditionKind = 'health', docsPath }: HealthBlockProps) {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const fields = uiMessages.sheet.documents.fields;
    const isMechanical = conditionKind === 'vehicle-damage';
    const labels = isMechanical ? fields.damageLevels : fields.healthLevels;
    const title = translate(isMechanical ? fields.damage : fields.health);
    const levels = getWodConditionTrack(starWarsWodProfile, conditionKind).levels.map((level) => ({
        ...level,
        label: translate(labels[level.id as keyof typeof labels]),
    }));

    return (
        <section className="self-start rounded-lg border bg-bgSurface p-4">
            <h3 className="mb-4 flex items-center justify-end gap-2 pr-3 text-right text-sm font-semibold uppercase tracking-wider text-textSecondary">
                {title}
                {docsPath && (
                    <a
                        href={docsPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-textSecondary transition-colors hover:text-textPrimary"
                        aria-label={title}
                    >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                    </a>
                )}
            </h3>
            <CompactConditionTrack
                disabled={readOnly}
                levels={levels}
                marks={character.health.levels}
                onChange={(conditionLevels) =>
                    updateCharacter(character.id, { health: { levels: conditionLevels } })
                }
            />
        </section>
    );
}
