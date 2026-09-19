import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import * as Popover from '@radix-ui/react-popover';
import { useGameTerms } from '@site/src/shared/store/readerPrefsStore';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TermHintContext } from './TermHintContext';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 100;
const TERM_SELECTOR = '[data-term-ref]';

interface ActiveHint {
    anchor: HTMLElement;
    hint: string;
    detail?: string;
}

/** Events already handled by an inner provider (nested sheet views, e.g. embedded previews). */
const handledEvents = new WeakSet<Event>();

function claim(event: React.SyntheticEvent): boolean {
    if (handledEvents.has(event.nativeEvent)) return false;
    handledEvents.add(event.nativeEvent);
    return true;
}

function termElement(target: EventTarget | null, root: HTMLElement | null): HTMLElement | null {
    if (!(target instanceof Element) || !root) return null;
    const element = target.closest<HTMLElement>(TERM_SELECTOR);
    return element && root.contains(element) ? element : null;
}

function hintOf(anchor: HTMLElement): ActiveHint | null {
    const hint = anchor.dataset.termHint;
    return hint
        ? {
              anchor,
              hint,
              ...(anchor.dataset.termDetail ? { detail: anchor.dataset.termDetail } : {}),
          }
        : null;
}

/**
 * One sheet view's book-term hints (spec 009, contracts/term-hint.md): delegated listeners on
 * its root and a single popover, mounted on first use, anchored to the active label.
 */
export function TermHintProvider({ children }: { children: ReactNode }) {
    const {
        i18n: { currentLocale },
    } = useDocusaurusContext();
    const mode = useGameTerms();
    const settings = useMemo(() => ({ locale: currentLocale, mode }), [currentLocale, mode]);
    const rootRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<HTMLElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [active, setActive] = useState<ActiveHint | null>(null);
    const [mounted, setMounted] = useState(false);

    const schedule = useCallback((next: ActiveHint | null, delay: number) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            anchorRef.current = next?.anchor ?? null;
            if (next) setMounted(true);
            setActive(next);
        }, delay);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    const onPointerOver = (event: React.PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const element = termElement(event.target, rootRef.current);
        if (!element || !claim(event)) return;
        if (element !== active?.anchor) schedule(hintOf(element), OPEN_DELAY_MS);
    };
    const onPointerOut = (event: React.PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const from = termElement(event.target, rootRef.current);
        const to = termElement(event.relatedTarget, rootRef.current);
        if (from && from !== to && claim(event)) schedule(null, CLOSE_DELAY_MS);
    };
    const onFocus = (event: React.FocusEvent) => {
        const element = termElement(event.target, rootRef.current);
        if (element && claim(event)) schedule(hintOf(element), 0);
    };
    const onBlur = (event: React.FocusEvent) => {
        if (termElement(event.target, rootRef.current) && claim(event)) schedule(null, 0);
    };
    const onClick = (event: React.MouseEvent) => {
        const element = termElement(event.target, rootRef.current);
        if (element && claim(event)) {
            schedule(active?.anchor === element ? null : hintOf(element), 0);
        }
    };
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' && active && claim(event)) schedule(null, 0);
    };

    return (
        <TermHintContext.Provider value={settings}>
            {/* Event delegation container only; the interactive elements are the labels. */}
            <div
                ref={rootRef}
                role="presentation"
                className="contents"
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
                onFocus={onFocus}
                onBlur={onBlur}
                onClick={onClick}
                onKeyDown={onKeyDown}
            >
                {children}
            </div>
            {mounted && (
                <Popover.Root
                    open={active !== null}
                    onOpenChange={(open) => {
                        if (!open) schedule(null, 0);
                    }}
                >
                    <Popover.Anchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />
                    <Popover.Portal>
                        <Popover.Content
                            role="tooltip"
                            side="top"
                            sideOffset={4}
                            onOpenAutoFocus={(event) => event.preventDefault()}
                            onCloseAutoFocus={(event) => event.preventDefault()}
                            onInteractOutside={(event) => {
                                // Taps on another term are handled by the delegated click.
                                if (termElement(event.target, rootRef.current))
                                    event.preventDefault();
                            }}
                            className="z-50 max-w-xs rounded-lg border border-border bg-bgSurface px-3 py-2 text-sm shadow-xl"
                        >
                            <span className="font-medium text-textPrimary">{active?.hint}</span>
                            {active?.detail && (
                                <span className="block text-xs text-textSecondary">
                                    {active.detail}
                                </span>
                            )}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            )}
        </TermHintContext.Provider>
    );
}
