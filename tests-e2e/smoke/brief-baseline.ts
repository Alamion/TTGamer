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
    'wod-v5/hunter': {
        sheet: { 375: 6223, 1280: 3023 },
        brief: { 375: 2700, 1280: 1306 },
    },
    'wod-v5/v5-character': {
        sheet: { 375: 4915, 1280: 2291 },
        brief: { 375: 2140, 1280: 1064 },
    },
};
