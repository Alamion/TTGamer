export class RollCancelledError extends Error {
    constructor() {
        super('Roll cancelled by user');
        this.name = 'RollCancelledError';
    }
}
