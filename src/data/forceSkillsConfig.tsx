import type { ReactNode } from 'react';
import type { ForceSkillEntry } from './forceSkills';
import { ScaleList } from '@site/src/shared/components/DetailSections';

export function renderForceSkillDetail(skill: ForceSkillEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{skill.description}</p>
            <ScaleList scale={skill.scale} title="Rating Scale" />
        </>
    );
}
