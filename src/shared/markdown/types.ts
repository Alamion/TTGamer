/** Inline content of a markdown block. No node ever carries HTML: text is rendered as text. */
export type MarkdownInline =
    | { type: 'text'; text: string }
    | { type: 'strong' | 'em' | 'del' | 'mark'; children: MarkdownInline[] }
    | { type: 'code'; code: string }
    | { type: 'link'; href: string; title?: string; children: MarkdownInline[] }
    | { type: 'image'; src: string; alt: string; title?: string }
    /** `![[name]]` or `![[name|alt]]`: an embed the renderer resolves or shows as inert text. */
    | { type: 'embed'; name: string; alt?: string }
    /** `[[target]]` or `[[target|alias]]`: kept verbatim, shown as inert link-styled text. */
    | { type: 'wikilink'; target: string; alias?: string };

export type MarkdownAlign = 'left' | 'center' | 'right' | null;

export interface MarkdownListItem {
    children: MarkdownInline[];
    /** A task item and the source line its checkbox is on (0-based). */
    task?: { checked: boolean; line: number };
    lists: MarkdownListBlock[];
}

export interface MarkdownListBlock {
    type: 'list';
    ordered: boolean;
    start: number;
    items: MarkdownListItem[];
}

export type MarkdownBlock =
    | { type: 'heading'; level: number; children: MarkdownInline[] }
    | { type: 'paragraph'; children: MarkdownInline[] }
    | { type: 'rule' }
    | { type: 'code'; language: string; code: string }
    | { type: 'quote'; children: MarkdownBlock[] }
    | {
          type: 'callout';
          /** Lowercase callout type as written (`note`, `spoiler`, any other word). */
          kind: string;
          title: MarkdownInline[];
          /** `-` starts folded, `+` starts open, no marker cannot fold. */
          fold: 'closed' | 'open' | null;
          children: MarkdownBlock[];
      }
    | MarkdownListBlock
    | {
          type: 'table';
          align: MarkdownAlign[];
          head: MarkdownInline[][];
          rows: MarkdownInline[][][];
      };

/** A top-level block with the source it came from, so a renderer can skip unchanged ones. */
export interface MarkdownTopBlock {
    block: MarkdownBlock;
    /** The block's source lines joined; equal sources render equally. */
    source: string;
    /** First source line (0-based). */
    line: number;
}
