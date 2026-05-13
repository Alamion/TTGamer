import { useState, useRef } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { BaseCharacterSchema } from '../../../types/character';

export function SheetHeader() {
  const { currentCharacter, updateCharacter, importCharacter } = useCharacterStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentCharacter) return null;

  const handleChange = (field: string, value: string) => {
    updateCharacter(currentCharacter.id, {
      metadata: { ...currentCharacter.metadata, [field]: value },
    });
  };

  const handleExport = () => {
    if (!currentCharacter) return;
    const dataStr = JSON.stringify(currentCharacter, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCharacter.metadata.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const parsed = BaseCharacterSchema.parse(json);
        importCharacter(parsed);
      } catch (err) {
        alert('Invalid character file. Please select a valid JSON character export.');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const renderField = (
    label: string,
    field: string,
    placeholder: string,
    className: string = ''
  ) => (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={(currentCharacter.metadata as Record<string, string>)[field] ?? ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:border-hologram-blue focus:outline-none"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="bg-slate-800/50 border-b border-slate-700 p-4">
      {/* Top bar: Export/Import left, Collapse/Expand right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Export character as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Import character from JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-hologram-blue hover:text-hologram-blue/80 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed view: Name, Concept, Species only */}
      {!isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('Name', 'name', 'Character name...')}
          {renderField('Concept', 'concept', 'Character concept...')}
          {renderField('Species', 'species', "Human, Twi'lek...")}
        </div>
      )}

      {/* Expanded view: Line-based layout preserving original positions */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Line 1: Name, Player, Adventure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('Name', 'name', 'Character name...')}
            {renderField('Player', 'player', 'Player name...')}
            {renderField('Adventure', 'adventure', 'Adventure/campaign...')}
          </div>

          {/* Line 2: Concept, Nature, Demeanor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('Concept', 'concept', 'Character concept...')}
            {renderField('Nature', 'nature', 'Nature...')}
            {renderField('Demeanor', 'demeanor', 'Demeanor...')}
          </div>

          {/* Line 3: Species, Home World, Age */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('Species', 'species', "Human, Twi'lek...")}
            {renderField('Home World', 'homeWorld', 'Coruscant, Tatooine...')}
            {renderField('Age', 'age', 'Age...')}
          </div>
        </div>
      )}
    </div>
  );
}
