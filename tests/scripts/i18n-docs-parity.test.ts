import { describe, expect, it } from 'vitest';

import { structureDifferences } from '../../scripts/i18n-docs-parity';

const english = `---
id: guide
---

import Rolls from '@site/src/Rolls';

## Rolling dice {#rolling}

:::tip
Roll a pool.
:::

<Rolls notation="3d10" />

\`\`\`text
## not a heading
:::note
\`\`\`

### Results {#results}
`;

describe('docs structural parity (spec 024)', () => {
    it('accepts a mirror that words everything differently but keeps the structure', () => {
        const russian = english
            .replace('Rolling dice', 'Броски')
            .replace('Roll a pool.', 'Бросьте пул.')
            .replace('Results', 'Итоги');
        expect(structureDifferences(english, russian)).toEqual([]);
    });

    it('reports changed anchors, levels, admonitions, and components', () => {
        const russian = english
            .replace('{#rolling}', '{#broski}')
            .replace('### Results', '## Results')
            .replace(':::tip', ':::note')
            .replace('<Rolls notation="3d10" />', '');
        expect(structureDifferences(english, russian)).toEqual([
            'heading levels differ (2,3 / 2,2)',
            'heading anchors differ (rolling,results / broski,results)',
            'admonitions differ (tip / note)',
            'embedded components differ (Rolls / none)',
        ]);
    });
});
