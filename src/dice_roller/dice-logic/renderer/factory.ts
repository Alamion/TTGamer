import type { DiceGroup } from '../types';
import {
    D4DiceGeometry,
    D6DiceGeometry,
    D8DiceGeometry,
    D10DiceGeometry,
    D12DiceGeometry,
    D20DiceGeometry,
    D100DiceGeometry,
    D2DiceGeometry,
    type DiceGeometryData,
} from './geometries';
import { type DiceRendererConfig } from './renderer';
import { warn } from '@site/src/shared/utils/logging';

interface DiceGeometryInstance {
    create(): { clone(): DiceGeometryData };
    values: number[];
    labels: string[];
}

type DiceGeometryClass = new (
    w: number,
    h: number,
    options: { diceColor: string; textColor: string },
    scaler: number
) => DiceGeometryInstance;

const GEOMETRY_CLASSES: Record<number, DiceGeometryClass> = {
    2: D2DiceGeometry,
    4: D4DiceGeometry,
    6: D6DiceGeometry,
    8: D8DiceGeometry,
    10: D10DiceGeometry,
    12: D12DiceGeometry,
    20: D20DiceGeometry,
    100: D100DiceGeometry,
};

export interface DiceFactoryConfig extends DiceRendererConfig {
    diceColor: string;
    textColor: string;
    scaler: number;
}

function getOrCreateGeometry(
    sides: number,
    config: DiceFactoryConfig,
    fudge?: boolean
): DiceGeometryData | null {
    const GeometryClass = GEOMETRY_CLASSES[sides];
    if (!GeometryClass) {
        return null;
    }

    const options = {
        diceColor: config.diceColor,
        textColor: config.textColor,
    };

    const g = new GeometryClass(window.innerWidth, window.innerHeight, options, config.scaler);

    if (fudge) {
        // Override face labels for fudge symbols ('-', '0', '+') on a D6 cube
        // Material array indices: 0=edge, 1=unused, 2-7=six faces
        g.labels[2] = '-';
        g.labels[3] = ' ';
        g.labels[4] = '+';
        g.labels[5] = '-';
        g.labels[6] = ' ';
        g.labels[7] = '+';
        g.values = [-1, 0, 1, -1, 0, 1];
    }

    const created = g.create();
    if (!created) {
        return null;
    }
    const geom = created.clone();

    if (fudge) {
        geom.values = g.values;
    } else {
        geom.values = geom.values.map((v) => v + 1);
    }

    return geom;
}

export function prepareDiceGeometries(
    diceGroups: DiceGroup[],
    config: Partial<DiceFactoryConfig>
): { geometries: DiceGeometryData[]; groupSizes: number[] } {
    const factoryConfig: DiceFactoryConfig = {
        diceColor: config?.diceColor ?? '#4a90e2',
        textColor: config?.textColor ?? '#ffffff',
        scaler: config?.scaler ?? 1,
        ...config,
    };

    const geometries: DiceGeometryData[] = [];
    const groupSizes: number[] = [];

    for (const group of diceGroups) {
        const isD100 = group.sides === 100;
        const physicalSides = isD100 ? 10 : group.sides;
        const physicalPerLogical = isD100 ? 2 : 1;
        const totalPhysicalDice = group.count * physicalPerLogical;

        let actualCount = 0;

        for (let i = 0; i < totalPhysicalDice; i++) {
            const effectiveSides = isD100 && i % 2 === 0 ? 100 : physicalSides;
            const geometry = getOrCreateGeometry(effectiveSides, factoryConfig, group.fudge);
            if (geometry) {
                geometries.push(geometry);
                actualCount++;
            } else {
                warn(
                    `3D geometry not available for ${effectiveSides}-sided die — ` +
                        `group ${diceGroups.indexOf(group)} will be skipped in physics`,
                    'Factory'
                );
            }
        }

        groupSizes.push(actualCount);
    }

    return { geometries, groupSizes };
}

export class DiceFactory {
    private _config: DiceFactoryConfig;

    constructor(_config: DiceFactoryConfig) {
        this._config = _config;
    }

    prepareGeometries(diceGroups: DiceGroup[]): {
        geometries: DiceGeometryData[];
        groupSizes: number[];
    } {
        return prepareDiceGeometries(diceGroups, this._config);
    }

    dispose(): void {}
}

export function create3DDiceRoll(
    _width: number,
    _height: number,
    diceColor: string,
    textColor: string
): DiceFactory {
    return new DiceFactory({
        diceColor,
        textColor,
        scaler: 1,
    });
}
