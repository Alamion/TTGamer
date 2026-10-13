import type { UnknownDocumentEnvelope } from '../../types/document';
import { characterDocumentFromCharacter } from './characterDocument';
import { StarWarsCharacterSchema } from './schema';

/**
 * The first versions exported a flat character with its id inside (spec 031). Support is
 * temporary: after this date delete this file, its fixture and tests, and the guidance that
 * names it (`tests/sheet_manager/legacy-export-end.test.ts` fails then and says so).
 */
export const LEGACY_EXPORT_END = '2027-04-13';

export type LegacyRepairKind = 'armor-name' | 'resource-maximum';

/** One change made to an old export so it passes today's rules; no stored value is lost. */
export interface LegacyRepair {
    kind: LegacyRepairKind;
    path: string;
}

export function isLegacyExportSupported(now: Date = new Date()): boolean {
    return now.getTime() < Date.parse(LEGACY_EXPORT_END);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether an untagged file looks like the old flat character (a tagged envelope never does). */
export function looksLikeLegacyExport(raw: unknown): boolean {
    return (
        isRecord(raw) &&
        !('systemId' in raw) &&
        isRecord(raw.metadata) &&
        typeof raw.metadata.template === 'string' &&
        isRecord(raw.attributes)
    );
}

function repairArmor(raw: Record<string, unknown>, repairs: LegacyRepair[]) {
    if (!Array.isArray(raw.armor)) return;
    raw.armor = raw.armor.map((item, index) => {
        if (!isRecord(item) || typeof item.name === 'string' || typeof item.type !== 'string') {
            return item;
        }
        repairs.push({ kind: 'armor-name', path: `armor.${index}.name` });
        return { ...item, name: item.type };
    });
}

/** The old app kept a pair's maximum and current value apart; read a higher current as the maximum. */
function repairPair(raw: Record<string, unknown>, key: string, repairs: LegacyRepair[]) {
    const pair = raw[key];
    if (!isRecord(pair) || typeof pair.current !== 'number' || typeof pair.max !== 'number') return;
    if (pair.current <= pair.max) return;
    raw[key] = { ...pair, max: pair.current };
    repairs.push({ kind: 'resource-maximum', path: `${key}.max` });
}

/** Repairs an old export, then validates it as a Star Wars character. */
export function repairLegacyExport(input: unknown) {
    const repairs: LegacyRepair[] = [];
    const raw = isRecord(input) ? { ...input } : input;
    if (isRecord(raw)) {
        repairArmor(raw, repairs);
        repairPair(raw, 'willpower', repairs);
        repairPair(raw, 'forcePoints', repairs);
    }
    return { character: StarWarsCharacterSchema.parse(raw), repairs };
}

/** The document an old export becomes, with the repairs it needed. */
export function convertLegacyExport(input: unknown): {
    document: UnknownDocumentEnvelope;
    repairs: LegacyRepair[];
} {
    const { character, repairs } = repairLegacyExport(input);
    return { document: characterDocumentFromCharacter(character), repairs };
}
