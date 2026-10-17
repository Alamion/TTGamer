import { createContext } from 'react';

import type { CustomTemplate } from '../../../types/template';
import type { UseTemplatePageResult } from './hooks';

/**
 * The page a button belongs to (spec 038): its formulas, writes, and template. Built-in rows
 * render far from the page, so buttons read it from context instead of props.
 */
export const ButtonScopeContext = createContext<{
    pageApi: UseTemplatePageResult;
    template: CustomTemplate;
} | null>(null);
