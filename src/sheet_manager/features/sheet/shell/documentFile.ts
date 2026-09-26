import { migrateDocumentStoreState } from '../../../store/documentStore';
import { exportNotices, resolveDocumentPolicies, systemRegistry } from '../../../systems';
import { isUserKind } from '../../../systems/userTypes';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import { buildTypePayload, type ParsedTypePayload, validateTypePayload } from './typeFile';

/**
 * Document file format: the envelope as stored, minus device-only images, plus the publisher
 * notices its material requires (constitution VIII). Notices are informational; imports ignore
 * them (the envelope schema strips unknown keys).
 */

function isDeviceImage(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        (value as { source?: unknown }).source === 'device'
    );
}

/** The exported object: device-backed images stripped (feature 006 FR-16), notices added. */
export function buildDocumentExport(document: UnknownDocumentEnvelope): Record<string, unknown> {
    const values = document.templateValues ?? {};
    const exportableValues = Object.fromEntries(
        Object.entries(values).filter(([, value]) => !isDeviceImage(value))
    );
    const policies = resolveDocumentPolicies(systemRegistry, document);
    // A user type travels with its documents so they open where the type is not installed.
    const documentType = isUserKind(document.definitionId)
        ? buildTypePayload(document.definitionId)
        : undefined;
    return {
        ...document,
        templateValues: exportableValues,
        ...(policies.length > 0 ? { notices: exportNotices(policies) } : {}),
        ...(documentType ? { documentType } : {}),
    };
}

/** The user type a document file carries, validated; `undefined` when it carries none. */
export function readEmbeddedType(input: unknown): ParsedTypePayload | undefined {
    if (input === null || typeof input !== 'object' || !('documentType' in input)) {
        return undefined;
    }
    return validateTypePayload((input as { documentType: unknown }).documentType);
}

/** JSON text of an export; device portrait ids never leave the device. */
export function serializeDocumentExport(document: UnknownDocumentEnvelope): string {
    return JSON.stringify(
        buildDocumentExport(document),
        (key, value) => (key === 'portraitId' ? undefined : value),
        2
    );
}

/** `ttgamer_<title>.json`; a blank title uses the definition id. */
export function exportFileName(document: UnknownDocumentEnvelope): string {
    const safeName = document.metadata.title.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_');
    return `ttgamer_${safeName || document.definitionId}.json`;
}

/** Parses an imported file: current envelope first, then the legacy character path. */
export function parseImportedDocument(input: unknown): UnknownDocumentEnvelope {
    try {
        return systemRegistry.parseDocument(input).envelope;
    } catch (envelopeError) {
        const migrated = migrateDocumentStoreState({
            characters: [input],
            currentCharacter: input,
        });
        const document = migrated.documents[0];
        if (!document) throw envelopeError;
        return document;
    }
}
