/**
 * Where a character of a textarea is drawn, measured with a hidden copy of the textarea that
 * wraps text the same way (spec 044, D8). Kept beside its one user, the link suggestions.
 */

const COPIED = [
    'boxSizing',
    'width',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
] as const;

export interface CaretPosition {
    /** From the textarea's top-left border corner, scrolling taken into account. */
    top: number;
    left: number;
    /** The line height there. */
    height: number;
}

export function caretPosition(textarea: HTMLTextAreaElement, index: number): CaretPosition {
    const style = getComputedStyle(textarea);
    const mirror = document.createElement('div');
    for (const property of COPIED) mirror.style[property] = style[property];
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    mirror.textContent = textarea.value.slice(0, index);
    const marker = document.createElement('span');
    marker.textContent = textarea.value.slice(index) || '.';
    mirror.append(marker);
    document.body.append(mirror);
    const lineHeight =
        Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
    const position = {
        top: marker.offsetTop - textarea.scrollTop,
        left: marker.offsetLeft - textarea.scrollLeft,
        height: Number.isFinite(lineHeight) ? lineHeight : 16,
    };
    mirror.remove();
    return position;
}
