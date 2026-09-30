import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { penaltyText, trackerDisplayOf } from '../../../features/sheet/data/trackerModel';
import { TRACK_MARK_IDS, type TrackBinding } from '../../../systems/templateBindings';
import type {
    PrimitiveNode,
    TrackerMarkKind,
    TrackerOverride,
    TrackerPaletteFill,
} from '../../../types/template';
import type { NodeUpdates } from './draft';
import type { TrackerSettingsGame, TrackerSettingsValue } from './TrackerSettings';

const fields = uiMessages.sheet.documents.fields;
const tracks = uiMessages.sheet.tracks;

const GAME_FILL: Record<string, TrackerPaletteFill> = { slash: 'secondary', cross: 'error' };
const GAME_SYMBOL: Record<string, string> = { slash: '╱', cross: '×' };

function gameMarks(binding: TrackBinding) {
    return (
        binding.marks?.map((mark) => ({
            id: mark.id,
            name: mark.translation ? translate(mark.translation) : mark.label,
        })) ?? TRACK_MARK_IDS.map((id) => ({ id, name: translate(tracks.tracker[id]) }))
    );
}

function gameLevels(binding: TrackBinding) {
    return binding.length
        ? []
        : binding.levels.map((level) => ({
              id: level.id,
              name: level.translation ? translate(level.translation) : level.label,
              value: penaltyText(level.penalty),
          }));
}

/** A legacy `track` override whose level count differs from the game's still sets the levels. */
function legacyCount(node: PrimitiveNode, binding: TrackBinding): boolean {
    return node.track !== undefined && node.track.names.length !== gameLevels(binding).length;
}

/**
 * A built-in tracker's settings as the shared settings panel shows them: the page's overrides,
 * empty where the game's own text applies (the game's text is the placeholder).
 */
export function builtInSettings(
    node: PrimitiveNode,
    binding: TrackBinding,
    onUseGameLevels: () => void
): { value: TrackerSettingsValue; game: TrackerSettingsGame } {
    const settings = node.tracker;
    const game = gameLevels(binding);
    const legacy = legacyCount(node, binding);
    const baseLevels = legacy
        ? node.track!.names.map((name, index) => ({ id: `level-${index}`, name, value: '' }))
        : game;
    return {
        value: {
            display: trackerDisplayOf(node, binding.length !== undefined),
            marks: gameMarks(binding).map(({ id }): TrackerMarkKind => {
                const override = settings?.marks?.[id];
                return {
                    id,
                    name: override?.name ?? '',
                    symbol: override?.symbol ?? '',
                    fill: override?.fill ?? GAME_FILL[id]!,
                };
            }),
            levels: baseLevels.map((level, index) => ({
                id: level.id,
                name:
                    settings?.levels?.[index]?.name ??
                    (legacy ? level.name : (node.track?.names[index] ?? '')),
                value: settings?.levels?.[index]?.value ?? '',
            })),
            valueColumn: settings?.valueColumn ?? { show: binding.length === undefined },
            columns: settings?.columns ?? [],
            total: settings?.total ?? binding.members !== undefined,
            lengths: [],
            out: false,
        },
        game: {
            levels: legacy ? baseLevels : game,
            marks: gameMarks(binding).map(({ id, name }) => ({ name, symbol: GAME_SYMBOL[id]! })),
            ...(legacy ? { legacyLevels: { onUseGame: onUseGameLevels } } : {}),
            marksColumn: translate(
                binding.members?.trackKey === 'health' ? fields.health : fields.damage
            ),
        },
    };
}

/** Node updates for a change made in the shared settings panel of a built-in tracker. */
export function builtInSettingsUpdate(
    node: PrimitiveNode,
    binding: TrackBinding,
    change: Partial<TrackerSettingsValue>
): NodeUpdates {
    const next: TrackerOverride = { ...node.tracker };
    const updates: NodeUpdates = {};
    if (change.display) {
        next.display = change.display;
        // One setting replaces the compact flag and the old view (FR-012).
        updates.compact = false;
        updates.trackLayout = undefined;
    }
    if (change.marks) {
        const marks: NonNullable<TrackerOverride['marks']> = {};
        for (const mark of change.marks) {
            const entry: NonNullable<TrackerOverride['marks']>[string] = {};
            if (mark.name) entry.name = mark.name;
            if (mark.symbol) entry.symbol = mark.symbol;
            if (mark.fill !== GAME_FILL[mark.id]) entry.fill = mark.fill;
            if (Object.keys(entry).length > 0) marks[mark.id] = entry;
        }
        if (Object.keys(marks).length > 0) next.marks = marks;
        else delete next.marks;
    }
    if (change.levels) {
        const legacy = legacyCount(node, binding);
        if (legacy) {
            updates.track = {
                levels: node.track!.levels,
                names: change.levels.map((level, index) => level.name || node.track!.names[index]!),
            };
        } else if (node.track) {
            // Names now live with the page's tracker settings.
            updates.track = undefined;
        }
        const levels = change.levels.map((level) => {
            const entry: { name?: string; value?: string } = {};
            if (level.name && !legacy) entry.name = level.name;
            if (level.value) entry.value = level.value;
            return Object.keys(entry).length > 0 ? entry : null;
        });
        while (levels.length > 0 && levels[levels.length - 1] === null) levels.pop();
        if (levels.length > 0) next.levels = levels;
        else delete next.levels;
    }
    if (change.valueColumn) next.valueColumn = change.valueColumn;
    if (change.columns) {
        if (change.columns.length > 0) next.columns = change.columns;
        else delete next.columns;
    }
    if (change.total !== undefined) next.total = change.total;
    updates.tracker = next;
    return updates;
}
