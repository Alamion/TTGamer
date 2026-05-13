import { useState } from 'react';
import { StatDot, CustomTraitList } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';

const SKILLS = {
  talents: [
    'Alertness',
    'Athletics',
    'Brawl',
    'Command',
    'Diplomacy',
    'Dodge',
    'Empathy',
    'Intimidation',
    'Streetwise',
    'Subterfuge',
  ],
  skills: [
    'Blaster',
    'Gunnery',
    'Melee',
    'Pilot',
    'Programming',
    'Repair',
    'Ride',
    'Security',
    'Stealth',
    'Survival',
  ],
  knowledges: [
    'Astrogation',
    'Bureaucracy',
    'Cultures',
    'Interfaces',
    'Investigation',
    'Languages',
    'Medicine',
    'Politics',
    'Tech',
    'Trade',
  ],
};

function SkillTableRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange?: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-24 text-sm text-slate-300 truncate">{label}</span>
      <div className="flex-1 h-px bg-slate-700 min-w-[20px]" />
      <StatDot value={value} onChange={onChange} size="sm" />
    </div>
  );
}

interface CustomSkill {
  id: string;
  label: string;
  value: number;
}

export function SkillBlock() {
  const { currentCharacter, updateCharacter } = useCharacterStore();

  const [customTalents, setCustomTalents] = useState<CustomSkill[]>([]);
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [customKnowledges, setCustomKnowledges] = useState<CustomSkill[]>([]);

  if (!currentCharacter) return null;

  const handleSkillChange = (key: string, value: number) => {
    updateCharacter(currentCharacter.id, {
      skills: { ...currentCharacter.skills, [key]: value },
    });
  };

  const addCustomSkill = (type: 'talents' | 'skills' | 'knowledges') => {
    const id = crypto.randomUUID();
    const newSkill = { id, label: '', value: 0 };
    if (type === 'talents') setCustomTalents([...customTalents, newSkill]);
    else if (type === 'skills') setCustomSkills([...customSkills, newSkill]);
    else setCustomKnowledges([...customKnowledges, newSkill]);
  };

  const removeCustomSkill = (type: 'talents' | 'skills' | 'knowledges', id: string) => {
    if (type === 'talents') setCustomTalents(customTalents.filter((s) => s.id !== id));
    else if (type === 'skills') setCustomSkills(customSkills.filter((s) => s.id !== id));
    else setCustomKnowledges(customKnowledges.filter((s) => s.id !== id));
  };

  const updateCustomSkill = (
    type: 'talents' | 'skills' | 'knowledges',
    id: string,
    value: number,
    label?: string
  ) => {
    const updateList = (list: CustomSkill[]) =>
      list.map((s) => (s.id === id ? { ...s, value: value, label: label ?? s.label } : s));
    if (type === 'talents') setCustomTalents(updateList(customTalents));
    else if (type === 'skills') setCustomSkills(updateList(customSkills));
    else setCustomKnowledges(updateList(customKnowledges));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-1 h-6 bg-cyber-yellow rounded-full" />
        Abilities
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider mb-3">
            Talents
          </h3>
          <div className="space-y-0">
            {SKILLS.talents.map((skill) => (
              <SkillTableRow
                key={skill}
                label={skill}
                value={currentCharacter.skills[skill] || 0}
                onChange={(val) => handleSkillChange(skill, val)}
              />
            ))}
          </div>
          <CustomTraitList
            items={customTalents}
            onAdd={() => addCustomSkill('talents')}
            onRemove={(id) => removeCustomSkill('talents', id)}
            onChange={(id, val) => updateCustomSkill('talents', id, val)}
            onLabelChange={(id, label) => updateCustomSkill('talents', id, 0, label)}
            size="sm"
          />
        </div>

        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider mb-3">
            Skills
          </h3>
          <div className="space-y-0">
            {SKILLS.skills.map((skill) => (
              <SkillTableRow
                key={skill}
                label={skill}
                value={currentCharacter.skills[skill] || 0}
                onChange={(val) => handleSkillChange(skill, val)}
              />
            ))}
          </div>
          <CustomTraitList
            items={customSkills}
            onAdd={() => addCustomSkill('skills')}
            onRemove={(id) => removeCustomSkill('skills', id)}
            onChange={(id, val) => updateCustomSkill('skills', id, val)}
            onLabelChange={(id, label) => updateCustomSkill('skills', id, 0, label)}
            size="sm"
          />
        </div>

        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider mb-3">
            Knowledges
          </h3>
          <div className="space-y-0">
            {SKILLS.knowledges.map((skill) => (
              <SkillTableRow
                key={skill}
                label={skill}
                value={currentCharacter.skills[skill] || 0}
                onChange={(val) => handleSkillChange(skill, val)}
              />
            ))}
          </div>
          <CustomTraitList
            items={customKnowledges}
            onAdd={() => addCustomSkill('knowledges')}
            onRemove={(id) => removeCustomSkill('knowledges', id)}
            onChange={(id, val) => updateCustomSkill('knowledges', id, val)}
            onLabelChange={(id, label) => updateCustomSkill('knowledges', id, 0, label)}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
