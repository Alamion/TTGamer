import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import type { RatingFlag, TemplateField } from '../../../../types/template';
import { RATING_FLAGS } from '../../../../types/template';
import { EditorHelp } from '../../components/EditorHelp';
import { ToggleRow } from '../LayoutControls';
import { editor, t } from './shared';
import type { FieldEditorCallbacks, SeveralFields } from './types';

const flagMessages = uiMessages.sheet.controls.statDot;

const RATING_FLAG_UI = {
    specialization: { letter: 'S', title: flagMessages.specialization },
    practiced: { letter: 'P', title: flagMessages.practiced },
    experienced: { letter: 'E', title: flagMessages.experienced },
} as const;

/** Trait-row switches of a rating (spec 014): text, numbers, die, and S/P/E on the dot style. */
export function RatingSwitches({
    field,
    onUpdate,
    prefix,
    several,
}: {
    field: Extract<TemplateField, { type: 'rating' }>;
    onUpdate: FieldEditorCallbacks['onUpdate'];
    prefix: string;
    several?: SeveralFields;
}) {
    const switches = [
        ['textInput', editor.ratingTextInput],
        ['showNumbers', editor.ratingShowNumbers],
        ['dice', editor.ratingDice],
    ] as const;
    const fields = several?.fields ?? [field];
    const flagsOf = (each: TemplateField) => (each.type === 'rating' ? (each.flags ?? []) : []);
    /** On for every field, off for every field, or mixed across several. */
    const flagState = (flag: RatingFlag) => {
        const on = fields.filter((each) => flagsOf(each).includes(flag)).length;
        return on === 0 ? false : on === fields.length ? true : ('mixed' as const);
    };
    const withFlag = (each: TemplateField, flag: RatingFlag, on: boolean) => {
        const next = RATING_FLAGS.filter((candidate) =>
            candidate === flag ? on : flagsOf(each).includes(candidate)
        );
        return { flags: next.length > 0 ? next : undefined };
    };
    const toggleFlag = (flag: RatingFlag) => {
        const on = flagState(flag) !== true;
        if (several) several.onUpdateEach((each) => withFlag(each, flag, on));
        else onUpdate(withFlag(field, flag, on));
    };
    return (
        <div className="grid gap-1 text-xs text-textSecondary">
            {switches.map(([name, label]) => (
                <ToggleRow
                    key={name}
                    checked={field[name] === true}
                    label={t(label)}
                    setting={`${prefix}${name}`}
                    onChange={(checked) => onUpdate({ [name]: checked || undefined })}
                />
            ))}
            {field.presentation === 'dots' && (
                <div className="flex flex-wrap items-center gap-2">
                    <span>{t(editor.ratingFlags)}</span>
                    {RATING_FLAGS.map((flag) => {
                        const state = flagState(flag);
                        return (
                            <button
                                key={flag}
                                type="button"
                                aria-pressed={state}
                                title={t(RATING_FLAG_UI[flag].title)}
                                aria-label={t(RATING_FLAG_UI[flag].title)}
                                onClick={() => toggleFlag(flag)}
                                className={clsx(
                                    'h-6 w-6 rounded-sm border text-xs font-bold transition-colors',
                                    state === true
                                        ? 'border-primary bg-primary-muted text-textPrimary'
                                        : state === 'mixed'
                                          ? 'border-dashed border-primary text-textPrimary'
                                          : 'border-border text-textSecondary hover:border-primary/60'
                                )}
                            >
                                {RATING_FLAG_UI[flag].letter}
                            </button>
                        );
                    })}
                    <EditorHelp topic="rating" about={t(editor.ratingDice)} />
                    <span className="basis-full text-[11px]">{t(editor.ratingFlagsHint)}</span>
                </div>
            )}
        </div>
    );
}
