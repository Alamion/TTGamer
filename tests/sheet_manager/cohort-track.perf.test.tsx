// @vitest-environment happy-dom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { createDefaultVehicleData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { EMPTY, seed, trackOnly } from './helpers/cohort';

/** Milliseconds to render the vehicle's member track with `count` members. */
function renderSquadron(count: number) {
    const data = createDefaultVehicleData();
    data.members = Array.from({ length: count }, (_, index) => ({
        id: `m${index}`,
        label: String.fromCharCode(65 + index),
        damage: { levels: [...EMPTY] },
    }));
    seed(data, 'vehicle', 'vehicle');
    const started = performance.now();
    render(createElement(DeclarativeSheetView, { template: trackOnly('vehicle-sheet') }));
    const ms = performance.now() - started;
    cleanup();
    return ms;
}

describe('member track performance (feature 007)', () => {
    it('renders 24 members in time that grows linearly with the squadron', () => {
        renderSquadron(3); // warm-up: module and JIT costs are not part of the comparison
        const small = renderSquadron(3);
        const large = renderSquadron(24);
        // 8× the members; quadratic work would be ~64×.
        expect(large).toBeLessThan(Math.max(small, 1) * 16);
    });
});
