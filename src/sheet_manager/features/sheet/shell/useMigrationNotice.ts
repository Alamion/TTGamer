import { translate } from '@docusaurus/Translate';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import { reportSheetIssue } from '../../../diagnostics';
import type { DocumentDefinition } from '../../../systems/types';
import type { UnknownDocumentEnvelope } from '../../../types/document';

const STORAGE_KEY = 'ttgamer:document-migration-notices:v1';
const MAX_ACKNOWLEDGMENTS = 500;

function readAcknowledgments(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return [];
        if (raw.length > MAX_ACKNOWLEDGMENTS * 512) throw new Error('Acknowledgments too large');
        const parsed: unknown = JSON.parse(raw);
        if (
            !Array.isArray(parsed) ||
            parsed.length > MAX_ACKNOWLEDGMENTS ||
            parsed.some((id) => typeof id !== 'string' || id.length > 512)
        ) {
            throw new Error('Invalid acknowledgment list');
        }
        return parsed;
    } catch {
        reportSheetIssue({
            code: 'document-migration-notice-failed',
            message: 'Document migration acknowledgments could not be read',
            details: { operation: 'read' },
        });
        return [];
    }
}

/** A conversion explanation is device feedback, not a mutation of the character. */
export function useMigrationNotice(
    document: UnknownDocumentEnvelope | null,
    definition: DocumentDefinition | undefined
): void {
    const shown = useRef(new Set<string>());
    useEffect(() => {
        if (!document || !definition?.migrationNotice) return;
        const notice = definition.migrationNotice(document.data);
        if (!notice) return;
        const id = `${document.id}:${notice.id}`;
        if (shown.current.has(id)) return;
        shown.current.add(id);
        if (shown.current.size > MAX_ACKNOWLEDGMENTS) {
            shown.current.delete(shown.current.values().next().value!);
        }
        const acknowledged = readAcknowledgments();
        if (acknowledged.includes(id)) return;
        toast(translate(notice.message), { id, duration: 10_000 });
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify([...acknowledged, id].slice(-MAX_ACKNOWLEDGMENTS))
            );
        } catch {
            reportSheetIssue({
                code: 'document-migration-notice-failed',
                message: 'Document migration acknowledgment could not be saved',
                details: { operation: 'write' },
            });
        }
    }, [document, definition]);
}
