import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { Dices, Droplet, Flame, Heart, type LucideIcon, Skull, Sparkles } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast, { type Toast } from 'react-hot-toast';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentRollSource } from '../../../hooks/useDocumentSource';
import type { CustomTemplate, RowButton } from '../../../types/template';
import { listTemplateFormulaCoordinates } from '../data/templateReferences';
import { useBoundDocument } from './boundDocument';
import { ButtonScopeContext } from './ButtonScope';
import { buttonTarget, readNumber } from './buttonTargets';
import type { FormulaEvaluationError, FormulaValue } from './formula';
import { formulaErrorMessage } from './formulaMessages';
import type { FormulaRun, UseTemplatePageResult } from './hooks';
import { type ButtonRunResult, runButton } from './runButton';

const messages = uiMessages.sheet.documents.button;

const ICONS: Record<NonNullable<RowButton['icon']>, LucideIcon> = {
    dice: Dices,
    droplet: Droplet,
    heart: Heart,
    flame: Flame,
    sparkles: Sparkles,
    skull: Skull,
};

/** How long the result message offers Undo (spec 038 D7). */
const UNDO_MS = 8_000;

/** Row cells as formulas read them: numbers typed as text count as numbers. */
function cellValue(raw: unknown): FormulaValue | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'boolean') return raw ? 1 : 0;
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed !== '' && Number.isFinite(Number(trimmed)) ? Number(trimmed) : raw;
}

const shown = (text: string | undefined, message: string | undefined) =>
    text && message ? translate({ id: message, message: text }) : text;

/**
 * A template button (spec 038, US1): rolls through the dice roller as a roll of this document,
 * writes the changes through the page, and says what changed with an Undo. Disabled in a
 * read-only document and while its availability formula does not hold.
 */
export function SheetButton(props: {
    button: RowButton;
    row?: Readonly<Record<string, unknown>>;
    rowName?: string;
}) {
    const scope = useContext(ButtonScopeContext);
    return scope ? <ScopedButton {...props} {...scope} /> : null;
}

function ScopedButton({
    button,
    pageApi,
    template,
    row,
    rowName,
}: {
    button: RowButton;
    pageApi: UseTemplatePageResult;
    template: CustomTemplate;
    row?: Readonly<Record<string, unknown>>;
    rowName?: string;
}) {
    const bound = useBoundDocument();
    const source = useDocumentRollSource();
    const gameDice = button.roll?.gameDice === true;
    const rollSource = useMemo(
        () =>
            source && {
                systemId: source.systemId,
                definitionId: source.definitionId,
                ...(gameDice && source.specialDice ? { specialDice: source.specialDice } : {}),
            },
        [gameDice, source]
    );
    const { rollImmediately } = useSheetDiceActions({ characterName: bound?.name, rollSource });
    const [busy, setBusy] = useState(false);

    const evaluate = (formula: string): FormulaRun =>
        pageApi.formulaState.evaluate(
            formula,
            row ? { row: (column) => cellValue(row[column]) } : undefined
        );
    // Undo runs after later edits: it compares against the page as it is then.
    const latest = useRef(evaluate);
    useEffect(() => {
        latest.current = evaluate;
    });

    const names = useMemo(
        () =>
            new Map(
                listTemplateFormulaCoordinates(template).map(({ coordinate, label }) => [
                    coordinate,
                    label,
                ])
            ),
        [template]
    );
    const nameOf = (target: string) => names.get(target) ?? target;

    const label = shown(button.label, button.labelMessage) ?? button.label;
    const name = row ? translate(messages.forRow, { label, name: rowName ?? '' }) : label;
    const availability = button.availableWhen ? evaluate(button.availableWhen) : undefined;
    const unavailable =
        availability !== undefined &&
        !(availability.ok && availability.value !== 0 && availability.value !== '');
    const reason = pageApi.disabled
        ? translate(messages.readOnly)
        : unavailable
          ? translate(messages.unavailable, { label })
          : undefined;

    const targetOf = (target: string) =>
        buttonTarget(template, target, (coordinate) => readNumber(evaluate, coordinate));

    const undo = (result: ButtonRunResult) => {
        const now = (target: string) => readNumber(latest.current, target);
        const kept = Object.keys(result.values).filter(
            (target) => now(target) !== result.values[target]
        );
        const restore = Object.entries(result.previous).filter(
            ([target]) => !kept.includes(target)
        );
        const read = (coordinate: string) =>
            Object.fromEntries(restore)[coordinate] ?? now(coordinate);
        pageApi.applyWrites(
            restore.flatMap(([target, value]) => {
                const write = targetOf(target)?.write(value, read);
                return write ? [write] : [];
            })
        );
        toast(
            kept.length > 0
                ? translate(messages.notUndone, { names: kept.map(nameOf).join(', ') })
                : translate(messages.undone)
        );
    };

    const report = (result: ButtonRunResult) => {
        const status =
            result.status === 'error'
                ? translate(messages.error, {
                      label,
                      reason: formulaErrorMessage(
                          result.problem?.error as FormulaEvaluationError | 'parse',
                          result.problem?.coordinate
                      ),
                  })
                : result.status === 'checks'
                  ? translate(messages.checks, {
                        label,
                        passed: result.passed,
                        count: result.rolls,
                    })
                  : translate(messages[result.status], { label });
        const author =
            result.status === 'success' || result.status === 'done'
                ? shown(button.successText, button.successMessage)
                : result.status === 'failure'
                  ? shown(button.failureText, button.failureMessage)
                  : undefined;
        const changes = result.changes.map((change) =>
            change.atLimit
                ? translate(messages.atLimit, { name: nameOf(change.target), value: change.to })
                : translate(messages.change, {
                      name: nameOf(change.target),
                      from: change.from,
                      to: change.to,
                  })
        );
        const skipped =
            result.skipped.length > 0
                ? [translate(messages.skipped, { names: result.skipped.join(', ') })]
                : [];
        const text = [status, author, ...changes, ...skipped].filter(Boolean).join(' · ');
        const undoable = Object.keys(result.values).length > 0;
        const body = undoable
            ? (current: Toast) => (
                  <span className="flex flex-wrap items-center gap-2">
                      <span>{text}</span>
                      <button
                          type="button"
                          className="text-sm font-semibold text-primary underline"
                          onClick={() => {
                              toast.dismiss(current.id);
                              undo(result);
                          }}
                      >
                          {translate(messages.undo)}
                      </button>
                  </span>
              )
            : text;
        const options = undoable ? { duration: UNDO_MS } : {};
        if (result.status === 'error' || result.status === 'failure') toast.error(body, options);
        else if (result.status === 'success') toast.success(body, options);
        else toast(body, options);
    };

    const run = async () => {
        setBusy(true);
        try {
            const result = await runButton(button, {
                evaluate,
                read: (target) => {
                    const known = targetOf(target);
                    return known ? (readNumber(evaluate, target) ?? known.initial) : undefined;
                },
                bounds: (target) => targetOf(target)?.bounds,
                roll: rollImmediately,
            });
            const read = (coordinate: string) =>
                result.values[coordinate] ?? readNumber(evaluate, coordinate);
            pageApi.applyWrites(
                Object.entries(result.values).flatMap(([target, value]) => {
                    const write = targetOf(target)?.write(value, read);
                    return write ? [write] : [];
                })
            );
            if (result.problem || result.skipped.length > 0) {
                reportSheetIssue({
                    code: result.problem ? 'formula-error' : 'binding-unresolved',
                    message: result.problem
                        ? 'A button formula cannot be computed'
                        : 'A button change targets a value the document cannot store',
                    details: {
                        templateId: template.id,
                        buttonId: button.id,
                        ...(result.problem ?? { targets: result.skipped }),
                    },
                });
            }
            report(result);
        } finally {
            setBusy(false);
        }
    };

    const Icon = ICONS[button.icon ?? 'dice'];
    return (
        <button
            type="button"
            onClick={() => void run()}
            disabled={reason !== undefined || busy}
            aria-label={name}
            title={reason ?? name}
            data-button-id={button.id}
            className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-textPrimary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {!row && <span>{label}</span>}
        </button>
    );
}
