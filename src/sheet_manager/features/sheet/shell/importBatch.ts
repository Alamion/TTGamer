import { generateId } from '@site/src/shared/utils/random';

import { describeError } from '../../../diagnostics';
import { type ImportRepair, readLegacyExport } from '../../../store/documentStore';
import { systemRegistry } from '../../../systems';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import { readEmbeddedType } from './documentFile';
import { readRecoveryFile } from './recoveryFile';
import { installTypePayload, rewriteTypeIdentity, typeInstallState } from './typeFile';

export type ConflictChoice = 'replace' | 'duplicate' | 'cancel';

export interface ConflictAnswer {
    choice: ConflictChoice;
    /** Use the choice for every later collision of the same batch. */
    applyToRest: boolean;
}

/** What the batch needs from the app; the shell supplies the stores and the dialogs. */
export interface ImportHost {
    hasDocument: (id: string) => boolean;
    importDocument: (document: UnknownDocumentEnvelope) => void;
    /** Keeps a rejected file's content for recovery; false when there is no room. */
    retain: (content: unknown, reason: string, recordId?: string) => boolean;
    /** Drops a kept record whose file has now been imported. */
    forget?: (recordId: string) => void;
    askConflict: (subject: 'document' | 'type') => Promise<ConflictAnswer>;
    now?: () => Date;
}

export interface ImportFile {
    name: string;
    text: string;
    /** Why a file of a kind's own format could not become a document (spec 043). */
    rejected?: string;
}

export type RejectionCode = 'not-json' | 'unknown-shape' | 'legacy-ended' | 'invalid';

export interface FileOutcome {
    file: string;
    status: 'imported' | 'skipped' | 'rejected';
    title?: string;
    repairs: ImportRepair[];
    reason?: { code: RejectionCode; detail?: string };
    /** Rejected files only: false when the recovery collection was full. */
    kept?: boolean;
}

export interface BatchSummary {
    outcomes: FileOutcome[];
    imported: number;
    skipped: number;
    rejected: number;
    /** Files that needed a repair to import. */
    repaired: number;
}

class Rejection extends Error {
    code: RejectionCode;

    constructor(code: RejectionCode, detail?: string) {
        super(detail ?? code);
        this.code = code;
    }
}

function parseOrUndefined(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

/** The document a parsed file stands for, and the repairs it needed. */
function readDocument(
    raw: unknown,
    now: Date
): { document: UnknownDocumentEnvelope; repairs: ImportRepair[] } {
    const tagged = typeof raw === 'object' && raw !== null && 'systemId' in raw;
    if (tagged) {
        try {
            return { document: systemRegistry.parseDocument(raw).envelope, repairs: [] };
        } catch (error) {
            throw new Rejection('invalid', describeError(error));
        }
    }
    let legacy: ReturnType<typeof readLegacyExport>;
    try {
        legacy = readLegacyExport(raw, now);
    } catch (error) {
        throw new Rejection('invalid', describeError(error));
    }
    if (legacy.status === 'not-legacy') throw new Rejection('unknown-shape');
    if (legacy.status === 'ended') throw new Rejection('legacy-ended');
    return { document: legacy.document, repairs: legacy.repairs };
}

/**
 * Imports files one by one: a file that fails is kept for recovery and never stops the rest, and
 * nothing is stored before its document and the type it carries are valid.
 */
export async function runImportBatch(
    files: readonly ImportFile[],
    host: ImportHost
): Promise<BatchSummary> {
    const remembered: Partial<Record<'document' | 'type', ConflictChoice>> = {};
    const resolve = async (subject: 'document' | 'type'): Promise<ConflictChoice> => {
        const earlier = remembered[subject];
        if (earlier) return earlier;
        const { choice, applyToRest } = await host.askConflict(subject);
        if (applyToRest) remembered[subject] = choice;
        return choice;
    };

    const outcomes: FileOutcome[] = [];

    /** A file to import: its text, or a record of an earlier rejection that is retried. */
    interface Job {
        name: string;
        source: { text: string } | { content: unknown };
        recordId?: string;
    }

    const importJob = async ({ name, source, recordId }: Job) => {
        let raw: unknown;
        try {
            if ('text' in source) {
                try {
                    raw = JSON.parse(source.text);
                } catch {
                    raw = source.text;
                    throw new Rejection('not-json');
                }
            } else {
                raw = source.content;
            }
            if (
                recordId !== undefined &&
                typeof raw === 'object' &&
                raw !== null &&
                'ttgRecovery' in raw
            ) {
                throw new Rejection('unknown-shape');
            }
            const { document: parsed, repairs } = readDocument(raw, host.now?.() ?? new Date());
            let document = parsed;

            const embedded = readEmbeddedType(raw);
            if (embedded && !embedded.ok) throw new Rejection('invalid', embedded.error);
            if (embedded?.ok) {
                let payload = embedded.payload;
                const state = typeInstallState(payload);
                if (state === 'conflict') {
                    const choice = await resolve('type');
                    if (choice === 'cancel') {
                        outcomes.push({ file: name, status: 'skipped', repairs: [] });
                        return;
                    }
                    if (choice === 'duplicate') payload = rewriteTypeIdentity(payload);
                }
                if (state !== 'same') installTypePayload(payload);
                if (document.definitionId !== payload.type.id) {
                    document = {
                        ...document,
                        kind: payload.type.id as UnknownDocumentEnvelope['kind'],
                        definitionId: payload.type.id as UnknownDocumentEnvelope['definitionId'],
                    };
                }
            }

            if (host.hasDocument(document.id)) {
                const choice = await resolve('document');
                if (choice === 'cancel') {
                    outcomes.push({
                        file: name,
                        status: 'skipped',
                        title: document.metadata.title,
                        repairs,
                    });
                    return;
                }
                if (choice === 'duplicate') document = { ...document, id: generateId() };
            }
            host.importDocument(document);
            if (recordId !== undefined) host.forget?.(recordId);
            outcomes.push({
                file: name,
                status: 'imported',
                title: document.metadata.title || document.definitionId,
                repairs,
            });
        } catch (error) {
            const reason =
                error instanceof Rejection
                    ? {
                          code: error.code,
                          ...(error.message !== error.code && { detail: error.message }),
                      }
                    : { code: 'invalid' as const, detail: describeError(error) };
            const kept =
                raw === undefined
                    ? false
                    : host.retain(raw, reason.detail ?? reason.code, recordId);
            outcomes.push({ file: name, status: 'rejected', repairs: [], reason, kept });
        }
    };

    for (const { name, text, rejected } of files) {
        if (rejected !== undefined) {
            const kept = text ? host.retain(text, rejected) : false;
            outcomes.push({
                file: name,
                status: 'rejected',
                repairs: [],
                reason: { code: 'invalid', detail: rejected },
                kept,
            });
            continue;
        }
        let records: ReturnType<typeof readRecoveryFile>;
        try {
            records = readRecoveryFile(parseOrUndefined(text));
        } catch (error) {
            const detail = describeError(error);
            const kept = host.retain(text, detail);
            outcomes.push({
                file: name,
                status: 'rejected',
                repairs: [],
                reason: { code: 'invalid', detail },
                kept,
            });
            continue;
        }
        if (!records) {
            await importJob({ name, source: { text } });
            continue;
        }
        // A recovery file is not a document: each record is retried as a file of its own.
        for (const [index, record] of records.entries()) {
            const content = record.content;
            await importJob({
                name: `${name} #${index + 1}`,
                source: typeof content === 'string' ? { text: content } : { content },
                recordId: record.id,
            });
        }
    }

    const count = (status: FileOutcome['status']) =>
        outcomes.filter((outcome) => outcome.status === status).length;
    return {
        outcomes,
        imported: count('imported'),
        skipped: count('skipped'),
        rejected: count('rejected'),
        repaired: outcomes.filter(({ repairs }) => repairs.length > 0).length,
    };
}
