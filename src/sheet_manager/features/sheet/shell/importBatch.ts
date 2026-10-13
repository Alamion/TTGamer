import { generateId } from '@site/src/shared/utils/random';

import { describeError } from '../../../diagnostics';
import { type ImportRepair, readLegacyExport } from '../../../store/documentStore';
import { systemRegistry } from '../../../systems';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import { readEmbeddedType } from './documentFile';
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
    /** Keeps a rejected file's content for recovery. */
    retain: (content: unknown, reason: string) => void;
    askConflict: (subject: 'document' | 'type') => Promise<ConflictAnswer>;
    now?: () => Date;
}

export interface ImportFile {
    name: string;
    text: string;
}

export type RejectionCode = 'not-json' | 'unknown-shape' | 'legacy-ended' | 'invalid';

export interface FileOutcome {
    file: string;
    status: 'imported' | 'skipped' | 'rejected';
    title?: string;
    repairs: ImportRepair[];
    reason?: { code: RejectionCode; detail?: string };
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
    for (const { name, text } of files) {
        let raw: unknown;
        try {
            try {
                raw = JSON.parse(text);
            } catch {
                raw = text;
                throw new Rejection('not-json');
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
                        continue;
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
                    continue;
                }
                if (choice === 'duplicate') document = { ...document, id: generateId() };
            }
            host.importDocument(document);
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
            if (raw !== undefined) host.retain(raw, reason.detail ?? reason.code);
            outcomes.push({ file: name, status: 'rejected', repairs: [], reason });
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
