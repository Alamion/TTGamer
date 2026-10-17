import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DocsHelpLink } from '@site/src/shared/components/DocsHelpLink';

/** Anchors of the template editor guide (`docs/guide/template-editor/`), one per explained setting. */
export const EDITOR_GUIDE = {
    overview: '/docs/guide/template-editor',
    preview: '/docs/guide/template-editor#preview',
    documentationLink: '/docs/guide/template-editor/elements#documentation-link',
    columns: '/docs/guide/template-editor/elements#columns',
    rating: '/docs/guide/template-editor/elements#rating',
    valueSource: '/docs/guide/template-editor/values#value-source',
    sharedValueKey: '/docs/guide/template-editor/values#shared-value-key',
    formulas: '/docs/guide/template-editor/values#formulas',
    limitsFromValues: '/docs/guide/template-editor/values#limits-from-values',
    displayConditions: '/docs/guide/template-editor/values#display-conditions',
    buttons: '/docs/guide/template-editor/elements#buttons',
    catalogs: '/docs/guide/template-editor/values#catalogs',
    movingPage: '/docs/guide/template-editor/types-and-settings#moving-a-page',
    library: '/docs/guide/template-editor/library',
    libraryMove: '/docs/guide/template-editor/library#library-move',
    libraryExport: '/docs/guide/template-editor/library#library-export',
    libraryImport: '/docs/guide/template-editor/library#library-import',
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
