import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { type GameTermsMode, useReaderPrefsStore } from '@site/src/shared/store/readerPrefsStore';

const terms = uiMessages.sheet.terms;

const MODE_LABELS: Record<GameTermsMode, (typeof terms.modes)[keyof typeof terms.modes]> = {
    ru: terms.modes.ru,
    en: terms.modes.en,
    'ru-plain': terms.modes.ruPlain,
};

/** Reader preference for game-term labels (spec 009); only offered outside English. */
export function GameTermsMenu() {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const mode = useReaderPrefsStore((state) => state.gameTerms);
    const setMode = useReaderPrefsStore((state) => state.setGameTerms);
    const dismissed = useReaderPrefsStore((state) => state.termHintNoticeDismissed);
    const setDismissed = useReaderPrefsStore((state) => state.setTermHintNoticeDismissed);
    if (locale === 'en') return null;
    return (
        <div className="flex items-center gap-2 text-sm text-textSecondary">
            <label className="flex items-center gap-2">
                {translate(terms.menu)}
                <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value as GameTermsMode)}
                    className="rounded border border-border bg-bgSurface px-2 py-1.5 text-textPrimary"
                >
                    {(Object.keys(MODE_LABELS) as GameTermsMode[]).map((candidate) => (
                        <option key={candidate} value={candidate}>
                            {translate(MODE_LABELS[candidate])}
                        </option>
                    ))}
                </select>
            </label>
            {dismissed && mode !== 'ru-plain' && (
                <button
                    type="button"
                    onClick={() => setDismissed(false)}
                    className="text-xs underline decoration-dotted hover:text-textPrimary"
                >
                    {translate(terms.showTipAgain)}
                </button>
            )}
        </div>
    );
}

/** One-time tip about book-term hints, shown until the reader dismisses it. */
export function TermHintNotice() {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const mode = useReaderPrefsStore((state) => state.gameTerms);
    const dismissed = useReaderPrefsStore((state) => state.termHintNoticeDismissed);
    const setDismissed = useReaderPrefsStore((state) => state.setTermHintNoticeDismissed);
    if (locale === 'en' || mode === 'ru-plain' || dismissed) return null;
    return (
        <div
            role="note"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bgBase px-3 py-2 text-sm text-textSecondary"
        >
            <span>{translate(terms.notice)}</span>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded border border-border px-2 py-1 text-xs text-textPrimary hover:bg-bgSurface"
            >
                {translate(terms.dismiss)}
            </button>
        </div>
    );
}
