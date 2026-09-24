import { type LexerToken, tokenize } from './dice-lexer';
import { parseToAST } from './dice-parser';
import type { ASTNode, ComparePoint, DiceGroupNode } from './types';
import { formatSetBonus } from './utils';

export interface NotationPart {
    raw: string;
    count: number;
    sides: number | 'F';
    modifier: string;
    /** `:h` right after the dice marks the pool's special subset; part of the merge key. */
    label?: 'h';
}

function reconstructText(tokens: LexerToken[]): string {
    return tokens.map((t) => t.text).join('');
}

export function parseParts(notation: string): NotationPart[] {
    if (!notation.trim()) return [];

    const tokens = tokenize(notation);
    const segments: LexerToken[][] = [];
    let current: LexerToken[] = [];

    for (const token of tokens) {
        if (token.type === 'PLUS') {
            if (current.length > 0) {
                segments.push(current);
                current = [];
            }
        } else if (token.type !== 'END') {
            current.push(token);
        }
    }
    if (current.length > 0) {
        segments.push(current);
    }

    return segments.map((segTokens) => {
        const raw = reconstructText(segTokens);
        const diceToken = segTokens.find((t) => t.type === 'DICE');
        if (!diceToken) {
            return { raw, count: 0, sides: 0 as const, modifier: '' };
        }

        const val = diceToken.value as { count: number; sides: number; fudge: boolean };
        const diceIdx = segTokens.indexOf(diceToken);
        const labelled = segTokens[diceIdx + 1]?.type === 'LABEL';
        const modifier = reconstructText(segTokens.slice(diceIdx + (labelled ? 2 : 1)));

        return {
            raw,
            count: val.count,
            sides: val.fudge ? ('F' as const) : val.sides,
            modifier,
            ...(labelled ? { label: 'h' as const } : {}),
        };
    });
}

export function makePartRaw(
    count: number,
    sides: number | 'F',
    modifier: string,
    label?: 'h'
): string {
    const sidesStr = sides === 'F' ? 'F' : String(sides);
    const prefix = count === 1 ? '' : String(count);
    return `${prefix}d${sidesStr}${label ? `:${label}` : ''}${modifier}`;
}

export function findLastMatch(parts: NotationPart[], sides: number | 'F', label?: 'h'): number {
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].sides === sides && parts[i].label === label) return i;
    }
    return -1;
}

export function applyAdvantage(prev: string): string {
    if (!prev.trim()) return '2d20kh1';
    const parts = parseParts(prev);

    let firstMatch = true;
    let foundOpposite = false;
    let foundBare = false;
    const out = parts.map((p) => {
        if (p.sides !== 20) return p.raw;
        if (!firstMatch) return p.raw;

        if (p.modifier && (p.modifier.startsWith('kl') || p.modifier.startsWith('dh'))) {
            foundOpposite = true;
            const half = p.count / 2;
            firstMatch = false;
            if (Number.isInteger(half) && half >= 1) return half === 1 ? 'd20' : `${half}d20`;
            return 'd20';
        }
        if (!p.modifier) {
            foundBare = true;
            firstMatch = false;
            return `${p.count * 2}d20kh${p.count}`;
        }
        return p.raw;
    });

    let result = out.join(' + ');
    if (!foundOpposite && !foundBare) {
        result = result ? `${result} + 2d20kh1` : '2d20kh1';
    }
    return result;
}

export function applyDisadvantage(prev: string): string {
    if (!prev.trim()) return '2d20kl1';
    const parts = parseParts(prev);

    let firstMatch = true;
    let foundOpposite = false;
    let foundBare = false;
    const out = parts.map((p) => {
        if (p.sides !== 20) return p.raw;
        if (!firstMatch) return p.raw;

        if (p.modifier && (p.modifier.startsWith('kh') || p.modifier.startsWith('dl'))) {
            foundOpposite = true;
            const half = p.count / 2;
            firstMatch = false;
            if (Number.isInteger(half) && half >= 1) return half === 1 ? 'd20' : `${half}d20`;
            return 'd20';
        }
        if (!p.modifier) {
            foundBare = true;
            firstMatch = false;
            return `${p.count * 2}d20kl${p.count}`;
        }
        return p.raw;
    });

    let result = out.join(' + ');
    if (!foundOpposite && !foundBare) {
        result = result ? `${result} + 2d20kl1` : '2d20kl1';
    }
    return result;
}

export function splitD100Value(value: number): { tens: string; ones: string } {
    const rawTens = Math.floor(value / 10) * 10;
    const tens = rawTens === 0 || rawTens === 100 ? '00' : rawTens.toString();
    const ones = (value % 10).toString();
    return { tens, ones };
}

export function splitTopLevel(notation: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const c of notation) {
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (c === '+' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += c;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function matchingParenIndex(text: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')' && --depth === 0) return i;
    }
    return -1;
}

/**
 * Merges into the innermost leading group that holds a matching face; the added die's
 * modifiers replace that group's own, while modifiers of enclosing groups are kept.
 */
function mergeIntoGroup(
    part: string,
    addedCount: number,
    addedFace: string,
    addedModifiers: string
): string | null {
    const close = matchingParenIndex(part, 0);
    if (close === -1) return null;
    const inner = part.slice(1, close);
    const rest = part.slice(close + 1);
    const innerParts = splitTopLevel(inner);

    const hasMatchingFace = innerParts.some(
        (ip) => ip.match(/^\d+(d\d+(?::h)?)$/)?.[1] === addedFace
    );
    if (hasMatchingFace) return `(${inner}+${addedCount}${addedFace})${addedModifiers}`;

    if (innerParts.length === 1 && innerParts[0].startsWith('(')) {
        const nested = mergeIntoGroup(innerParts[0], addedCount, addedFace, addedModifiers);
        if (nested !== null) return `(${nested})${rest}`;
    }
    return null;
}

export function mergeDiceNotation(existing: string, added: string): string {
    if (!existing) return added;

    // A face key includes the `:h` label, so labelled and plain dice never merge.
    const addedMatch = added.match(/^(\d+)?(d\d+(?::h)?)([\s\S]*)$/);
    if (!addedMatch) return `${existing} + ${added}`;

    const addedCount = parseInt(addedMatch[1] || '1', 10);
    const addedFace = addedMatch[2];
    const addedModifiers = addedMatch[3];

    const parts = splitTopLevel(existing);
    let foundMatch = false;
    const newParts: string[] = [];

    for (const part of parts) {
        if (foundMatch) {
            const pMatch = part.match(/^\(?(\d+)?(d\d+(?::h)?)/);
            if (pMatch && pMatch[2] === addedFace) continue;
            newParts.push(part);
            continue;
        }

        if (part.startsWith('(')) {
            const merged = mergeIntoGroup(part, addedCount, addedFace, addedModifiers);
            if (merged !== null) {
                foundMatch = true;
                newParts.push(merged);
            } else {
                newParts.push(part);
            }
            continue;
        }

        const simpleMatch = part.match(/^(\d+)?(d\d+(?::h)?)([\s\S]*)$/);
        if (simpleMatch && simpleMatch[2] === addedFace) {
            foundMatch = true;
            const count = parseInt(simpleMatch[1] || '1', 10);
            newParts.push(`(${count}${addedFace}+${addedCount}${addedFace})${addedModifiers}`);
        } else {
            newParts.push(part);
        }
    }

    if (!foundMatch) return `${existing} + ${added}`;

    return newParts.join(' + ');
}

export function rewriteWodDifficulty(notation: string, difficulty: number): string {
    const boundedDifficulty = Math.max(1, Math.min(10, difficulty));
    return notation
        .replace(/((?:\d+)?d10(?::h)?)>=\d+/gi, `$1>=${boundedDifficulty}`)
        .replace(/(\([^()]*(?:\d+)?d10[^()]*\))>=\d+/gi, `$1>=${boundedDifficulty}`);
}

export function handleDiceNotation(
    prev: string,
    btnNotation: string,
    increment: boolean,
    wodDifficulty?: number
): string {
    const btnM = btnNotation.match(/^(\d+)?d(\d+|F)(:h)?(.*)$/i);
    if (!btnM) {
        if (increment) return prev ? `${prev} + ${btnNotation}` : btnNotation;
        return prev;
    }
    const btnSidesRaw = btnM[2].toUpperCase();
    const btnSides: number | 'F' = btnSidesRaw === 'F' ? 'F' : parseInt(btnSidesRaw);
    const btnLabel = btnM[3] ? ('h' as const) : undefined;
    const btnSuffix = btnM[4] || '';
    const isWod = btnSuffix.startsWith('>=');
    const extraSuffix = isWod ? btnSuffix.replace(/^>=\d+/, '') : '';

    const parts = parseParts(prev);
    const matchIdx = findLastMatch(parts, btnSides, btnLabel);

    if (matchIdx !== -1) {
        const part = parts[matchIdx];
        if (increment) {
            const newCount = part.count + 1;
            const suffix = isWod ? `>=${wodDifficulty}${extraSuffix}` : part.modifier;
            parts[matchIdx] = {
                ...part,
                raw: makePartRaw(newCount, part.sides, suffix, part.label),
                count: newCount,
                modifier: suffix,
            };
        } else {
            const newCount = part.count - 1;
            if (newCount <= 0) {
                parts.splice(matchIdx, 1);
            } else {
                const suffix = isWod ? `>=${wodDifficulty}${extraSuffix}` : part.modifier;
                parts[matchIdx] = {
                    ...part,
                    raw: makePartRaw(newCount, part.sides, suffix, part.label),
                    count: newCount,
                    modifier: suffix,
                };
            }
        }
        return parts.map((p) => p.raw).join(' + ');
    }

    if (increment) {
        const dot = prev.trim() ? ' + ' : '';
        const addNotation = isWod
            ? `1d10${btnLabel ? `:${btnLabel}` : ''}>=${wodDifficulty}${extraSuffix}`
            : btnNotation;
        return `${prev}${dot}${addNotation}`;
    }
    return prev;
}

function collectDiceGroups(node: ASTNode, out: DiceGroupNode[] = []): DiceGroupNode[] {
    if (node.type === 'DiceGroup') out.push(node);
    else if (node.type === 'BinaryOp') {
        collectDiceGroups(node.left, out);
        collectDiceGroups(node.right, out);
    } else if (node.type === 'UnaryOp') collectDiceGroups(node.operand, out);
    else if (node.type === 'Parenthesized') collectDiceGroups(node.expression, out);
    return out;
}

function hasAnySetBonus(node: ASTNode): boolean {
    if (node.type === 'DiceGroup') return node.modifiers.setBonus !== undefined;
    if (node.type === 'BinaryOp') return hasAnySetBonus(node.left) || hasAnySetBonus(node.right);
    if (node.type === 'UnaryOp') return hasAnySetBonus(node.operand);
    if (node.type === 'Parenthesized') {
        return node.poolModifiers?.setBonus !== undefined || hasAnySetBonus(node.expression);
    }
    return false;
}

function parseQuietly(notation: string): ASTNode | null {
    try {
        return parseToAST(notation);
    } catch {
        return null;
    }
}

/** True when the notation is valid and every dice term counts successes against a target. */
export function isSuccessPool(notation: string): boolean {
    const ast = parseQuietly(notation);
    if (!ast) return false;
    const groups = collectDiceGroups(ast);
    return groups.length > 0 && groups.every((group) => group.modifiers.targetSuccess);
}

/**
 * Adds a pool-wide set bonus to a success pool: appended to a single term or an outer group,
 * or around several top-level terms. Returns the notation unchanged when it already has a set
 * bonus anywhere (re-rolls from history stay valid), and `null` when it is not a success pool.
 */
export function withPoolSetBonus(
    notation: string,
    setBonus: { size: number; bonus?: number; comparePoint: ComparePoint }
): string | null {
    const trimmed = notation.trim();
    if (!isSuccessPool(trimmed)) return null;
    const ast = parseToAST(trimmed);
    if (hasAnySetBonus(ast)) return trimmed;
    const suffix = formatSetBonus({ ...setBonus, bonus: setBonus.bonus ?? setBonus.size });
    const singleScope = ast.type === 'DiceGroup' || ast.type === 'Parenthesized';
    return singleScope ? `${trimmed}${suffix}` : `(${trimmed})${suffix}`;
}
