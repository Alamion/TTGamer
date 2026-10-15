import { EMPTY_LAYOUT, openKeys } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import { usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { documentIdOf } from '@site/src/sheet_manager/features/sheet/panes/tabKeys';

/** No layout: the sheet shows the current document alone. */
export const resetLayout = () => usePaneStore.setState(EMPTY_LAYOUT);

/** The open documents in reading order (groups, then floating windows). */
export const openDocumentIds = () =>
    openKeys(usePaneStore.getState())
        .map(documentIdOf)
        .filter((id): id is string => id !== null);
