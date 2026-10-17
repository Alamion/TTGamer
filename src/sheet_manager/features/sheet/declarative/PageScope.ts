import { createContext } from 'react';

import type { CustomTemplate } from '../../../types/template';
import type { UseTemplatePageResult } from './hooks';

/**
 * The page an element belongs to (spec 038): its formulas, writes, and template. Buttons in
 * built-in rows and built-in values drawn as trackers render far from the page, so they read it
 * from context instead of props.
 */
export const PageScopeContext = createContext<{
    pageApi: UseTemplatePageResult;
    template: CustomTemplate;
} | null>(null);
