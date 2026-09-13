import type { FC } from 'react';

import {
    DiceD2,
    DiceD4,
    DiceD6,
    DiceD8,
    DiceD10,
    DiceD12,
    DiceD20,
    DiceD100,
    DiceDF,
} from './2d_dices';

export interface DiceConfig {
    notation: string;
    Component: FC<{
        primaryColor: string;
        secondaryColor?: string;
        value?: number | string;
        style?: React.CSSProperties;
        className?: string;
    }>;
    /** Text drawn on each physical die. A logical d100 is illustrated by two d10s. */
    faceLabel: string;
}

export const standardDice: DiceConfig[] = [
    { notation: 'd2', Component: DiceD2, faceLabel: 'd2' },
    { notation: 'd4', Component: DiceD4, faceLabel: 'd4' },
    { notation: 'd6', Component: DiceD6, faceLabel: 'd6' },
    { notation: 'd8', Component: DiceD8, faceLabel: 'd8' },
    { notation: 'd10', Component: DiceD10, faceLabel: 'd10' },
    { notation: 'd100', Component: DiceD100, faceLabel: 'd10' },
    { notation: 'd12', Component: DiceD12, faceLabel: 'd12' },
    { notation: 'd20', Component: DiceD20, faceLabel: 'd20' },
    { notation: 'dF', Component: DiceDF, faceLabel: 'dF' },
];

export const dndDice: DiceConfig[] = [
    { notation: 'd2', Component: DiceD2, faceLabel: 'd2' },
    { notation: 'd4', Component: DiceD4, faceLabel: 'd4' },
    { notation: 'd6', Component: DiceD6, faceLabel: 'd6' },
    { notation: 'd8', Component: DiceD8, faceLabel: 'd8' },
    { notation: 'd10', Component: DiceD10, faceLabel: 'd10' },
    { notation: 'd100', Component: DiceD100, faceLabel: 'd10' },
    { notation: 'd12', Component: DiceD12, faceLabel: 'd12' },
    { notation: 'd20', Component: DiceD20, faceLabel: 'd20' },
];
