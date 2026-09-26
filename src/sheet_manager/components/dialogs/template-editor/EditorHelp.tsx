import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { DocsHelpLink } from '../../controls/DocsHelpLink';

/** Anchors of the template editor guide (`docs/template-editor/`), one per explained setting. */
export const EDITOR_GUIDE = {
    overview: '/docs/template-editor',
    preview: '/docs/template-editor#preview',
    documentationLink: '/docs/template-editor/elements#documentation-link',
    columns: '/docs/template-editor/elements#columns',
    valueSource: '/docs/template-editor/values#value-source',
    sharedValueKey: '/docs/template-editor/values#shared-value-key',
    formulas: '/docs/template-editor/values#formulas',
    limitsFromValues: '/docs/template-editor/values#limits-from-values',
    displayConditions: '/docs/template-editor/values#display-conditions',
    catalogs: '/docs/template-editor/values#catalogs',
    movingPage: '/docs/template-editor/types-and-settings#moving-a-page',
    library: '/docs/template-editor/library',
    libraryMove: '/docs/template-editor/library#library-move',
    libraryExport: '/docs/template-editor/library#library-export',
    libraryImport: '/docs/template-editor/library#library-import',
} as const;

/** A small "?" next to an editor setting, opening its guide section in a new tab. */
export function EditorHelp({
    about,
    topic,
}: {
    topic: keyof typeof EDITOR_GUIDE;
    /** The setting it explains, for the accessible name. */
    about: string;
}) {
    return (
        <DocsHelpLink
            docsPath={EDITOR_GUIDE[topic]}
            label={translate(uiMessages.sheet.templates.editor.helpAbout, { setting: about })}
            size="sm"
        />
    );
}
