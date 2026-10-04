import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { render } from '@testing-library/react';
import { createElement } from 'react';

/** Renders a page template as the sheet does, with it as the only stored template. */
export function mountSheet(template: CustomTemplate) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    return render(createElement(DeclarativeSheetView, { template }));
}
