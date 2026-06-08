import { useMemo } from 'react';
import { blendColors } from '../../utils/recolor_svg';

type SvgAssetProps = {
    style?: React.CSSProperties;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    alt?: string;
    svgString: string;
    className?: string;
    onClick?: () => void;
};

export function SvgImage({
    svgString,
    style = {},
    mode = 'image',
    alt = '',
    className = '',
    onClick,
}: SvgAssetProps) {
    const uri = `data:image/svg+xml;base64,${btoa(svgString)}`;
    const data = `url("${uri}")`;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

    switch (mode) {
        case 'tile_x':
            return (
                <div
                    className={className}
                    style={{
                        backgroundImage: data,
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: 'auto 100%',
                        ...style,
                    }}
                />
            );
        case 'tile_y':
            return (
                <div
                    className={className}
                    style={{
                        backgroundImage: data,
                        backgroundRepeat: 'repeat-y',
                        backgroundSize: '100% auto',
                        ...style,
                    }}
                />
            );
        case 'tile':
            return (
                <div
                    className={className}
                    style={{
                        backgroundImage: data,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '100% 100%',
                        ...style,
                    }}
                />
            );
        default:
            return (
                <img
                    src={uri}
                    alt={alt}
                    className={className}
                    style={style}
                    onClick={onClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={onClick ? 0 : undefined}
                    role={onClick ? 'button' : undefined}
                />
            );
    }
}

export function useDiceColors(primaryColor: string, shades: number[]) {
    return useMemo(
        () => shades.map((shade) => blendColors(primaryColor, '#000000', shade)),
        [primaryColor, shades]
    );
}
