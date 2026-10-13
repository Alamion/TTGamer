import { translate } from '@docusaurus/Translate';
import { useMemo } from 'react';

import { systemRegistry } from '../../../../systems';
import { referenceKindName, referenceTargetsOf } from '../../../sheet/data/referenceScope';
import { useEditorModel } from '../../session/EditorModel';
import { editor, t } from './shared';

/**
 * The document kinds a reference may point to (spec 017): the types of the draft's setting, then
 * stored targets the setting does not offer, kept and marked unavailable (at least one checked).
 */
export function ReferenceKindsControl({
    onChange,
    setting,
    value,
}: {
    onChange: (kinds: string[]) => void;
    setting: string;
    value: readonly string[];
}) {
    const { systemId, documentKind, settingId } = useEditorModel();
    const targets = useMemo(
        () => referenceTargetsOf(systemRegistry, { systemId, documentKind, settingId }),
        [systemId, documentKind, settingId]
    );
    const offered = new Set(targets.map(({ kind }) => kind));
    const kinds = [
        ...targets,
        ...value
            .filter((kind) => !offered.has(kind))
            .map((kind) => ({
                kind,
                label: translate(editor.referenceKindUnavailable, {
                    type: referenceKindName(systemRegistry, kind),
                }),
            })),
    ];
    return (
        <fieldset className="grid gap-1" data-setting={setting} tabIndex={-1}>
            <legend className="text-xs font-semibold text-textPrimary">
                {t(editor.referenceKinds)}
            </legend>
            {kinds.map(({ kind, label }) => (
                <label key={kind} className="flex items-center gap-2 text-xs text-textPrimary">
                    <input
                        type="checkbox"
                        checked={value.includes(kind)}
                        disabled={value.length === 1 && value.includes(kind)}
                        onChange={(event) =>
                            onChange(
                                event.target.checked
                                    ? [...value, kind]
                                    : value.filter((candidate) => candidate !== kind)
                            )
                        }
                        className="h-3.5 w-3.5"
                    />
                    {label}
                </label>
            ))}
        </fieldset>
    );
}
