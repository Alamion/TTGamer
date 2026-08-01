import * as Dialog from '@radix-ui/react-dialog';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { useDiceRollerStore } from '../store/diceRollerStore';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { SecretField } from '@site/src/shared/components/SecretField';
import {
    isValidDiscordWebhook,
    SESSION_STORAGE_KEY,
} from '@site/src/external_apis/discord/sendToDiscord';

export default function DiceRollerSettingsModal() {
    const settings = useDiceRollerStore((s) => s.settings);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);

    const [webhookUrl, setWebhookUrl] = useSessionStorageState(SESSION_STORAGE_KEY, '');
    const isWebhookValid = webhookUrl.length > 0 && isValidDiscordWebhook(webhookUrl);

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
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
            <Dialog.Content
                aria-describedby={undefined}
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
                            checked={settings.enable3dDicePanel}
                            onChange={(e) =>
                                updateSettings({ enable3dDicePanel: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-textPrimary">3D Dice in Panel</span>
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

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.includeRollContext}
                            onChange={(e) =>
                                updateSettings({ includeRollContext: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-textPrimary">Include roll context</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.includeCharacterName}
                            onChange={(e) =>
                                updateSettings({ includeCharacterName: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-textPrimary">Include character name</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.includeCharacterStats}
                            onChange={(e) =>
                                updateSettings({ includeCharacterStats: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-textPrimary">Include character stats</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enableDiscordWebhook}
                            onChange={(e) =>
                                updateSettings({ enableDiscordWebhook: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-textPrimary">Enable Discord webhook</span>
                    </label>

                    <div className="border-t border-border pt-4">
                        <SecretField
                            value={webhookUrl}
                            onChange={setWebhookUrl}
                            placeholder="https://discord.com/api/webhooks/..."
                            label="Discord Webhook URL"
                            validationMessage={
                                webhookUrl.length > 0
                                    ? isWebhookValid
                                        ? 'Valid Discord webhook'
                                        : 'Invalid Discord webhook URL format'
                                    : undefined
                            }
                            isValid={isWebhookValid}
                        />
                    </div>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}
