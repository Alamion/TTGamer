import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { useDiceRollerStore } from '../store/diceRollerStore';

export default function DiceRollerSettingsModal() {
    const settings = useDiceRollerStore((s) => s.settings);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);
    const [tailwindRoot] = useState<Element | null>(() =>
        typeof document !== 'undefined' ? document.querySelector('#right-panel') : null
    );

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button
                    type="button"
                    aria-label="Open dice roller settings"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md
                        hover:bg-bgBase/50 transition-colors"
                >
                    <SettingsIcon size={18} />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal container={tailwindRoot}>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Dialog.Content
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                    w-full max-w-md bg-bgSurface border border-border rounded-lg shadow-xl
                    p-6 focus:outline-none"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-bold text-textPrimary">
                            Dice Roller Settings
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                aria-label="Close settings"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md
                                hover:bg-bgBase/50 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enable3dDice}
                                onChange={(e) => updateSettings({ enable3dDice: e.target.checked })}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm text-textPrimary">Enable 3D Dice Rolls</span>
                        </label>

                        <div className="flex gap-4">
                            <label className="flex-1 space-y-1">
                                <span className="text-xs text-textSecondary">Dice face color</span>
                                <input
                                    type="color"
                                    value={settings.primaryDiceColor}
                                    onChange={(e) =>
                                        updateSettings({ primaryDiceColor: e.target.value })
                                    }
                                    className="block w-full h-8 p-0.5 rounded cursor-pointer border border-border"
                                />
                            </label>
                            <label className="flex-1 space-y-1">
                                <span className="text-xs text-textSecondary">Dice text color</span>
                                <input
                                    type="color"
                                    value={settings.secondaryDiceColor}
                                    onChange={(e) =>
                                        updateSettings({ secondaryDiceColor: e.target.value })
                                    }
                                    className="block w-full h-8 p-0.5 rounded cursor-pointer border border-border"
                                />
                            </label>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enableSound}
                                onChange={(e) => updateSettings({ enableSound: e.target.checked })}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm text-textPrimary">Roll sound effects</span>
                        </label>

                        {settings.enableSound && (
                            <div className="pl-7 space-y-1">
                                <span className="text-xs text-textSecondary">Volume</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={settings.soundVolume}
                                    onChange={(e) =>
                                        updateSettings({ soundVolume: Number(e.target.value) })
                                    }
                                    className="w-full accent-primary"
                                />
                                <span className="text-xs text-textSecondary">
                                    {settings.soundVolume}%
                                </span>
                            </div>
                        )}

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.timeToReact}
                                onChange={(e) => updateSettings({ timeToReact: e.target.checked })}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm text-textPrimary">Time to react</span>
                        </label>

                        {settings.timeToReact && (
                            <div className="pl-7 space-y-1">
                                <span className="text-xs text-textSecondary">
                                    React window (seconds)
                                </span>
                                <input
                                    type="range"
                                    min={1}
                                    max={60}
                                    step={1}
                                    value={settings.timeToReactSeconds}
                                    onChange={(e) =>
                                        updateSettings({
                                            timeToReactSeconds: Number(e.target.value),
                                        })
                                    }
                                    className="w-full accent-primary"
                                />
                                <span className="text-xs text-textSecondary">
                                    {settings.timeToReactSeconds}s
                                </span>
                            </div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
