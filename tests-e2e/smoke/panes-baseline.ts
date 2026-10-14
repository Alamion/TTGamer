/**
 * Heights in px of the Star Wars character on the sheet page with one document open, measured
 * on the sheet root before spec 034 changed the page shell (mouse pointer; 375 and 1280 px wide
 * windows). With one document the page must stay within 1% of them (SC-005).
 */
export const SINGLE_DOCUMENT_BASELINE = {
    sheet: { 375: 7926, 1280: 3473 },
    brief: { 375: 623, 1280: 333 },
} as const;
