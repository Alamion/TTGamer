import type { FC } from 'react';
import {
    DiceD4,
    DiceD6,
    DiceD8,
    DiceD10,
    DiceD12,
    DiceD20,
    DiceD100,
    DiceD2,
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
    label: string;
}

export const standardDice: DiceConfig[] = [
    { notation: 'd2', Component: DiceD2, label: 'd2' },
    { notation: 'd4', Component: DiceD4, label: 'd4' },
    { notation: 'd6', Component: DiceD6, label: 'd6' },
    { notation: 'd8', Component: DiceD8, label: 'd8' },
    { notation: 'd10', Component: DiceD10, label: 'd10' },
    { notation: 'd100', Component: DiceD100, label: 'd10' },
    { notation: 'd12', Component: DiceD12, label: 'd12' },
    { notation: 'd20', Component: DiceD20, label: 'd20' },
    { notation: 'dF', Component: DiceDF, label: 'dF' },
];

export const dndDice: DiceConfig[] = [
    { notation: 'd2', Component: DiceD2, label: 'd2' },
    { notation: 'd4', Component: DiceD4, label: 'd4' },
    { notation: 'd6', Component: DiceD6, label: 'd6' },
    { notation: 'd8', Component: DiceD8, label: 'd8' },
    { notation: 'd10', Component: DiceD10, label: 'd10' },
    { notation: 'd100', Component: DiceD100, label: 'd10' },
    { notation: 'd12', Component: DiceD12, label: 'd12' },
    { notation: 'd20', Component: DiceD20, label: 'd20' },
];
