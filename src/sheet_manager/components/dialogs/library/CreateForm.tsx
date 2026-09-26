import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';

const labels = uiMessages.sheet.library;

const input =
    'w-full rounded border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export interface CreateFormValues {
    name: string;
    description: string;
    /** "New page": `blank` or the id of the page to copy. */
    start?: string;
}

export interface CreateFormProps {
    title: string;
    submitLabel: string;
    initial?: { name: string; description?: string };
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
    note,
    onSubmit,
    onCancel,
}: CreateFormProps) {
    const id = useId();
    const [name, setName] = useState(initial?.name ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [start, setStart] = useState(startOptions?.[0]?.value);
    const [error, setError] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setError(true);
            return;
        }
        onSubmit({ name: name.trim(), description: description.trim(), start });
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
                    className="rounded bg-primary-muted px-3 py-1 text-sm font-medium text-white hover:bg-primary"
                >
                    {submitLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-border px-3 py-1 text-sm text-textPrimary hover:bg-bgSurface"
                >
                    {translate(labels.actions.cancel)}
                </button>
            </div>
        </form>
    );
}
