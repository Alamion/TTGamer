export class RollCancelledError extends Error {
    constructor() {
        super('Roll cancelled by user');
        this.name = 'RollCancelledError';
    }
}

export type NotationErrorKind =
    | 'unknown-character'
    | 'unexpected-token'
    | 'unexpected-end'
    | 'missing-compare-value'
    | 'unclosed-group'
    | 'trailing-input'
    | 'label-position'
    | 'set-bonus-needs-target'
    | 'invalid-set-size'
    | 'forced-values-count'
    | 'limit-exceeded';

export type LimitName =
    | 'notation-length'
    | 'ast-nodes'
    | 'numeric-literal'
    | 'dice-count'
    | 'dice-sides'
    | 'custom-faces';

/** Where and why a notation is invalid; offsets are 0-based UTF-16 positions in the input. */
export interface NotationDiagnostic {
    kind: NotationErrorKind;
    offset: number;
    length: number;
    found?: string;
    expected?: string[];
    limit?: { name: LimitName; max: number };
}

/** A notation error carrying a structured diagnostic; the message stays English for logs. */
export class NotationError extends Error {
    readonly diagnostic: NotationDiagnostic;

    constructor(message: string, diagnostic: NotationDiagnostic) {
        super(message);
        this.name = 'NotationError';
        this.diagnostic = diagnostic;
    }
}
