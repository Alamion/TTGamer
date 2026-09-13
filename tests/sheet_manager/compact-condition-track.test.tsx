// @vitest-environment jsdom

import { CompactConditionTrack } from '@site/src/sheet_manager/components/stat-fields/CompactSheetFields';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('CompactConditionTrack', () => {
    it('cycles condition marks through the shared biological/mechanical interaction', () => {
        const onChange = vi.fn();
        render(
            createElement(CompactConditionTrack, {
                disabled: false,
                levels: [{ id: 'light', label: 'Light', penalty: -1 }],
                marks: ['empty'],
                onChange,
            })
        );

        fireEvent.click(screen.getByRole('button', { name: 'Light: empty' }));

        expect(onChange).toHaveBeenCalledWith(['slash']);
    });

    it('does not update a read-only track', () => {
        const onChange = vi.fn();
        render(
            createElement(CompactConditionTrack, {
                disabled: true,
                levels: [{ id: 'bruised', label: 'Bruised' }],
                marks: ['empty'],
                onChange,
            })
        );

        fireEvent.click(screen.getByRole('button', { name: 'Bruised: empty' }));

        expect(onChange).not.toHaveBeenCalled();
    });
});
