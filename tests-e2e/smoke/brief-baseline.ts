/**
 * Heights in px of every shipped document kind's full sheet and brief, measured on the sheet
 * root before spec 033 changed any layout (375 and 1280 px wide windows). The full sheets must
 * keep them within 1% (SC-007); the briefs must come out at least 50% shorter at 375 px (SC-001).
 */
export interface KindHeights {
    sheet: { 375: number; 1280: number };
    brief: { 375: number; 1280: number };
}

export const BASELINE: Readonly<Record<string, KindHeights>> = {
    'star-wars-wod/character': {
        sheet: { 375: 7926, 1280: 3473 },
        brief: { 375: 2748, 1280: 1274 },
    },
    'star-wars-wod/droid': {
        sheet: { 375: 7322, 1280: 3353 },
        brief: { 375: 2627, 1280: 1274 },
    },
    'star-wars-wod/creature': {
        sheet: { 375: 2724, 1280: 1657 },
        brief: { 375: 959, 1280: 567 },
    },
    'star-wars-wod/vehicle': {
        sheet: { 375: 3159, 1280: 1794 },
        brief: { 375: 1041, 1280: 726 },
    },
    'star-wars-wod/fodder-group': {
        sheet: { 375: 2647, 1280: 1605 },
        brief: { 375: 1547, 1280: 952 },
    },
    'wod-2e/wod2e-character': {
        sheet: { 375: 6871, 1280: 3113 },
        brief: { 375: 2553, 1280: 1274 },
    },
    // Full sheets of the V5 characters gained "Member of" in their identity card in spec 040.
    'wod-v5/hunter': {
        sheet: { 375: 6315, 1280: 3115 },
        brief: { 375: 2700, 1280: 1306 },
    },
    'wod-v5/v5-character': {
        sheet: { 375: 4971, 1280: 2347 },
        brief: { 375: 2140, 1280: 1064 },
    },
};

/**
 * Heights in px of every shipped brief before spec 041 made the brief block its own element
 * (375 and 1280 px wide windows). Briefs must keep them within 1% (spec 041, SC-001).
 */
export const BRIEF_PINS: Readonly<Record<string, { 375: number; 1280: number }>> = {
    'star-wars-wod/character': { 375: 623, 1280: 333 },
    'star-wars-wod/droid': { 375: 595, 1280: 333 },
    'star-wars-wod/creature': { 375: 375, 1280: 299 },
    // The crew links take the compact look of a brief (spec 041): pinned anew.
    'star-wars-wod/vehicle': { 375: 397, 1280: 362 },
    'star-wars-wod/fodder-group': { 375: 381, 1280: 315 },
    'wod-2e/wod2e-character': { 375: 619, 1280: 333 },
    'wod-v5/hunter': { 375: 736, 1280: 425 },
    'wod-v5/v5-character': { 375: 558, 1280: 328 },
    'wod-v5/vampire': { 375: 894, 1280: 449 },
    'wod-v5/v5-storyteller': { 375: 400, 1280: 394 },
    'wod-v5/v5-group': { 375: 210, 1280: 194 },
};
