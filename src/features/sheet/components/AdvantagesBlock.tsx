import { useState } from 'react';
import {
  StatDot,
  CustomTraitList,
  MeritFlawList,
} from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';

const FORCE_SKILLS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'];
const VIRTUES = ['Conscience', 'Passion', 'Self Control'];

interface CustomBackground {
  id: string;
  label: string;
  value: number;
}

interface MeritFlawItem {
  id: string;
  points: number;
  label: string;
}

function PoolWithDamage({
  label,
  poolValue,
  maxPool,
  onPoolClick,
  bashing,
  lethal,
  onBashingChange,
  onLethalChange,
}: {
  label: string;
  poolValue: number;
  maxPool: number;
  onPoolClick: (index: number) => void;
  bashing: number;
  lethal: number;
  onBashingChange: (val: number) => void;
  onLethalChange: (val: number) => void;
}) {
  const maxDamage = maxPool;

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
      <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
        {label}
      </h3>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: maxPool }, (_, i) => (
          <button
            key={i}
            onClick={() => onPoolClick(i)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              i < poolValue
                ? 'bg-hologram-blue border-hologram-blue'
                : 'bg-transparent border-slate-600 hover:border-slate-400'
            }`}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Bashing</span>
          <div className="flex gap-1">
            {Array.from({ length: maxDamage }, (_, i) => (
              <button
                key={i}
                onClick={() => onBashingChange(i + 1 > bashing ? i + 1 : 0)}
                className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center transition-all ${
                  i < bashing
                    ? 'bg-cyber-yellow border-cyber-yellow text-black'
                    : 'bg-transparent border-slate-600 hover:border-slate-400'
                }`}
              >
                /
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Lethal</span>
          <div className="flex gap-1">
            {Array.from({ length: maxDamage }, (_, i) => (
              <button
                key={i}
                onClick={() => onLethalChange(i + 1 > lethal ? i + 1 : 0)}
                className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center transition-all ${
                  i < lethal
                    ? 'bg-rebel-red border-rebel-red text-white'
                    : 'bg-transparent border-slate-600 hover:border-slate-400'
                }`}
              >
                X
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdvantagesBlock() {
  const { currentCharacter, updateCharacter } = useCharacterStore();

  const [willpower, setWillpower] = useState({ current: 5, max: 5 });
  const [darkSide, setDarkSide] = useState({ current: 0, max: 10 });
  const [forcePoints, setForcePoints] = useState({ current: 0, max: 10 });
  const [forceBashing, setForceBashing] = useState(0);
  const [forceLethal, setForceLethal] = useState(0);

  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  const [merits, setMerits] = useState<MeritFlawItem[]>([]);
  const [flaws, setFlaws] = useState<MeritFlawItem[]>([]);

  if (!currentCharacter) return null;

  const handleForceSkillChange = (key: string, value: number) => {
    updateCharacter(currentCharacter.id, {
      forceSkills: { ...currentCharacter.forceSkills, [key]: value },
    });
  };

  const handleWillpowerClick = (index: number) => {
    const newValue = index + 1;
    setWillpower((prev) => ({
      ...prev,
      current: prev.current === newValue ? 0 : newValue,
    }));
  };

  const handleDarkSideClick = (index: number) => {
    const newValue = index + 1;
    setDarkSide((prev) => ({
      ...prev,
      current: prev.current === newValue ? 0 : newValue,
    }));
  };

  const handleForcePointsClick = (index: number) => {
    const newValue = index + 1;
    setForcePoints((prev) => ({
      ...prev,
      current: prev.current === newValue ? 0 : newValue,
    }));
  };

  const addBackground = () => {
    setCustomBackgrounds([...customBackgrounds, { id: crypto.randomUUID(), label: '', value: 0 }]);
  };

  const removeBackground = (id: string) => {
    setCustomBackgrounds(customBackgrounds.filter((b) => b.id !== id));
  };

  const updateBackground = (id: string, value: number, label?: string) => {
    setCustomBackgrounds(
      customBackgrounds.map((b) =>
        b.id === id ? { ...b, value: value, label: label ?? b.label } : b
      )
    );
  };

  const addMerit = () => setMerits([...merits, { id: crypto.randomUUID(), points: 1, label: '' }]);
  const removeMerit = (id: string) => setMerits(merits.filter((m) => m.id !== id));
  const updateMerit = (id: string, points: number, label: string) => {
    setMerits(merits.map((m) => (m.id === id ? { ...m, points, label } : m)));
  };

  const addFlaw = () => setFlaws([...flaws, { id: crypto.randomUUID(), points: 1, label: '' }]);
  const removeFlaw = (id: string) => setFlaws(flaws.filter((f) => f.id !== id));
  const updateFlaw = (id: string, points: number, label: string) => {
    setFlaws(flaws.map((f) => (f.id === id ? { ...f, points, label } : f)));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-1 h-6 bg-rebel-red rounded-full" />
        Advantages
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
              Force Skills
            </h3>
            <div className="space-y-0">
              {FORCE_SKILLS.map((skill) => {
                const value = currentCharacter.forceSkills?.[skill] || 0;
                return (
                  <div key={skill} className="flex items-center gap-2 py-0.5">
                    <span className="w-20 text-sm text-slate-300">{skill}</span>
                    <div className="flex-1 h-px bg-slate-700" />
                    <StatDot
                      value={value}
                      onChange={(val) => handleForceSkillChange(skill, val)}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Backgrounds
            </h3>
            <CustomTraitList
              items={customBackgrounds}
              onAdd={addBackground}
              onRemove={removeBackground}
              onChange={(id, val) => updateBackground(id, val)}
              onLabelChange={(id, label) => updateBackground(id, 0, label)}
              size="sm"
              placeholder="Background name..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-imperial-blue text-sm font-semibold uppercase tracking-wider mb-3">
              Virtues
            </h3>
            <div className="space-y-0">
              {VIRTUES.map((virtue) => {
                const value = currentCharacter.virtues?.[virtue] || 0;
                return (
                  <div key={virtue} className="flex items-center gap-2 py-0.5">
                    <span className="w-20 text-sm text-slate-300">{virtue}</span>
                    <div className="flex-1 h-px bg-slate-700" />
                    <StatDot
                      value={value}
                      onChange={(val) => {
                        updateCharacter(currentCharacter.id, {
                          virtues: { ...currentCharacter.virtues, [virtue]: val },
                        });
                      }}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-imperial-blue text-sm font-semibold uppercase tracking-wider mb-3">
              Willpower
            </h3>
            <div className="flex gap-1">
              {Array.from({ length: willpower.max }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleWillpowerClick(i)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    i < willpower.current
                      ? 'bg-imperial-blue border-imperial-blue'
                      : 'bg-transparent border-slate-600 hover:border-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>

          <MeritFlawList
            title="Merits"
            items={merits}
            onAdd={addMerit}
            onRemove={removeMerit}
            onChange={updateMerit}
            isMerit={true}
          />
        </div>

        <div className="space-y-4">
          <PoolWithDamage
            label="Force Points"
            poolValue={forcePoints.current}
            maxPool={forcePoints.max}
            onPoolClick={handleForcePointsClick}
            bashing={forceBashing}
            lethal={forceLethal}
            onBashingChange={setForceBashing}
            onLethalChange={setForceLethal}
          />

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-rebel-red text-sm font-semibold uppercase tracking-wider mb-3">
              Dark Side Resistance
            </h3>
            <div className="flex gap-1">
              {Array.from({ length: darkSide.max }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleDarkSideClick(i)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    i < darkSide.current
                      ? 'bg-rebel-red border-rebel-red'
                      : 'bg-transparent border-slate-600 hover:border-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>

          <MeritFlawList
            title="Flaws"
            items={flaws}
            onAdd={addFlaw}
            onRemove={removeFlaw}
            onChange={updateFlaw}
            isMerit={false}
          />
        </div>
      </div>
    </div>
  );
}
