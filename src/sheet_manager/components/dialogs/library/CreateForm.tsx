import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    cleanSvgPicture,
    SVG_PICTURE_LIMITS,
    type SvgPictureResult,
    type SvgRemovedKind,
} from '@site/src/shared/utils/svgPicture';
import clsx from 'clsx';
import type { FormEvent } from 'react';
import { useId, useRef, useState } from 'react';

import { initialsOf } from '../../../features/documents/labeler';
import { svgDataUrl } from '../../documents/settingPicture';

const labels = uiMessages.sheet.library;

const PICTURE_REFUSALS = {
    'not-svg': labels.create.pictureNotSvg,
    empty: labels.create.pictureEmpty,
    'too-large': labels.create.pictureTooLarge,
    'too-complex': labels.create.pictureTooComplex,
} as const;
const REMOVED_KINDS: readonly SvgRemovedKind[] = ['scripts', 'external', 'styles', 'other'];
const PICTURE_REMOVED = {
    scripts: labels.create.removedScripts,
    external: labels.create.removedExternal,
    styles: labels.create.removedStyles,
    other: labels.create.removedOther,
} as const;

const input =
    'w-full rounded-sm border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary';

export interface CreateFormValues {
    name: string;
    description: string;
    /** A setting's short mark for document rows; empty uses its initials. */
    badge?: string;
    /** A setting's own cleaned SVG picture, shown instead of its badge; absent removes it. */
    picture?: string;
    /** "New page": `blank` or the id of the page to copy. */
    start?: string;
}

export interface CreateFormProps {
    title: string;
    submitLabel: string;
    initial?: { name: string; description?: string; badge?: string; picture?: string };
    /** Ask for a setting's badge and picture. */
    withBadge?: boolean;
    /** "New page" start options; the first is selected. */
    startOptions?: readonly { value: string; label: string }[];
    note?: string;
    onSubmit: (values: CreateFormValues) => void;
    onCancel: () => void;
}

/**
 * An inline name + description form in the details pane (create, or edit details). Escape is
 * handled by the dialog, which closes the open form before the dialog itself.
 */
export function CreateForm({
    title,
    submitLabel,
    initial,
    startOptions,
    withBadge,
    note,
    onSubmit,
    onCancel,
}: CreateFormProps) {
    const id = useId();
    const [name, setName] = useState(initial?.name ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [badge, setBadge] = useState(initial?.badge ?? '');
    const [picture, setPicture] = useState(initial?.picture);
    const [pictureNote, setPictureNote] = useState<{ text: string; alert: boolean }>();

    const readPicture = async (file: File) => {
        const isSvg = file.type === 'image/svg+xml' || /\.svg$/iu.test(file.name);
        const result: SvgPictureResult = !isSvg
            ? { ok: false, reason: 'not-svg' }
            : file.size > SVG_PICTURE_LIMITS.inputBytes
              ? { ok: false, reason: 'too-large' }
              : cleanSvgPicture(await file.text());
        if (!result.ok) {
            setPictureNote({ text: translate(PICTURE_REFUSALS[result.reason]), alert: true });
            return;
        }
        setPicture(result.svg);
        const parts = REMOVED_KINDS.filter((kind) => result.removed[kind]).map((kind) =>
            translate(PICTURE_REMOVED[kind])
        );
        setPictureNote(
            parts.length > 0
                ? {
                      text: translate(labels.create.pictureRemoved, { parts: parts.join(', ') }),
                      alert: false,
                  }
                : undefined
        );
    };
    const fileInput = useRef<HTMLInputElement>(null);
    const [start, setStart] = useState(startOptions?.[0]?.value);
    const [error, setError] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setError(true);
            return;
        }
        onSubmit({
            name: name.trim(),
            description: description.trim(),
            ...(withBadge ? { badge: badge.trim(), ...(picture ? { picture } : {}) } : {}),
            start,
        });
    };

    return (
        <form
            onSubmit={submit}
            aria-labelledby={`${id}-title`}
            className="space-y-3 rounded-lg border border-border bg-bgBase p-3"
        >
            <h4 id={`${id}-title`} className="text-sm font-semibold text-textPrimary">
                {title}
            </h4>
            <label className="block space-y-1 text-xs text-textSecondary">
                <span>{translate(labels.create.name)}</span>
                <input
                    value={name}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- the form opens on request
                    autoFocus
                    maxLength={80}
                    aria-invalid={error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => {
                        setName(event.target.value);
                        if (event.target.value.trim()) setError(false);
                    }}
                    className={input}
                />
            </label>
            {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-error">
                    {translate(labels.create.nameRequired)}
                </p>
            )}
            <label className="block space-y-1 text-xs text-textSecondary">
                <span>{translate(labels.create.descriptionField)}</span>
                <textarea
                    value={description}
                    maxLength={500}
                    rows={2}
                    onChange={(event) => setDescription(event.target.value)}
                    className={input}
                />
            </label>
            {withBadge && (
                <label className="block space-y-1 text-xs text-textSecondary">
                    <span>{translate(labels.create.badge)}</span>
                    <input
                        value={badge}
                        maxLength={6}
                        placeholder={initialsOf(name)}
                        aria-describedby={`${id}-badge-hint`}
                        onChange={(event) => setBadge(event.target.value)}
                        className={clsx(input, 'max-w-[8rem]')}
                    />
                    <span id={`${id}-badge-hint`} className="block">
                        {translate(labels.create.badgeHint)}
                    </span>
                </label>
            )}
            {withBadge && (
                <div className="space-y-1 text-xs text-textSecondary">
                    <span id={`${id}-picture`}>{translate(labels.create.picture)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {picture && (
                            <img
                                data-setting-picture
                                alt=""
                                src={svgDataUrl(picture)}
                                className="h-8 w-8 rounded-sm border border-border bg-bgSurface object-contain p-0.5"
                            />
                        )}
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".svg,image/svg+xml"
                            aria-label={translate(labels.create.pictureUpload)}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void readPicture(file);
                            }}
                            className="sr-only"
                            tabIndex={-1}
                        />
                        <button
                            type="button"
                            aria-describedby={`${id}-picture-hint`}
                            onClick={() => fileInput.current?.click()}
                            className="rounded-sm border border-border px-2 py-1 text-xs text-textPrimary hover:bg-bgSurface"
                        >
                            {translate(labels.create.pictureUpload)}
                        </button>
                        {picture && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPicture(undefined);
                                    setPictureNote(undefined);
                                }}
                                className="rounded-sm border border-border px-2 py-1 text-xs text-textPrimary hover:bg-bgSurface"
                            >
                                {translate(labels.create.pictureRemove)}
                            </button>
                        )}
                    </div>
                    <span id={`${id}-picture-hint`} className="block">
                        {translate(labels.create.pictureHint)}
                    </span>
                    {pictureNote && (
                        <p
                            role={pictureNote.alert ? 'alert' : 'status'}
                            className={clsx('text-xs', pictureNote.alert && 'text-error')}
                        >
                            {pictureNote.text}
                        </p>
                    )}
                </div>
            )}
            {startOptions && startOptions.length > 0 && (
                <label className="block space-y-1 text-xs text-textSecondary">
                    <span>{translate(labels.create.start)}</span>
                    <select
                        value={start}
                        onChange={(event) => setStart(event.target.value)}
                        className={input}
                    >
                        {startOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {note && <p className="text-xs text-textSecondary">{note}</p>}
            <div className="flex flex-wrap gap-2">
                <button
                    type="submit"
                    className="rounded-sm bg-primary-muted px-3 py-1 text-sm font-medium text-white hover:bg-primary"
                >
                    {submitLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-sm border border-border px-3 py-1 text-sm text-textPrimary hover:bg-bgSurface"
                >
                    {translate(labels.actions.cancel)}
                </button>
            </div>
        </form>
    );
}
