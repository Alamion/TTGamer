import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ServiceLogo, sharingServiceOf } from '@site/src/integrations/roll-sharing';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { useCallback } from 'react';

import { validateNotation } from '../../dice-logic/dice-parser';
import { currentPanelOrigin, useDiceRollerStore } from '../../store/diceRollerStore';
import { clearCharacterName, clearRollSource, clearStatLabels } from '../../utils/sessionStorage';
import DiceRollerSettingsModal from '../DiceRollerSettingsModal';

export default function RollControls() {
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const roll = useDiceRollerStore((s) => s.roll);
    const settings = useDiceRollerStore((s) => s.settings);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);

    const service = sharingServiceOf(settings.sharingService);
    const [webhookUrl] = useSessionStorageState(service.addressKey, '');
    const isWebhookValid = webhookUrl.length > 0 && service.isValidAddress(webhookUrl);
    const toggleTitle = translate(uiMessages.dice.sharing.toggleTitle, { service: service.name });

    const canClear = notationInput.trim().length > 0;
    const canRoll = notationInput.trim().length > 0 && validateNotation(notationInput);

    const clearNotation = useCallback(() => {
        setNotationInput('');
        clearStatLabels();
        clearCharacterName();
        clearRollSource();
    }, [setNotationInput]);

    const rollNotation = useCallback(() => {
        const toRoll = notationInput.trim();
        if (!toRoll || !validateNotation(toRoll)) return;
        roll(toRoll, { origin: currentPanelOrigin('roll-button') });
        setNotationInput('');
    }, [notationInput, roll, setNotationInput]);

    const toggleSharing = useCallback(() => {
        updateSettings({ enableDiscordWebhook: !settings.enableDiscordWebhook });
    }, [settings.enableDiscordWebhook, updateSettings]);

    const isAnonymized = !settings.includeCharacterName && !settings.includeCharacterStats;

    const toggleAnonymize = useCallback(() => {
        updateSettings({
            includeCharacterName: isAnonymized,
            includeCharacterStats: isAnonymized,
        });
    }, [isAnonymized, updateSettings]);

    return (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
            <DiceRollerSettingsModal />
            {isWebhookValid && (
                <button
                    type="button"
                    onClick={toggleSharing}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        toggleAnonymize();
                    }}
                    title={toggleTitle}
                    aria-label={toggleTitle}
                    aria-pressed={settings.enableDiscordWebhook}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md
                        hover:bg-bgBase/50 transition-colors"
                >
                    <ServiceLogo
                        service={service.id}
                        active={settings.enableDiscordWebhook}
                        ringed={!isAnonymized}
                    />
                </button>
            )}
            <button
                type="button"
                onClick={clearNotation}
                disabled={!canClear}
                className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-sm border border-border
                    bg-bgSurface text-textPrimary cursor-pointer
                    hover:bg-bgBase/50 transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {translate(uiMessages.dice.pool.controls.clear)}
            </button>
            <button
                type="button"
                onClick={rollNotation}
                disabled={!canRoll}
                className="flex-[2] py-1.5 px-3 text-xs font-semibold rounded-sm border border-border
                    bg-primary text-primary-on cursor-pointer
                    hover:bg-primary-hover transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {translate(uiMessages.dice.pool.controls.roll)}
            </button>
        </div>
    );
}
