import type { RollOrigin, RollReadingSummary, RollVerdict } from '../utils/rollReader';

export interface ComparePoint {
    operator: '>' | '>=' | '<' | '<=' | '=' | '!=' | '<>';
    value: number;
}

export interface ExplodeModifier {
    comparePoint?: ComparePoint;
    compounding?: boolean;
    penetrating?: boolean;
}

export interface RerollModifier {
    comparePoint?: ComparePoint;
    once?: boolean;
}

export interface UniqueModifier {
    comparePoint?: ComparePoint;
    once?: boolean;
}

/** For every complete set of `size` kept dice matching `comparePoint`, add `bonus` successes. */
export interface SetBonus {
    size: number;
    bonus: number;
    comparePoint: ComparePoint;
    /** Position of the modifier in the notation, for diagnostics. */
    span?: { offset: number; length: number };
}

/** The label marking a dice term as the pool's special subset (`:h`). */
export type DiceLabel = 'h';

export interface DiceModifiers {
    min?: number;
    max?: number;
    explode?: ExplodeModifier;
    reroll?: RerollModifier;
    unique?: UniqueModifier;
    keepHighest?: number;
    keepLowest?: number;
    dropHighest?: number;
    dropLowest?: number;
    targetSuccess?: ComparePoint;
    targetFailure?: ComparePoint;
    criticalSuccess?: ComparePoint | true;
    criticalFailure?: ComparePoint | true;
    criticalSuccessBotch?: boolean;
    criticalFailureBotch?: boolean;
    sort?: 'asc' | 'desc';
    setBonus?: SetBonus;
}

export interface DiceGroup {
    count: number;
    sides: number;
    modifiers: DiceModifiers;
    customFaces?: number[];
    fudge?: boolean;
    forcedValues?: number[];
    /** 3D face colour for this group only (labelled dice); the roll's colour otherwise. */
    diceColor?: string;
}

export type TokenType =
    | 'NUMBER'
    | 'DICE'
    | 'PLUS'
    | 'MINUS'
    | 'MULTIPLY'
    | 'DIVIDE'
    | 'MODULO'
    | 'EXPONENT'
    | 'LPAREN'
    | 'RPAREN'
    | 'MOD_EXPLODE'
    | 'MOD_REROLL'
    | 'MOD_UNIQUE'
    | 'MOD_KEEP'
    | 'MOD_DROP'
    | 'MOD_SORT'
    | 'MOD_MIN'
    | 'MOD_MAX'
    | 'MOD_CS'
    | 'MOD_CF'
    | 'MOD_CSB'
    | 'MOD_CFB'
    | 'MOD_FAILURE'
    | 'MOD_SET'
    | 'LABEL'
    | 'GT'
    | 'GTE'
    | 'LT'
    | 'LTE'
    | 'EQ'
    | 'NEQ'
    | 'CUSTOM_FACES'
    | 'FUDGE'
    | 'AT'
    | 'COMMA'
    | 'ERROR'
    | 'END';

export interface NumericLiteralNode {
    type: 'NumericLiteral';
    value: number;
}

export interface DiceGroupNode {
    type: 'DiceGroup';
    count: number;
    sides: number;
    modifiers: DiceModifiers;
    customFaces?: number[];
    fudge?: boolean;
    forcedValues?: number[];
    label?: DiceLabel;
}

export interface BinaryOpNode {
    type: 'BinaryOp';
    operator: '+' | '-' | '*' | '/' | '%' | '^';
    left: ASTNode;
    right: ASTNode;
}

export interface UnaryOpNode {
    type: 'UnaryOp';
    operator: '+' | '-';
    operand: ASTNode;
}

export interface ParenthesizedNode {
    type: 'Parenthesized';
    expression: ASTNode;
    /** Pool-wide modifiers that are not distributed to the inner terms. */
    poolModifiers?: { setBonus?: SetBonus };
}

export type ASTNode =
    | NumericLiteralNode
    | DiceGroupNode
    | BinaryOpNode
    | UnaryOpNode
    | ParenthesizedNode;

export interface DiceRoll {
    sides: number;
    value: number;
    dropped: boolean;
    exploded?: boolean;
    compounded?: boolean;
    penetrating?: boolean;
    criticalSuccess?: boolean;
    criticalFailure?: boolean;
    criticalSuccessBotch?: boolean;
    criticalFailureBotch?: boolean;
    hasTarget?: boolean;
    targetSuccess?: boolean;
    targetFailure?: boolean;
    minRaised?: boolean;
    maxCapped?: boolean;
    rerolledOnce?: boolean;
    faceLabel?: string;
    label?: DiceLabel;
    /** 0-based index of the complete set this die belongs to, within its set-bonus scope. */
    setIndex?: number;
    /** Successes the set adds; carried by the set's first member so formatted sums add up. */
    setBonus?: number;
}

export interface DiceGroupResult {
    notation: string;
    sides: number;
    rolls: DiceRoll[];
    keptRolls: DiceRoll[];
    droppedRolls: DiceRoll[];
    sum: number;
    operation: '+' | '-' | '*' | '/' | '%' | '^';
    label?: DiceLabel;
}

export interface SetBonusResult {
    sets: number;
    added: number;
}

export interface FullRollResult {
    notation: string;
    diceGroups: DiceGroupResult[];
    total: number;
    details: string;
    formatted: string;
    manuallyRerolled?: boolean;
    /** One entry per scope that had a set bonus, in evaluation order. */
    setBonus?: SetBonusResult[];
}

export interface RollResult {
    notation: string;
    diceGroups: DiceGroupResult[];
    total: number;
    details: string;
    formatted: string;
    manuallyRerolled?: boolean;
    setBonus?: SetBonusResult[];
    characterName?: string;
    statLabels?: string[];
    /**
     * A 3D roll that fell back to 2D because the renderer could not be downloaded.
     * Transient presentation flag: never stored in history, never shared.
     */
    renderer3dUnavailable?: boolean;
    /** Where the roll was started (panel tab, sheet); absent for direct API rolls. */
    origin?: RollOrigin;
    /** Set when a system reading (e.g. V5) was applied to this roll. */
    reading?: RollReadingSummary;
    /** Set when the roll counted successes against a Difficulty that was given. */
    verdict?: RollVerdict;
}
