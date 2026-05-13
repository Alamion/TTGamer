import { StatDot } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';

const ATTRIBUTES = {
  physical: [
    { key: 'Strength', label: 'Strength' },
    { key: 'Dexterity', label: 'Dexterity' },
    { key: 'Stamina', label: 'Stamina' },
  ],
  social: [
    { key: 'Charisma', label: 'Charisma' },
    { key: 'Manipulation', label: 'Manipulation' },
    { key: 'Appearance', label: 'Appearance' },
  ],
  mental: [
    { key: 'Perception', label: 'Perception' },
    { key: 'Intelligence', label: 'Intelligence' },
    { key: 'Wits', label: 'Wits' },
  ],
};

function StatTableRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange?: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-24 text-sm text-slate-300">{label}</span>
      <div className="flex-1 h-px bg-slate-700" />
      <StatDot value={value} onChange={onChange} size="md" />
    </div>
  );
}

export function AttributeBlock() {
  const { currentCharacter, updateCharacter } = useCharacterStore();

  if (!currentCharacter) return null;

  const handleAttributeChange = (key: string, value: number) => {
    updateCharacter(currentCharacter.id, {
      attributes: { ...currentCharacter.attributes, [key]: value },
    });
  };

  const renderAttributeColumn = (title: string, attrs: typeof ATTRIBUTES.physical) => (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
      <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-0">
        {attrs.map((attr) => {
          return (
            <StatTableRow
              key={attr.key}
              label={attr.label}
              value={currentCharacter.attributes[attr.key] || 0}
              onChange={(val) => handleAttributeChange(attr.key, val)}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-hologram-blue rounded-full" />
          Attributes
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderAttributeColumn('Physical', ATTRIBUTES.physical)}
        {renderAttributeColumn('Social', ATTRIBUTES.social)}
        {renderAttributeColumn('Mental', ATTRIBUTES.mental)}
      </div>
    </div>
  );
}
