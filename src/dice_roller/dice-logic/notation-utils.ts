import { type LexerToken, tokenize } from './dice-lexer';

export interface NotationPart {
    raw: string;
    count: number;
    sides: number | 'F';
    modifier: string;
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
        const modifier = reconstructText(segTokens.slice(diceIdx + 1));

        return {
            raw,
            count: val.count,
            sides: val.fudge ? ('F' as const) : val.sides,
            modifier,
        };
    });
}

export function makePartRaw(count: number, sides: number | 'F', modifier: string): string {
    const sidesStr = sides === 'F' ? 'F' : String(sides);
    const prefix = count === 1 ? '' : String(count);
    return `${prefix}d${sidesStr}${modifier}`;
}

export function findLastMatch(parts: NotationPart[], sides: number | 'F'): number {
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].sides === sides) return i;
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

export function mergeDiceNotation(existing: string, added: string): string {
    if (!existing) return added;

    const addedMatch = added.match(/^(\d+)?(d\d+)([\s\S]*)$/);
    if (!addedMatch) return `${existing} + ${added}`;

    const addedCount = parseInt(addedMatch[1] || '1', 10);
    const addedFace = addedMatch[2];
    const addedModifiers = addedMatch[3];

    const parts = splitTopLevel(existing);
    let foundMatch = false;
    const newParts: string[] = [];

    for (const part of parts) {
        if (foundMatch) {
            const pMatch = part.match(/^\(?(\d+)?(d\d+)/);
            if (pMatch && pMatch[2] === addedFace) continue;
            newParts.push(part);
            continue;
        }

        const parenMatch = part.match(/^\(([^)]+)\)([\s\S]*)$/);
        if (parenMatch) {
            const inner = parenMatch[1];
            const innerParts = inner.split('+');
            const hasMatchingFace = innerParts.some((ip) => {
                const m = ip.match(/^(\d+)(d\d+)$/);
                return m && m[2] === addedFace;
            });
            if (hasMatchingFace) {
                foundMatch = true;
                newParts.push(`(${inner}+${addedCount}${addedFace})${addedModifiers}`);
            } else {
                newParts.push(part);
            }
            continue;
        }

        const simpleMatch = part.match(/^(\d+)?(d\d+)([\s\S]*)$/);
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
        .replace(/((?:\d+)?d10)>=\d+/gi, `$1>=${boundedDifficulty}`)
        .replace(/(\([^()]*(?:\d+)?d10[^()]*\))>=\d+/gi, `$1>=${boundedDifficulty}`);
}

export function handleDiceNotation(
    prev: string,
    btnNotation: string,
    increment: boolean,
    wodDifficulty?: number
): string {
    const btnM = btnNotation.match(/^(\d+)?d(\d+|F)(.*)$/i);
    if (!btnM) {
        if (increment) return prev ? `${prev} + ${btnNotation}` : btnNotation;
        return prev;
    }
    const btnSidesRaw = btnM[2].toUpperCase();
    const btnSides: number | 'F' = btnSidesRaw === 'F' ? 'F' : parseInt(btnSidesRaw);
    const btnSuffix = btnM[3] || '';
    const isWod = btnSuffix.startsWith('>=');
    const extraSuffix = isWod ? btnSuffix.replace(/^>=\d+/, '') : '';

    const parts = parseParts(prev);
    const matchIdx = findLastMatch(parts, btnSides);

    if (matchIdx !== -1) {
        const part = parts[matchIdx];
        if (increment) {
            const newCount = part.count + 1;
            const suffix = isWod ? `>=${wodDifficulty}${extraSuffix}` : part.modifier;
            parts[matchIdx] = {
                ...part,
                raw: makePartRaw(newCount, part.sides, suffix),
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
                    raw: makePartRaw(newCount, part.sides, suffix),
                    count: newCount,
                    modifier: suffix,
                };
            }
        }
        return parts.map((p) => p.raw).join(' + ');
    }

    if (increment) {
        const dot = prev.trim() ? ' + ' : '';
        const addNotation = isWod ? `1d10>=${wodDifficulty}${extraSuffix}` : btnNotation;
        return `${prev}${dot}${addNotation}`;
    }
    return prev;
}
