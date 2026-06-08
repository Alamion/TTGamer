import { useMemo } from 'react';
import { SvgImage, useDiceColors } from './utils';

interface DiceSvgProps {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
    d100Tens?: string;
    d100Ones?: string;
}

interface ShapePath {
    d: string;
    shadeIndex?: number;
}

interface DiceShape {
    paths: ShapePath[];
    textX?: number;
    textY?: number;
    fontSize?: number;
    shades?: number[];
}

function renderStandardSvg(
    primaryColor: string,
    colors: string[],
    shape: DiceShape,
    value?: number | string,
    secondaryColor?: string
): string {
    const textX = shape.textX ?? 50;
    const textY = shape.textY ?? 60;
    const fontSize = shape.fontSize ?? 24;

    const pathElements = shape.paths
        .map((p) => {
            const fill = p.shadeIndex !== undefined ? colors[p.shadeIndex] : primaryColor;
            return `    <path d="${p.d}" fill="${fill}"/>`;
        })
        .join('\n');

    const textElement =
        value != null
            ? `
      <text
        x="${textX}"
        y="${textY}"
        text-anchor="middle"
        fill="${secondaryColor ?? '#fff'}"
        font-size="${fontSize}"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>`
            : '';

    return `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
${pathElements}
${textElement}
  </svg>`.trim();
}

function renderD2Svg(
    primaryColor: string,
    _colors: string[],
    value?: number | string,
    secondaryColor?: string
): string {
    return `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="40" r="38" fill="${primaryColor}"/>
  ${
      value != null
          ? `
      <text
        x="50"
        y="50"
        text-anchor="middle"
        fill="${secondaryColor ?? '#fff'}"
        font-size="24"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>
    `
          : ''
  }
  </svg>`.trim();
}

function renderD100Svg(
    primaryColor: string,
    colors: string[],
    value?: number | string,
    secondaryColor?: string,
    d100Tens?: string,
    d100Ones?: string
): string {
    let str_value_1: string;
    let str_value_2: string;
    if (d100Tens != null && d100Ones != null) {
        str_value_1 = d100Tens;
        str_value_2 = d100Ones;
    } else if (typeof value === 'number' && value <= 100) {
        const rawTens = Math.floor(value / 10) * 10;
        str_value_1 = rawTens === 0 || rawTens === 100 ? '00' : rawTens.toString();
        str_value_2 = (value % 10).toString();
    } else {
        str_value_1 = (value || '').toString();
        str_value_2 = (value || '').toString();
    }
    const pc = primaryColor;
    const c1 = colors[0];
    const c2 = colors[1];

    return `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="scale(0.6667) translate(0, 0)">
        <path d="M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${pc}"/>
        <path d="M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z" fill="${c1}"/>
        <path d="M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z" fill="${c1}"/>
        <path d="M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${c2}"/>
    </g>

    <g transform="scale(0.6667) translate(50, 50)">
        <path d="M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${pc}"/>
        <path d="M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z" fill="${c1}"/>
        <path d="M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z" fill="${c1}"/>
        <path d="M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${c2}"/>
    </g>
  ${
      str_value_1
          ? `
      <text
        x="35"
        y="42"
        text-anchor="middle"
        fill="${secondaryColor ?? '#fff'}"
        font-size="18"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${str_value_1}</text>
    `
          : ''
  }
  ${
      str_value_2
          ? `
      <text
        x="68"
        y="75"
        text-anchor="middle"
        fill="${secondaryColor ?? '#fff'}"
        font-size="18"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${str_value_2}</text>
    `
          : ''
  }
  </svg>`.trim();
}

function renderDFSvg(
    primaryColor: string,
    _colors: string[],
    value?: number | string,
    secondaryColor?: string
): string {
    let value_str: string;
    let is_symbol = false;
    switch (value) {
        case 1:
            value_str = '+';
            is_symbol = true;
            break;
        case -1:
            value_str = '-';
            is_symbol = true;
            break;
        case 0:
            value_str = '';
            break;
        default:
            value_str = (value || '').toString();
            break;
    }
    return `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="22" y="21" width="57" height="57" fill="${primaryColor}"/>
  ${
      value_str
          ? `
      <text
        x="50"
        y="${value_str === '+' ? '62' : '60'}"
        text-anchor="middle"
        fill="${secondaryColor ?? '#fff'}"
        font-size="${is_symbol ? '36' : '24'}"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value_str}</text>
    `
          : ''
  }
  </svg>`.trim();
}

const diceShapes: Record<string, DiceShape> = {
    d4: {
        paths: [{ d: 'M 52.2402 13 L 91.2114 80.5 H 13.2691 Z' }],
        textY: 65,
    },
    d6: {
        paths: [{ d: 'M 22 21 h 57 v 57 h -57 Z' }],
    },
    d8: {
        paths: [
            { d: 'M 52,12 L 86,71 L 18,71 Z' },
            { d: 'M 52,12 L 84,33 L 86,71 Z', shadeIndex: 0 },
            { d: 'M 52,12 L 20,33 L 18,71 Z', shadeIndex: 0 },
            { d: 'M 18,71 L 52,88.5 L 86,71 Z', shadeIndex: 1 },
        ],
        shades: [0.171, 0.46],
    },
    d10: {
        paths: [
            { d: 'M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z' },
            { d: 'M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z', shadeIndex: 0 },
            { d: 'M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z', shadeIndex: 0 },
            { d: 'M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z', shadeIndex: 1 },
        ],
        textY: 62,
        fontSize: 20,
        shades: [0.171, 0.46],
    },
    d12: {
        paths: [
            { d: 'M 52,25.5 L 74.5,41.75 L 66,68.5 L 37,68.5 L 29,41.75 Z' },
            { d: 'M 52,12 L 73.5,19.5 L 87.5,37 L 74.5,41.75 L 52,25.5 Z', shadeIndex: 0 },
            { d: 'M 52,12 L 30,19.5 L 16,37 L 29,41.75 L 52,25.5 Z', shadeIndex: 0 },
            { d: 'M 87.5,37 L 87.5,61 L 75,79.5 L 66,68.5 L 74.5,41.75 Z', shadeIndex: 1 },
            { d: 'M 16,37 L 16,61 L 29,79.5 L 37,68.5 L 29,41.75 Z', shadeIndex: 1 },
            { d: 'M 29,79.5 L 52,86.5 L 75,79.5 L 66,68.5 L 37,68.5 Z', shadeIndex: 2 },
        ],
        textY: 58,
        fontSize: 20,
        shades: [0.171, 0.063, 0.46],
    },
    d20: {
        paths: [
            { d: 'M 52,31.5 L 75,71 L 30,71 Z' },
            { d: 'M 52,9.5 L 88,32 L 52,31.5 Z', shadeIndex: 0 },
            { d: 'M 52,9.5 L 16,32 L 52,31.5 Z', shadeIndex: 0 },
            { d: 'M 88,32 L 75,71 L 52,31.5 Z', shadeIndex: 1 },
            { d: 'M 16,32 L 30,71 L 52,31.5 Z', shadeIndex: 1 },
            { d: 'M 88,32 L 87,70 L 75,71 Z', shadeIndex: 2 },
            { d: 'M 16,32 L 17,70 L 30,71 Z', shadeIndex: 2 },
            { d: 'M 87,70 L 52,93.5 L 75,71 Z', shadeIndex: 3 },
            { d: 'M 17,70 L 52,93.5 L 30,71 Z', shadeIndex: 3 },
            { d: 'M 30,71 L 52,93.5 L 75,71 Z', shadeIndex: 2 },
        ],
        textX: 52,
        textY: 65,
        fontSize: 20,
        shades: [0.25, 0.063, 0.171, 0.46],
    },
};

type RenderFn = (
    primaryColor: string,
    colors: string[],
    value?: number | string,
    secondaryColor?: string,
    d100Tens?: string,
    d100Ones?: string
) => string;

function useRenderer(diceType: string): RenderFn {
    return useMemo(() => {
        switch (diceType) {
            case 'd2':
                return renderD2Svg;
            case 'd100':
                return renderD100Svg;
            case 'df':
                return renderDFSvg;
            default: {
                const shape = diceShapes[diceType];
                if (!shape) throw new Error(`Unknown dice type: ${diceType}`);
                return (pc: string, _colors: string[], value?: number | string, sc?: string) =>
                    renderStandardSvg(pc, _colors, shape, value, sc);
            }
        }
    }, [diceType]);
}

const customDiceShades: Record<string, number[]> = {
    d100: [0.171, 0.46],
};

function DiceSvg({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
    diceType,
    d100Tens,
    d100Ones,
}: DiceSvgProps & { diceType: string }) {
    const shape = diceShapes[diceType];
    const shades = shape?.shades ?? customDiceShades[diceType];
    const colors = useDiceColors(primaryColor, shades ?? []);
    const renderFn = useRenderer(diceType);

    const svgContent = renderFn(primaryColor, colors, value, secondaryColor, d100Tens, d100Ones);

    return (
        <SvgImage
            svgString={svgContent}
            mode={mode}
            style={style}
            className={className}
            onClick={onClick}
            alt={`Dice${diceType.toUpperCase()}`}
        />
    );
}

export const DiceD2 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d2" />;
export const DiceD4 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d4" />;
export const DiceD6 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d6" />;
export const DiceD8 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d8" />;
export const DiceD10 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d10" />;
export const DiceD12 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d12" />;
export const DiceD20 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d20" />;
export const DiceD100 = (props: DiceSvgProps) => <DiceSvg {...props} diceType="d100" />;
export const DiceDF = (props: DiceSvgProps) => <DiceSvg {...props} diceType="df" />;
