import { ScaleList } from '@site/src/shared/components/DetailSections';
import { catalogEntryList, catalogEntryText } from '@site/src/sheet_manager/systems/catalogs';
import type { ReactNode } from 'react';

import { useCatalogText } from './catalogI18n';
import type { ForceSkillEntry } from './forceSkills';

const CATALOG_ID = 'force-skills';

/** `EntityGrid` getters: name, summary, and specialties in the reader's locale. */
export const FORCE_SKILL_GRID = {
    getName: (skill: ForceSkillEntry, locale: string) =>
        catalogEntryText(CATALOG_ID, skill, 'name', locale) ?? skill.name,
    getDescription: (skill: ForceSkillEntry, locale: string) =>
        catalogEntryText(CATALOG_ID, skill, 'shortDescription', locale) ?? skill.shortDescription,
    getTags: (skill: ForceSkillEntry, locale: string) =>
        catalogEntryList(CATALOG_ID, skill, 'specialties', locale) ?? skill.specialties,
    getKey: (skill: ForceSkillEntry) => skill.id,
};

function ForceSkillDetail({ skill }: { skill: ForceSkillEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(skill, 'description')}
            </p>
            <ScaleList scale={t.list(skill, 'scale')} />
        </>
    );
}

export function renderForceSkillDetail(skill: ForceSkillEntry): ReactNode {
    return <ForceSkillDetail skill={skill} />;
}
