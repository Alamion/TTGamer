import { warn } from '@site/src/shared/utils/logging';
import type { Mesh } from 'three';

import type { DiceGroup } from '../types';
import {
    D2DiceGeometry,
    D4DiceGeometry,
    D6DiceGeometry,
    D8DiceGeometry,
    D10DiceGeometry,
    D12DiceGeometry,
    D20DiceGeometry,
    D100DiceGeometry,
    type DiceGeometryData,
} from './geometries';
import type { DiceRendererConfig } from './renderer';

interface DiceGeometryInstance {
    create(): { clone(): DiceGeometryData; dispose(): void };
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

interface DiceTemplate {
    clone(): DiceGeometryData;
    values: number[];
    /** Dice cloned from this template that have not been released. */
    users: number;
    evicted: boolean;
    /** Frees the geometry and face atlas every clone shares. */
    dispose(): void;
}

/** Built dice per look; a die of a large pool is a clone, not a rebuild (dice #12). */
const templates = new Map<string, DiceTemplate>();
const MAX_TEMPLATES = 48;
const templateOf = new WeakMap<Mesh, DiceTemplate>();

function evict(template: DiceTemplate): void {
    template.evicted = true;
    if (template.users === 0) template.dispose();
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

    const key = [sides, fudge ? 'F' : '', config.diceColor, config.textColor, config.scaler].join(
        '|'
    );
    let template = templates.get(key);
    if (!template) {
        template = buildTemplate(GeometryClass, config, fudge) ?? undefined;
        if (!template) return null;
        if (templates.size >= MAX_TEMPLATES) {
            const oldest = templates.keys().next().value!;
            evict(templates.get(oldest)!);
            templates.delete(oldest);
        }
        templates.set(key, template);
    }
    const geom = template.clone();
    geom.values = template.values;
    template.users++;
    templateOf.set(geom.geometry, template);
    return geom;
}

/**
 * The one way a die leaves for good: frees its own material and lets go of its template, whose
 * shared geometry and atlas are freed once the template is evicted and no die uses it.
 */
export function releaseDiceGeometry(mesh: Mesh): void {
    const { material } = mesh;
    for (const each of Array.isArray(material) ? material : [material]) each.dispose();
    const template = templateOf.get(mesh);
    if (!template) return;
    templateOf.delete(mesh);
    template.users--;
    if (template.evicted && template.users === 0) template.dispose();
}

function buildTemplate(
    GeometryClass: DiceGeometryClass,
    config: DiceFactoryConfig,
    fudge?: boolean
): DiceTemplate | null {
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
    const values = fudge ? g.values : g.values.map((v) => v + 1);
    return {
        clone: () => created.clone(),
        values,
        users: 0,
        evicted: false,
        dispose: () => created.dispose(),
    };
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
        const groupConfig = group.diceColor
            ? { ...factoryConfig, diceColor: group.diceColor }
            : factoryConfig;

        for (let i = 0; i < totalPhysicalDice; i++) {
            const effectiveSides = isD100 && i % 2 === 0 ? 100 : physicalSides;
            const geometry = getOrCreateGeometry(effectiveSides, groupConfig, group.fudge);
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
