import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

export const editor = uiMessages.sheet.templates.editor;
export const fieldTypes = uiMessages.sheet.templates.fieldTypes;

export const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export const optionalText = (value: string) => (value.length > 0 ? value : undefined);
