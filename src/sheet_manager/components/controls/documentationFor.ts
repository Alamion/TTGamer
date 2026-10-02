import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

/** Accessible name of a block's documentation link. */
export const documentationFor = (title: string) =>
    translate(uiMessages.sheet.controls.documentationFor, { title });
