/** A cleaned SVG picture as an image address: drawn only by `<img>`, so nothing in it runs. */
export const svgDataUrl = (svg: string) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
