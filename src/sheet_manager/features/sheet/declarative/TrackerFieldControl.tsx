import { useEffect, useMemo } from 'react';

import { generateId } from '../../../../shared/utils/random';
import { Tracker } from '../../../components/stat-fields/Tracker';
import { reportSheetIssue } from '../../../diagnostics';
import type { TrackerField } from '../../../types/template';
import type { TrackerValue } from '../../../types/templateValues';
import {
    addTrackerCopy,
    ownTrackerModel,
    removeTrackerCopy,
    setTrackerText,
    stepTrackerLength,
    toggleTrackerMark,
    trackerLengthHidesMarks,
} from '../data/trackerModel';
import type { TemplateFieldControlProps } from './fieldControls';

function newCopyId(): string {
    return (
        generateId()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 8) || 'copy'
    );
}

/** An own tracker (spec 018): every action writes the whole value once. */
export function TrackerFieldControl({
    disabled,
    field,
    onChange,
    previewSource,
    rawValue,
    value,
}: TemplateFieldControlProps) {
    const tracker = field as TrackerField;
    const stored = value as TrackerValue | undefined;
    const model = useMemo(
        () => ownTrackerModel(tracker, stored, tracker.label, disabled),
        [tracker, stored, disabled]
    );

    const unreadable = rawValue !== undefined && value === undefined;
    useEffect(() => {
        if (!unreadable || previewSource) return;
        reportSheetIssue({
            code: 'template-value-unreadable',
            message: 'The stored tracker value has an unknown shape; the tracker shows empty',
            details: { fieldId: tracker.id },
        });
    }, [unreadable, previewSource, tracker.id]);
    useEffect(() => {
        if (model.hidden === 0 || previewSource) return;
        reportSheetIssue({
            code: 'template-value-hidden',
            message: 'Stored tracker marks or notes belong to parts the tracker no longer has',
            details: { fieldId: tracker.id, count: model.hidden },
        });
    }, [model.hidden, previewSource, tracker.id]);

    return (
        <Tracker
            model={model}
            disabled={disabled}
            onMark={(columnId, copyId, levelId) =>
                onChange(toggleTrackerMark(tracker, stored, columnId, copyId, levelId))
            }
            onText={(columnId, copyId, levelId, text) =>
                onChange(setTrackerText(tracker, stored, columnId, copyId, levelId, text))
            }
            onAddCopy={(columnId) =>
                onChange(addTrackerCopy(tracker, stored, columnId, newCopyId()))
            }
            onRemoveCopy={(columnId, copyId) =>
                onChange(removeTrackerCopy(stored, columnId, copyId))
            }
            onLength={(step) => {
                const next = stepTrackerLength(tracker, stored, step);
                if (next) onChange(next);
            }}
            lengthHidesMarks={(step) => trackerLengthHidesMarks(tracker, stored, step)}
        />
    );
}
