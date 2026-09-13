import { ScaleList } from '@site/src/shared/components/DetailSections';
import type { ReactNode } from 'react';

import type { ForceSkillEntry } from './forceSkills';

export function renderForceSkillDetail(skill: ForceSkillEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{skill.description}</p>
            <ScaleList scale={skill.scale} title="Rating Scale" />
        </>
    );
}
