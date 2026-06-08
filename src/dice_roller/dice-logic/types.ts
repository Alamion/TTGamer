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
}

export interface DiceGroup {
    count: number;
    sides: number;
    modifiers: DiceModifiers;
    customFaces?: number[];
    fudge?: boolean;
    forcedValues?: number[];
}

export interface DiceExpression {
    type: 'dice';
    value: DiceGroup;
    operation: '+' | '-' | '*' | '/' | '%' | '^';
}

export interface NumberExpression {
    type: 'number';
    value: number;
    operation: '+' | '-' | '*' | '/' | '%' | '^';
}

export type ParsedExpression = DiceExpression | NumberExpression;

export interface ParseResult {
    expressions: ParsedExpression[];
    original: string;
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

export interface Token {
    type: TokenType;
    value:
        | string
        | number
        | number[]
        | { count: number; sides: number; fudge: boolean; customFaces?: number[] };
    text: string;
    line: number;
    col: number;
}

export type ASTNodeType = 'NumericLiteral' | 'DiceGroup' | 'BinaryOp' | 'UnaryOp' | 'Parenthesized';

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
}

export interface DiceGroupResult {
    notation: string;
    sides: number;
    rolls: DiceRoll[];
    keptRolls: DiceRoll[];
    droppedRolls: DiceRoll[];
    sum: number;
    operation: '+' | '-' | '*' | '/' | '%' | '^';
}

export interface FullRollResult {
    notation: string;
    diceGroups: DiceGroupResult[];
    total: number;
    details: string;
    formatted: string;
}

export interface RollResult {
    notation: string;
    diceGroups: DiceGroupResult[];
    total: number;
    details: string;
    formatted: string;
}
