import type { DiceGroupNode, DiceModifiers, DiceRoll } from './types';

export function buildGroupKey(
    node: DiceGroupNode | { count: number; sides: number; fudge: boolean; customFaces?: number[] },
    index: number
): string {
    return `${node.count}d${node.sides}_${node.fudge ? 'f' : ''}_${index}_${node.customFaces ? node.customFaces.join(',') : ''}`;
}

export function formatModifiers(modifiers: DiceModifiers): string {
    const parts: string[] = [];
    if (modifiers.min) parts.push(`min${modifiers.min}`);
    if (modifiers.max) parts.push(`max${modifiers.max}`);
    if (modifiers.explode) {
        const e = modifiers.explode;
        if (e.compounding && e.penetrating) {
            parts.push(
                `!!p${e.comparePoint ? `${e.comparePoint.operator}${e.comparePoint.value}` : ''}`
            );
        } else if (e.penetrating) {
            parts.push(
                `!p${e.comparePoint ? `${e.comparePoint.operator}${e.comparePoint.value}` : ''}`
            );
        } else if (e.compounding) {
            parts.push(
                `!!${e.comparePoint ? `${e.comparePoint.operator}${e.comparePoint.value}` : ''}`
            );
        } else {
            parts.push(
                `!${e.comparePoint ? `${e.comparePoint.operator}${e.comparePoint.value}` : ''}`
            );
        }
    }
    if (modifiers.reroll) {
        const r = modifiers.reroll;
        const prefix = r.once ? 'ro' : 'r';
        if (r.comparePoint) {
            parts.push(`${prefix}${r.comparePoint.operator}${r.comparePoint.value}`);
        } else {
            parts.push(prefix);
        }
    }
    if (modifiers.unique) {
        const u = modifiers.unique;
        const prefix = u.once ? 'uo' : 'u';
        if (u.comparePoint) {
            parts.push(`${prefix}${u.comparePoint.operator}${u.comparePoint.value}`);
        } else {
            parts.push(prefix);
        }
    }
    if (modifiers.keepHighest) parts.push(`kh${modifiers.keepHighest}`);
    if (modifiers.keepLowest) parts.push(`kl${modifiers.keepLowest}`);
    if (modifiers.dropHighest) parts.push(`dh${modifiers.dropHighest}`);
    if (modifiers.dropLowest) parts.push(`dl${modifiers.dropLowest}`);
    if (modifiers.targetSuccess) {
        const ts = modifiers.targetSuccess;
        parts.push(`${ts.operator}${ts.value}`);
    }
    if (modifiers.targetFailure) {
        const tf = modifiers.targetFailure;
        parts.push(`f${tf.operator}${tf.value}`);
    }
    if (modifiers.criticalSuccess) {
        const botch = modifiers.criticalSuccessBotch ? 'b' : '';
        if (modifiers.criticalSuccess === true) {
            parts.push(`cs${botch}`);
        } else {
            const cs = modifiers.criticalSuccess;
            parts.push(`cs${botch}${cs.operator}${cs.value}`);
        }
    }
    if (modifiers.criticalFailure) {
        const botch = modifiers.criticalFailureBotch ? 'b' : '';
        if (modifiers.criticalFailure === true) {
            parts.push(`cf${botch}`);
        } else {
            const cf = modifiers.criticalFailure;
            parts.push(`cf${botch}${cf.operator}${cf.value}`);
        }
    }
    if (modifiers.sort) parts.push(modifiers.sort === 'asc' ? 's' : 'sd');
    return parts.join('');
}

export function applyKeepDrop(rolls: DiceRoll[], modifiers: DiceModifiers): DiceRoll[] {
    if (modifiers.keepHighest) {
        const sorted = [...rolls]
            .map((r, idx) => ({ roll: r, idx }))
            .sort((a, b) => b.roll.value - a.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepHighest).map((s) => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    }

    if (modifiers.keepLowest) {
        const sorted = [...rolls]
            .map((r, idx) => ({ roll: r, idx }))
            .sort((a, b) => a.roll.value - b.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepLowest).map((s) => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    }

    if (modifiers.dropHighest) {
        const sorted = [...rolls]
            .map((r, idx) => ({ roll: r, idx }))
            .sort((a, b) => b.roll.value - a.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropHighest).map((s) => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    }

    if (modifiers.dropLowest) {
        const sorted = [...rolls]
            .map((r, idx) => ({ roll: r, idx }))
            .sort((a, b) => a.roll.value - b.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropLowest).map((s) => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    }

    return rolls;
}

export function formatRollValues(rolls: DiceRoll[], divider: ',' | '+'): string {
    if (divider === ',') {
        return rolls
            .map((r) => {
                let s = r.faceLabel ?? String(r.value);
                if (r.minRaised) {
                    s = `${s}^`;
                }
                if (r.maxCapped) {
                    s = `${s}v`;
                }
                if (r.dropped) {
                    s = `~~${s}~~`;
                } else if (r.compounded) {
                    s = `${s}!!`;
                } else if (r.exploded) {
                    s = r.penetrating ? `${s}!p` : `${s}!`;
                } else if (r.criticalSuccessBotch) {
                    s = `${s}***`;
                } else if (r.criticalFailureBotch) {
                    s = `${s}___`;
                } else if (r.criticalSuccess) {
                    s = `${s}**`;
                } else if (r.criticalFailure) {
                    s = `${s}__`;
                } else if (r.targetSuccess) {
                    s = `${s}*`;
                } else if (r.targetFailure) {
                    s = `${s}_`;
                }
                return s;
            })
            .join(', ');
    } else {
        const hasTargetFlags = rolls.some((r) => r.hasTarget);
        const new_rolls = rolls
            .filter((r) => !r.dropped)
            .map((r) => {
                let valStr: string;
                if (hasTargetFlags) {
                    valStr = r.targetSuccess ? '1' : r.targetFailure ? '-1' : '0';
                } else {
                    valStr = String(r.value);
                }
                if (r.criticalSuccessBotch) {
                    valStr += '+1';
                } else if (r.criticalFailureBotch) {
                    valStr += '-1';
                }
                return valStr;
            })
            .join('+');
        return new_rolls.replace(/\+-/g, '-');
    }
}
