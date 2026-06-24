export interface MeritFlawItem {
    name: string;
    cost: number;
    description: string;
}

export interface SpeciesEntry {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    category: string;
    freebieAdjustment: number;
    eras: string[];
    merits: MeritFlawItem[];
    flaws: MeritFlawItem[];
}

export const ALL_ERAS = [
    'Dawn of the Jedi',
    'The Old Republic',
    'The High Republic',
    'The Fall of the Jedi',
    'The Reign of the Empire',
    'The Age of Rebellion',
    'The New Republic',
    'The Rise of the First Order',
];

const FLAW_SHORT: MeritFlawItem = {
    name: 'Short',
    cost: 1,
    description:
        'Below average height. You suffer a two-dice penalty to all pursuit rolls. The Storyteller may grant concealment bonuses where your size is an advantage.',
};

const MERIT_ENHANCED_OLFACTORY: MeritFlawItem = {
    name: 'Enhanced Olfactory Sense',
    cost: 1,
    description:
        'Your sense of smell is extraordinarily keen. You can identify creatures by scent, track lingering odors, and detect approaches before they are visible.',
};

const MERIT_PITIABLE: MeritFlawItem = {
    name: 'Pitiable',
    cost: 1,
    description:
        'There is something about you that makes others want to care for you. Social rolls with sympathetic NPCs may gain an edge, though certain Natures (Autocrat, Fanatic) are unaffected.',
};

const MERIT_THICK_SKINNED: MeritFlawItem = {
    name: 'Thick Skinned',
    cost: 2,
    description:
        'Your hide is tough and leathery. You gain two additional dice when rolling to Soak damage.',
};

const FLAW_LIMITED_VOCAL: MeritFlawItem = {
    name: 'Limited Vocal Range',
    cost: 2,
    description:
        'Your vocal cords cannot form the sounds of Galactic Basic. You must rely on gestures or a translator.',
};

const FLAW_STEREOTYPED_BRUTAL: MeritFlawItem = {
    name: 'Stereotyped (brutal thugs)',
    cost: 1,
    description:
        'Most beings expect you to be a brutish thug. Social rolls in civilized settings suffer unless you actively subvert the stereotype.',
};

const FLAW_STEREOTYPED_TREEHUGGER: MeritFlawItem = {
    name: 'Stereotyped (tree huggers)',
    cost: 1,
    description:
        'Ithorians are seen as naive "tree huggers" by the wider galaxy. Your ecological concerns are often dismissed.',
};

const FLAW_STEREOTYPED_UNTRUSTWORTHY: MeritFlawItem = {
    name: 'Stereotyped (untrustworthy)',
    cost: 1,
    description:
        'Rodians are widely viewed as untrustworthy. First impressions in civilized society suffer accordingly.',
};

const FLAW_STEREOTYPED_TEMPER: MeritFlawItem = {
    name: 'Stereotyped (short-tempered)',
    cost: 1,
    description:
        'Wookiees are seen as short-tempered and violent, complicating social interactions.',
};

const FLAW_SLAVE_RACE: MeritFlawItem = {
    name: 'Slave Race',
    cost: 3,
    description:
        'Your species is widely enslaved or discriminated against in this era. You face systemic prejudice, legal restrictions, and frequent harassment. The Storyteller determines the specific penalties based on the sector and regime.',
};

const FLAW_ENV_SENSITIVITY_ARID: MeritFlawItem = {
    name: 'Environmental Sensitivity (arid)',
    cost: 2,
    description:
        'Your body thrives in humid, aquatic environments. On dry or arid worlds, you suffer a one-die penalty to all dice pools from sheer discomfort.',
};

const MERIT_AMPHIBIOUS: MeritFlawItem = {
    name: 'Amphibious',
    cost: 3,
    description:
        'You breathe both air and water with equal ease, suffering no penalties in either environment.',
};

const MERIT_LIGHT_TOUCH: MeritFlawItem = {
    name: 'Light Touch',
    cost: 1,
    description:
        'Your nimble fingers and steady nerves grant a two-dice bonus to delicate tasks such as Repair or Medicine rolls.',
};

const MERIT_ENHANCED_VISION: MeritFlawItem = {
    name: 'Enhanced Vision (low-light)',
    cost: 1,
    description: 'You see into the low-light spectrum, negating penalties for darkness.',
};

const MERIT_ACUTE_HEARING: MeritFlawItem = {
    name: 'Acute Hearing',
    cost: 1,
    description:
        'Your hearing covers ultrasonic and infrasonic frequencies undetectable by humans, revealing hidden sounds.',
};

const MERIT_DIRECTION_SENSE: MeritFlawItem = {
    name: 'Direction Sense',
    cost: 2,
    description:
        'You possess an innate sense of direction. You never get lost and can navigate by instinct, whether in space, underground, or on alien worlds.',
};

const MERIT_NONVERBAL_LANG: MeritFlawItem = {
    name: 'Non-Verbal Language',
    cost: 1,
    description:
        'Your lekku convey a sophisticated language of pheromones and gesture, natural to your species. Outsiders may learn to interpret it but cannot produce it.',
};

const MERIT_NATURAL_WEAPONS: MeritFlawItem = {
    name: 'Natural Weapons',
    cost: 1,
    description: 'Your claws deal Strength+2 levels of lethal damage in unarmed combat.',
};

const MERIT_TALL: MeritFlawItem = {
    name: 'Tall',
    cost: 1,
    description: 'You tower over most beings. Gain two dice on foot pursuit rolls.',
};

const MERIT_BERSERKER: MeritFlawItem = {
    name: 'Berserker',
    cost: 2,
    description:
        'You can channel your rage to temporarily ignore wound penalties, though you still face consequences for your actions in that state.',
};

const MERIT_POWERFUL: MeritFlawItem = {
    name: 'Powerful',
    cost: 2,
    description:
        'Your dense musculature grants two additional dice to Feats of Strength, Brawling damage, and Melee damage rolls that include Strength.',
};

export const SPECIES: SpeciesEntry[] = [
    {
        id: 'ewok',
        name: 'Ewok',
        shortDescription: 'Small, furry bipeds native to the forest moon of Endor',
        description:
            'Ewoks are small, sentient bipeds covered in thick fur, standing about one meter tall. Native to the forest moon of Endor, they are a tribal species with a deep connection to their environment. Despite their primitive technology, Ewoks are ingenious, courageous, and fiercely protective of their home. Their small stature makes it difficult to keep up in a chase, but their keen noses and pitiable appearance serve them well in social situations.',
        category: 'Biped (small)',
        freebieAdjustment: -1,
        eras: ALL_ERAS,
        merits: [MERIT_ENHANCED_OLFACTORY, MERIT_PITIABLE],
        flaws: [FLAW_SHORT],
    },
    {
        id: 'gamorrean-slavery',
        name: 'Gamorrean',
        shortDescription: 'Hulking, porcine humanoids known for brute strength',
        description:
            'Gamorreans are hulking, porcine humanoids with thick greenish skin, small tusks, and a culturally ingrained love of combat. Across the galaxy they are stereotyped as brutish thugs — a reputation their aggressive culture does little to dispel. In eras where the Empire or similar regimes hold power, Gamorreans are widely enslaved or discriminated against.',
        category: 'Biped (large)',
        freebieAdjustment: 4,
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: [MERIT_THICK_SKINNED],
        flaws: [FLAW_LIMITED_VOCAL, FLAW_STEREOTYPED_BRUTAL, FLAW_SLAVE_RACE],
    },
    {
        id: 'gamorrean-free',
        name: 'Gamorrean',
        shortDescription: 'Hulking, porcine humanoids known for brute strength',
        description:
            'Gamorreans are hulking, porcine humanoids with thick greenish skin, small tusks, and a culturally ingrained love of combat. In the post-Imperial era, many Gamorreans have begun to integrate into galactic society, though they still contend with lingering stereotypes.',
        category: 'Biped (large)',
        freebieAdjustment: 1,
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: [MERIT_THICK_SKINNED],
        flaws: [FLAW_LIMITED_VOCAL, FLAW_STEREOTYPED_BRUTAL],
    },
    {
        id: 'ithorian',
        name: 'Ithorian',
        shortDescription: 'Gentle, long-necked herbivores with a reverence for nature',
        description:
            'Ithorians are tall, gentle herbivores with two long necks and wide mouths, native to the jungle world of Ithor. They are a deeply spiritual species with a profound reverence for nature, often serving as ecologists and environmental stewards across the galaxy. Their towering height gives them a natural advantage in pursuit, but their ecological philosophy is often dismissed by the wider galaxy.',
        category: 'Biped (large)',
        freebieAdjustment: 0,
        eras: ALL_ERAS,
        merits: [MERIT_TALL],
        flaws: [FLAW_STEREOTYPED_TREEHUGGER],
    },
    {
        id: 'mon-calamari-slavery',
        name: 'Mon Calamari',
        shortDescription: 'Amphibious, fish-headed humanoids gifted in shipbuilding',
        description:
            'Mon Calamari are amphibious humanoids with salmon-colored skin, large expressive eyes, and high-domed heads. They are renowned across the galaxy as master shipwrights and engineers. During the Imperial era, Mon Calamari were enslaved and their oceans exploited. Those who escaped joined the Rebellion, providing its backbone of capital ships.',
        category: 'Amphibious',
        freebieAdjustment: 2,
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: [MERIT_AMPHIBIOUS],
        flaws: [FLAW_ENV_SENSITIVITY_ARID, FLAW_SLAVE_RACE],
    },
    {
        id: 'mon-calamari-free',
        name: 'Mon Calamari',
        shortDescription: 'Amphibious, fish-headed humanoids gifted in shipbuilding',
        description:
            'Mon Calamari are amphibious humanoids with salmon-colored skin, large expressive eyes, and high-domed heads. In the post-Imperial era, Mon Calamari have reclaimed their place in the galaxy as visionary engineers and statespeople, though their physiological sensitivity to arid environments remains.',
        category: 'Amphibious',
        freebieAdjustment: -1,
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: [MERIT_AMPHIBIOUS],
        flaws: [FLAW_ENV_SENSITIVITY_ARID],
    },
    {
        id: 'rodian',
        name: 'Rodian',
        shortDescription: 'Reptilian humanoids with a reputation for bounty hunting',
        description:
            'Rodians are reptilian humanoids with tapered snouts, multifaceted eyes, and a rigid facial crest. Hailing from the damp, jungle planet of Rodia, they are known across the galaxy as skilled bounty hunters and trackers. Their nimble fingers give them an edge in delicate work, but their reputation for untrustworthiness precedes them.',
        category: 'Reptilian',
        freebieAdjustment: 0,
        eras: ALL_ERAS,
        merits: [MERIT_LIGHT_TOUCH],
        flaws: [FLAW_STEREOTYPED_UNTRUSTWORTHY],
    },
    {
        id: 'sullustan',
        name: 'Sullustan',
        shortDescription: 'Large-eyed humanoids with exceptional navigational abilities',
        description:
            'Sullustans are short, large-eyed humanoids native to the volcanic world of Sullust. Their keen senses — evolved in the dim light of their subterranean cities — make them exceptional pilots and navigators. They are known across the galaxy for their innate sense of direction and ability to navigate the most treacherous space lanes.',
        category: 'Biped (small)',
        freebieAdjustment: -4,
        eras: ALL_ERAS,
        merits: [MERIT_ENHANCED_VISION, MERIT_ACUTE_HEARING, MERIT_DIRECTION_SENSE],
        flaws: [],
    },
    {
        id: 'twilek',
        name: "Twi'lek",
        shortDescription: 'Humanoids with distinctive head-tails called lekku',
        description:
            "Twi'leks are humanoids distinguished by their colorful skin and two prehensile head-tails called lekku, which communicate emotion and intent through subtle movements and pheromones. Hailing from the planet Ryloth, Twi'leks are found across the galaxy as diplomats, entertainers, traders, and spies.",
        category: 'Biped',
        freebieAdjustment: -1,
        eras: ALL_ERAS,
        merits: [MERIT_NONVERBAL_LANG],
        flaws: [],
    },
    {
        id: 'wookiee-slavery',
        name: 'Wookiee',
        shortDescription: 'Towering, powerful fur-covered bipeds from Kashyyyk',
        description:
            'Wookiees are towering, powerful bipeds covered in thick fur, native to the forest world of Kashyyyk. They are renowned for their strength, loyalty, and fierce temper. During the Imperial era, Wookiees were enslaved in vast numbers, their homeworld exploited for timber and labor. Those who escaped often joined the Rebellion as fearsome warriors.',
        category: 'Biped (large)',
        freebieAdjustment: -1,
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: [MERIT_NATURAL_WEAPONS, MERIT_TALL, MERIT_BERSERKER, MERIT_POWERFUL],
        flaws: [FLAW_LIMITED_VOCAL, FLAW_STEREOTYPED_TEMPER, FLAW_SLAVE_RACE],
    },
    {
        id: 'wookiee-free',
        name: 'Wookiee',
        shortDescription: 'Towering, powerful fur-covered bipeds from Kashyyyk',
        description:
            'Wookiees are towering, powerful bipeds covered in thick fur, native to the forest world of Kashyyyk. After the fall of the Empire, Kashyyyk was liberated and Wookiee society began to rebuild. In this era, Wookiees stand as free beings — still fierce and proud, but no longer burdened by the chains of slavery.',
        category: 'Biped (large)',
        freebieAdjustment: -4,
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: [MERIT_NATURAL_WEAPONS, MERIT_TALL, MERIT_BERSERKER, MERIT_POWERFUL],
        flaws: [FLAW_LIMITED_VOCAL, FLAW_STEREOTYPED_TEMPER],
    },
];
