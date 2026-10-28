import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { matchesSearch } from '@site/src/shared/utils/normalizeSearchText';
import { clsx } from 'clsx';
import {
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
    useEffect,
    useId,
    useLayoutEffect,
    useState,
} from 'react';

import { useDocumentSource } from '../../../hooks/useDocumentSource';
import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
import { linkBuckets } from '../../documents/linkResolve';
import {
    linkQueryAt,
    sectionsOf,
    suggestDocuments,
    SUGGESTIONS_MAX,
    suggestionTarget,
} from '../../documents/linkSuggestions';
import { type CaretPosition, caretPosition } from './caretPosition';

const messages = uiMessages.sheet.links.suggestions;

interface Option {
    key: string;
    label: string;
    detail?: string;
    /** The link's target as inserted between `[[` and `]]`. */
    target: string;
}

export interface LinkSuggestions {
    /** Spread on the textarea. */
    textareaProps: {
        onSelect: () => void;
        onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
        onBlur: () => void;
        'aria-autocomplete': 'list';
        'aria-controls'?: string;
        'aria-activedescendant'?: string;
    };
    /** The list, drawn over the textarea's wrapper (which must be positioned). */
    list: ReactNode;
}

/**
 * `[[` suggestions in a markdown textarea (spec 044, US2): documents while a name is typed, the
 * target's sections after `#`. Arrows move, Enter or Tab inserts, Esc closes until the next link.
 */
export function useLinkSuggestions({
    textareaRef,
    text,
    replace,
}: {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    text: string;
    /** Replaces `[from, to)` with `insert` (undoably where the browser can). */
    replace: (from: number, to: number, insert: string) => void;
}): LinkSuggestions {
    const id = useId();
    const locale = useDocusaurusContext().i18n.currentLocale;
    const { document: source } = useDocumentSource();
    const entries = useDocumentStore((state) => state.entries);
    const folders = useDocumentStore((state) => state.folders);
    const [caret, setCaret] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState<number | null>(null);
    const [active, setActive] = useState(0);
    const [sections, setSections] = useState<{ id: string; names: string[] } | null>(null);
    const [position, setPosition] = useState<CaretPosition | null>(null);

    const query = caret === null ? undefined : linkQueryAt(text, caret);
    const open = query !== undefined && dismissed !== query.from;
    const typedName = open ? query.name : undefined;
    const typedSection = open ? query.section : undefined;
    const from = query?.from;
    const buckets = linkBuckets(entries, folders);
    const sourceParentId = source ? buckets.byId.get(source.id)?.parentId : undefined;
    const sectionTarget =
        typedName !== undefined && typedSection !== undefined
            ? suggestionTarget(typedName, sourceParentId, buckets)
            : undefined;

    useEffect(() => {
        if (!sectionTarget) return;
        let current = true;
        void sectionsOf(sectionTarget, locale).then((names) => {
            if (current) setSections({ id: sectionTarget.id, names });
        });
        return () => {
            current = false;
        };
    }, [sectionTarget, locale]);

    // The React compiler memoizes this; the name buckets are cached per index already.
    const options = ((): Option[] => {
        if (typedName === undefined) return [];
        if (typedSection === undefined) {
            return suggestDocuments(typedName, sourceParentId, buckets).map(
                ({ entry, reference, folder }) => ({
                    key: entry.id,
                    label: entry.name,
                    detail: [documentLabeler.kind(entry.systemId, entry.kind), folder]
                        .filter(Boolean)
                        .join(' · '),
                    target: reference,
                })
            );
        }
        if (!sectionTarget || sections?.id !== sectionTarget.id) return [];
        return sections.names
            .filter((name) => matchesSearch(typedSection, name))
            .slice(0, SUGGESTIONS_MAX)
            .map((name) => ({
                key: name,
                label: name,
                target: `${typedName.trim()}#${name}`,
            }));
    })();

    const shown = options.length > 0;
    const selected = Math.min(active, options.length - 1);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        setPosition(shown && textarea && from !== undefined ? caretPosition(textarea, from) : null);
    }, [shown, from, textareaRef]);

    const updateCaret = () => {
        const textarea = textareaRef.current;
        const next =
            textarea && textarea.selectionStart === textarea.selectionEnd
                ? textarea.selectionStart
                : null;
        if (next !== caret) {
            setCaret(next);
            setActive(0);
        }
    };

    const pick = (option: Option) => {
        if (!query) return;
        replace(query.from, query.to, `[[${option.target}]]`);
        setCaret(null);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (!shown) return;
        const option = options[selected];
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive((selected + step + options.length) % options.length);
        } else if ((event.key === 'Enter' || event.key === 'Tab') && option) {
            event.preventDefault();
            pick(option);
        } else if (event.key === 'Escape') {
            // Closes the list only: Esc does not also end editing.
            event.preventDefault();
            event.stopPropagation();
            setDismissed(query?.from ?? null);
        }
    };

    const listId = `${id}-links`;
    const optionId = (index: number) => `${id}-link-${String(index)}`;
    const title =
        typedSection === undefined
            ? translate(messages.documents)
            : translate(messages.sections, { name: sectionTarget?.name ?? typedName ?? '' });

    return {
        textareaProps: {
            onSelect: updateCaret,
            onKeyDown,
            onBlur: () => setCaret(null),
            'aria-autocomplete': 'list',
            ...(shown
                ? { 'aria-controls': listId, 'aria-activedescendant': optionId(selected) }
                : {}),
        },
        list: shown ? (
            <ul
                id={listId}
                role="listbox"
                aria-label={title}
                className="absolute z-20 m-0 max-h-64 w-72 max-w-full list-none overflow-y-auto rounded-sm border border-border bg-bgSurface p-1 shadow-lg"
                style={
                    position
                        ? { top: position.top + position.height, left: Math.max(0, position.left) }
                        : { top: '100%', left: 0 }
                }
            >
                {options.map((option, index) => (
                    // Options are picked with the pointer without taking focus from the text.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <li
                        key={option.key}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === selected}
                        className={clsx(
                            'cursor-pointer rounded-sm px-2 py-1 text-sm',
                            index === selected
                                ? 'bg-primary-muted text-textPrimary'
                                : 'text-textPrimary'
                        )}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => pick(option)}
                    >
                        <span className="block truncate">{option.label}</span>
                        {option.detail && (
                            <span className="block truncate text-xs text-textSecondary">
                                {option.detail}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        ) : null,
    };
}
