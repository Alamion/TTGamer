import { useState } from 'react';

const MAX_HEALTH = 7;

export function HealthBlock() {
  const [bashing, setBashing] = useState(0);
  const [lethal, setLethal] = useState(0);

  const handleBashingClick = (index: number) => {
    const newValue = index + 1;
    setBashing((prev) => (prev === newValue ? 0 : newValue));
  };

  const handleLethalClick = (index: number) => {
    const newValue = index + 1;
    setLethal((prev) => (prev === newValue ? 0 : newValue));
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
      <h3 className="text-rebel-red text-sm font-semibold uppercase tracking-wider mb-4">Health</h3>

      <div className="mb-4">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Bashing (/)</span>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: MAX_HEALTH }, (_, i) => (
            <button
              key={i}
              onClick={() => handleBashingClick(i)}
              className={`w-6 h-6 rounded text-sm font-bold flex items-center justify-center transition-all ${
                i < bashing
                  ? 'bg-cyber-yellow border-cyber-yellow text-black'
                  : 'bg-transparent border border-slate-600 hover:border-slate-400'
              }`}
            >
              /
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-1">{bashing} bashing</div>
      </div>

      <div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">Lethal (X)</span>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: MAX_HEALTH }, (_, i) => (
            <button
              key={i}
              onClick={() => handleLethalClick(i)}
              className={`w-6 h-6 rounded text-sm font-bold flex items-center justify-center transition-all ${
                i < lethal
                  ? 'bg-rebel-red border-rebel-red text-white'
                  : 'bg-transparent border border-slate-600 hover:border-slate-400'
              }`}
            >
              X
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-1">{lethal} lethal</div>
      </div>
    </div>
  );
}
