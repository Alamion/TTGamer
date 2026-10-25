import { embedNames } from '@site/src/shared/markdown/parse';
import { generateId } from '@site/src/shared/utils/random';

import { reportSheetIssue } from '../../diagnostics';
import type { UnknownDocumentEnvelope } from '../../types/document';
import {
    TEMPLATE_VALUES_LIMITS,
    type TemplateImageValue,
    TemplateMarkdownValueSchema,
} from '../../types/templateValues';
import type { DocumentFileFormat } from '../types';
import { NOTE_BODY_KEY, NOTE_LIMITS, NoteDataSchema, noteEnvelope } from './note';

/**
 * A note as a markdown file (spec 043, D9): front matter with the title (other keys stay as they
 * were written), the body verbatim. A note with pictures stored on the device leaves as a zip of
 * the file and an `images/` folder, which an Obsidian vault opens as it is. `yaml`, `fflate`, and
 * the picture storage load only when a file is read or written.
 */

const MAX_FILE_BYTES = 30 * 1024 * 1024;

const IMAGE_TYPES: Readonly<Record<string, string>> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    bmp: 'image/bmp',
};

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const stem = (name: string) => {
    const base = baseName(name);
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(0, dot) : base;
};

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** A markdown text's front matter (without its fences) and its body, as written. */
export function splitFrontMatter(text: string): { frontMatter?: string; body: string } {
    const match = FRONT_MATTER.exec(text);
    if (!match) return { body: text };
    return { frontMatter: match[1] ?? '', body: text.slice(match[0].length) };
}

/** The `title` of front matter and the rest of it, untouched where the title is one line. */
async function readTitle(
    frontMatter: string | undefined
): Promise<{ title?: string; rest?: string }> {
    if (frontMatter === undefined) return {};
    const { isMap, parseDocument } = await import('yaml');
    const document = parseDocument(frontMatter);
    if (document.errors.length > 0 || !isMap(document.contents)) return { rest: frontMatter };
    const title = document.get('title');
    if (title === undefined || title === null) return { rest: frontMatter };
    const text = String(title);
    // A one-line `title:` is cut out of the text, so every other key keeps its bytes.
    const lines = frontMatter.split('\n');
    const at = lines.findIndex((line) => /^title\s*:/.test(line));
    const nextIsPart = at >= 0 && /^[ \t]/.test(lines[at + 1] ?? '');
    let rest: string;
    if (at >= 0 && !nextIsPart) {
        lines.splice(at, 1);
        rest = lines.join('\n');
    } else {
        document.delete('title');
        rest = document.toString();
    }
    return { title: text, ...(rest.trim() ? { rest } : {}) };
}

async function frontMatterBlock(title: string, rest: string | undefined): Promise<string> {
    if (!title && !rest) return '';
    const { stringify } = await import('yaml');
    const titleLine = title ? stringify({ title }) : '';
    const others = rest ? (rest.endsWith('\n') ? rest : `${rest}\n`) : '';
    return `---\n${titleLine}${others}---\n`;
}

/** A file name from a title, safe on every system. */
function fileBase(title: string): string {
    return (
        title
            .replace(/[\\/:*?"<>|#^[\]]/g, '')
            .trim()
            .slice(0, 100) || 'note'
    );
}

function decodeText(bytes: Uint8Array): string {
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        throw new Error('The file is not text.');
    }
    if (text.includes('\u0000')) throw new Error('The file is not text.');
    return text.replace(/^\uFEFF/, '');
}

async function write(document: UnknownDocumentEnvelope): Promise<{ name: string; blob: Blob }> {
    const parsedValue = TemplateMarkdownValueSchema.safeParse(
        document.templateValues[NOTE_BODY_KEY]
    );
    const value = parsedValue.success ? parsedValue.data : { text: '' };
    const data = NoteDataSchema.safeParse(document.data);
    const title = document.metadata.title || (data.success ? data.data.name : '');
    const rest = data.success ? data.data.frontMatter : undefined;
    let body = value.text;
    const device: Array<[string, Extract<TemplateImageValue, { source: 'device' }>]> = [];
    for (const [name, image] of Object.entries(value.images ?? {})) {
        // A web picture leaves as an ordinary markdown image a vault can show.
        if (image.source === 'url')
            body = body.split(`![[${name}]]`).join(`![${name}](${image.url})`);
        else device.push([name, image]);
    }
    const markdown = `${await frontMatterBlock(title, rest)}${body}`;
    const base = fileBase(title);
    if (device.length === 0) {
        return { name: `${base}.md`, blob: new Blob([markdown], { type: 'text/markdown' }) };
    }
    const [{ loadPortrait }, { zipSync, strToU8 }] = await Promise.all([
        import('../../persistence/portraitStorage'),
        import('fflate'),
    ]);
    const entries: Record<string, Uint8Array> = { [`${base}.md`]: strToU8(markdown) };
    for (const [name, image] of device) {
        const blob = await loadPortrait(image.blobId);
        if (blob) entries[`images/${name}`] = new Uint8Array(await blob.arrayBuffer());
    }
    const zipped = zipSync(entries, { level: 6 });
    return {
        name: `${base}.zip`,
        blob: new Blob([zipped.slice().buffer], { type: 'application/zip' }),
    };
}

/** The markdown file of an archive (the one nearest the top) and its pictures by file name. */
async function readArchive(
    bytes: Uint8Array
): Promise<{ name: string; text: string; pictures: Map<string, Uint8Array> }> {
    const { unzipSync } = await import('fflate');
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(bytes, {
            filter: ({ name }) =>
                !name.startsWith('__MACOSX/') &&
                (/\.(md|markdown)$/i.test(name) || extensionOf(name) in IMAGE_TYPES),
        });
    } catch {
        throw new Error('The archive cannot be opened.');
    }
    const markdown = Object.keys(files)
        .filter((name) => /\.(md|markdown)$/i.test(name))
        .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0];
    if (!markdown) throw new Error('The archive holds no markdown file.');
    const pictures = new Map<string, Uint8Array>();
    for (const [path, content] of Object.entries(files)) {
        if (extensionOf(path) in IMAGE_TYPES && !pictures.has(baseName(path))) {
            pictures.set(baseName(path), content);
        }
    }
    return { name: markdown, text: decodeText(files[markdown]!), pictures };
}

async function storePictures(
    body: string,
    pictures: ReadonlyMap<string, Uint8Array>
): Promise<Record<string, TemplateImageValue> | undefined> {
    const wanted = [...embedNames(body)].filter((name) => pictures.has(name));
    if (wanted.length === 0) return undefined;
    const { MARKDOWN_IMAGE_LIMITS, savePortrait } =
        await import('../../persistence/portraitStorage');
    const images: Record<string, TemplateImageValue> = {};
    for (const name of wanted.slice(0, TEMPLATE_VALUES_LIMITS.markdownImagesMax)) {
        const bytes = pictures.get(name)!;
        const file = new File([bytes.slice().buffer], name, {
            type: IMAGE_TYPES[extensionOf(name)],
        });
        try {
            images[name] = {
                source: 'device',
                blobId: await savePortrait(file, MARKDOWN_IMAGE_LIMITS),
            };
        } catch (error) {
            reportSheetIssue({
                code: 'markdown-image-rejected',
                message: 'A picture of an imported note could not be stored; its reference stays',
                details: { name, error: String(error) },
            });
        }
    }
    return Object.keys(images).length > 0 ? images : undefined;
}

async function read(file: { name: string; bytes: Uint8Array }): Promise<UnknownDocumentEnvelope> {
    if (file.bytes.length > MAX_FILE_BYTES) throw new Error('The file is larger than 30 MB.');
    const archive = extensionOf(file.name) === 'zip' ? await readArchive(file.bytes) : undefined;
    const text = archive ? archive.text : decodeText(file.bytes);
    const { frontMatter, body } = splitFrontMatter(text);
    if (body.length > TEMPLATE_VALUES_LIMITS.markdownMaxLength) {
        throw new Error(
            `The text is longer than ${TEMPLATE_VALUES_LIMITS.markdownMaxLength} characters.`
        );
    }
    const { title, rest } = await readTitle(frontMatter);
    if (rest && rest.length > NOTE_LIMITS.frontMatter) {
        throw new Error(`The front matter is longer than ${NOTE_LIMITS.frontMatter} characters.`);
    }
    const name = (title ?? stem(archive?.name ?? file.name)).slice(0, NOTE_LIMITS.name);
    const images = archive ? await storePictures(body, archive.pictures) : undefined;
    const envelope = noteEnvelope(generateId(), name, '');
    return {
        ...envelope,
        templateValues: { [NOTE_BODY_KEY]: { text: body, ...(images ? { images } : {}) } },
        data: NoteDataSchema.parse({ name, ...(rest ? { frontMatter: rest } : {}) }),
    };
}

export const noteFileFormat: DocumentFileFormat = {
    extensions: ['.md', '.markdown', '.zip'],
    mediaTypes: ['text/markdown', 'application/zip'],
    write,
    read,
};
