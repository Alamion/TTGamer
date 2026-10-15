import { EMPTY_LAYOUT, openKeys } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    setLayoutArea,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { documentIdOf } from '@site/src/sheet_manager/features/sheet/panes/tabKeys';
import { screen } from '@testing-library/react';

/** No layout: the sheet shows the current document alone; no layout area was drawn yet. */
export const resetLayout = () => {
    setLayoutArea(null);
    usePaneStore.setState(EMPTY_LAYOUT);
};

/** A layout area this big, as if the sheet had drawn it (room for six groups by default). */
export const roomyArea = (width = 2400, height = 1000) => setLayoutArea({ width, height });

/** The open documents in reading order (groups, then floating windows). */
export const openDocumentIds = () =>
    openKeys(usePaneStore.getState())
        .map(documentIdOf)
        .filter((id): id is string => id !== null);

/** The group a document is shown in: its frame holds the strip, the controls, and the page. */
export const groupFrameOf = (name: string) =>
    screen.getByRole('region', { name }).closest<HTMLElement>('[data-group-frame]')!;
