// @vitest-environment happy-dom
import { MarkdownView } from '@site/src/shared/components/markdown/MarkdownView';
import { parseMarkdown } from '@site/src/shared/markdown/parse';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** A note of about `length` characters with distinct lines, using every kind of block. */
function note(length: number, variant = 0): string {
    const chunk = (step: number) => {
        const index = `${String(variant)}-${String(step)}`;
        return [
            `## Scene **${index}** at the ==docks==`,
            `Ines waits ${index}; see [the map](https://e.org/map/${index}) and [[Bruno ${index}]].`,
            `- [ ] ask about shipment ${index}`,
            `  - [x] bribe guard ${index} \`dice: 3d10>=6\``,
            `> [!spoiler]- What is really going on ${index}`,
            `> The crates ${index} hold *nothing* but ~~guns~~ sand.`,
            '| NPC | Motive |',
            '|---|---|',
            `| Ines | money ${index} |`,
            '',
        ].join('\n');
    };
    const parts: string[] = [];
    let size = 0;
    for (let index = 0; size < length; index += 1) {
        const part = chunk(index);
        parts.push(part);
        size += part.length + 1;
    }
    return parts.join('\n').slice(0, length);
}

/** The best of several runs after a warm-up, in milliseconds. */
function best(runs: number, work: () => void): number {
    work();
    let fastest = Infinity;
    for (let run = 0; run < runs; run += 1) {
        const started = performance.now();
        work();
        fastest = Math.min(fastest, performance.now() - started);
    }
    return fastest;
}

describe('markdown performance (spec 043 SC-002)', () => {
    const large = note(300_000);

    it('parses a note at the 300,000-character limit within 200 ms', () => {
        // A new text each run: the line cache must not answer for it.
        let variant = 0;
        expect(best(3, () => parseMarkdown(note(300_000, (variant += 1))))).toBeLessThan(200);
    });

    it('catches up with an edited line of that note within 200 ms', () => {
        const lines = large.split('\n');
        const view = render(<MarkdownView source={large} />);
        let typed = 0;
        const edit = () => {
            typed += 1;
            lines[2000] = `${lines[2000] ?? ''}x`;
            const started = performance.now();
            view.rerender(<MarkdownView source={lines.join('\n')} />);
            return performance.now() - started;
        };
        edit();
        let fastest = Infinity;
        for (let run = 0; run < 3; run += 1) fastest = Math.min(fastest, edit());
        cleanup();
        expect(typed).toBe(4);
        expect(fastest).toBeLessThan(200);
    }, 60_000);
});
