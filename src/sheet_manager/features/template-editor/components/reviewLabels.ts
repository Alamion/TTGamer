import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { ReviewItem } from '../merge/items';

const editor = uiMessages.sheet.templates.editor;
const marks = {
    added: editor.markAdded,
    changed: editor.markChanged,
    removed: editor.markRemoved,
    moved: editor.markMoved,
};

export function reviewMarkLabel(item: ReviewItem): string {
    return translate(
        item.origin === 'difference'
            ? editor.markDifference
            : item.origin === 'conflict'
              ? editor.markConflict
              : marks[item.kind]
    );
}
