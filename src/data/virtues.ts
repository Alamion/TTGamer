/** Star Wars WoD Virtues (spec 009): names and one-line summaries for translation and hints. */
export interface VirtueEntry {
    id: string;
    name: string;
    shortDescription: string;
}

export const VIRTUES: VirtueEntry[] = [
    {
        id: 'conscience',
        name: 'Conscience',
        shortDescription: 'Moral compass; rolled to resist losing Dark Side Resistance',
    },
    {
        id: 'passion',
        name: 'Passion',
        shortDescription: 'Emotional drive that ties the character to the Force',
    },
    {
        id: 'self-control',
        name: 'Self Control',
        shortDescription: 'Restraint over urges, anger, and fear',
    },
];
