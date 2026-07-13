export interface ArmorEntry {
    id: string;
    name: string;
    classVal: number;
    ar: string;
    dexPenalty: string;
    cost: string;
    notes: string;
    description: string;
}

export const ARMOR: ArmorEntry[] = [
    {
        id: 'armored-clothing',
        name: 'Armored Clothing',
        classVal: 1,
        ar: '+0D',
        dexPenalty: '0',
        cost: '500c',
        notes: 'Concealed light plating sewn into normal clothes. No AR bonus but provides minimal protection.',
        description:
            'Street clothes reinforced with thin flexi-plate inserts. Offers negligible ballistic protection but can turn a knife blade or reduce a glancing blaster hit. The main advantage is concealment — nobody knows you are armored until they hit you.',
    },
    {
        id: 'blast-vest-helmet',
        name: 'Blast Vest & Helmet',
        classVal: 1,
        ar: '+1D',
        dexPenalty: '0',
        cost: '600c',
        notes: 'Basic protection. Adds dice to Stamina soak.',
        description:
            'A flexible blast-proof vest paired with a light helmet. Standard issue for private security, militia, and anyone expecting low-level threats. Provides minimal protection against blaster fire but offers peace of mind against shrapnel and glancing shots. The light construction does not impede movement.',
    },
    {
        id: 'flight-suit',
        name: 'Flight Suit',
        classVal: 1,
        ar: '+1D',
        dexPenalty: '0',
        cost: '800c',
        notes: 'Pilot suit. Vacuum-sealed with emergency oxygen (30 min).',
        description:
            'A form-fitting vacuum-sealed suit worn by starfighter pilots and ship crew. Provides emergency life support, temperature regulation, and minimal blast protection. The suit can sustain a wearer in vacuum for 30 minutes and includes a comlink, locator beacon, and medical monitor.',
    },
    {
        id: 'combat-jumpsuit',
        name: 'Combat Jumpsuit',
        classVal: 2,
        ar: '+1D',
        dexPenalty: '0',
        cost: '1,200c',
        notes: 'Flexible combat uniform. Low profile, no movement penalty.',
        description:
            'A reinforced body glove worn under armor or alone for light protection. Standard issue for Imperial Navy officers and crew who need protection without the bulk of full armor. The durasteel-weave fabric can deflect shrapnel and reduce blaster damage while allowing full mobility.',
    },
    {
        id: 'bounty-hunter-armor',
        name: 'Bounty Hunter Armor',
        classVal: 2,
        ar: '+2D',
        dexPenalty: '-1D',
        cost: '2,500c',
        notes: 'Heavy combat armor. Reduces dexterity pools.',
        description:
            'Reinforced combat plating favored by bounty hunters, elite mercenaries, and Rebel commandos. Offers meaningful protection against blaster fire but the bulk limits agility. Often customized with pouches, weapon holsters, and utility mounts.',
    },
    {
        id: 'armored-flightsuit',
        name: 'Armored Flightsuit',
        classVal: 2,
        ar: '+2D',
        dexPenalty: '-1D',
        cost: '3,000c',
        notes: 'Flight suit with integrated armor plates. Reduces dexterity.',
        description:
            'A hybrid of flight suit and combat armor — the vacuum seal and life support of a flight suit combined with trauma plates. Used by TIE fighter pilots and boarding parties who need both environmental protection and combat durability.',
    },
    {
        id: 'light-combat-armor',
        name: 'Light Combat Armor',
        classVal: 3,
        ar: '+2D',
        dexPenalty: '-1D',
        cost: '5,000c',
        notes: 'Military-grade light plating. Balances protection and mobility.',
        description:
            'Military-grade armor plates over a padded body glove, offering a compromise between protection and mobility. Used by special forces, elite units, and mercenary commanders who need to stay agile while expecting heavy resistance.',
    },
    {
        id: 'stormtrooper-armor',
        name: 'Stormtrooper Armor',
        classVal: 3,
        ar: '+3D',
        dexPenalty: '-2D',
        cost: '—',
        notes: 'Imperial issue. Highest AR, heaviest penalty. Not available for purchase.',
        description:
            'The iconic white plastoid armor of the Imperial stormtrooper. Offers the best protection of any commonly seen armor but severely restricts mobility. The helmet includes a comlink, heads-up display, and environmental filters. Not available on the open market — usually acquired from defeated troopers.',
    },
    {
        id: 'heavy-combat-armor',
        name: 'Heavy Combat Armor',
        classVal: 4,
        ar: '+4D',
        dexPenalty: '-3D',
        cost: '10,000c',
        notes: 'Full body plating. Extremely heavy dexterity penalty.',
        description:
            'Full-body durasteel plating used by heavy assault troopers and combat droids. Offers exceptional protection at the cost of almost all agility. The wearer cannot run and suffers a -3D penalty to all Dexterity-based pools. Not recommended for extended operations.',
    },
    {
        id: 'mandalorian-armor',
        name: 'Mandalorian Armor',
        classVal: 4,
        ar: '+3D',
        dexPenalty: '-1D',
        cost: '—',
        notes: 'Legendary beskar alloy. Superior protection without bulk. Only damaged by lightsabers.',
        description:
            'Forged from beskar, the near-indestructible Mandalorian iron. Mandalorian armor offers exceptional protection without the bulk of conventional armor, resisting blaster fire with ease and even withstanding lightsaber strikes (though sustained contact will eventually cut through). Each set is custom-crafted and culturally significant. Never sold — only inherited or earned.',
    },
    {
        id: 'jedi-robes',
        name: 'Jedi Robes',
        classVal: 1,
        ar: '+0D',
        dexPenalty: '0',
        cost: '—',
        notes: 'Traditional Jedi attire. No armor value but may provide minor resistance to energy.',
        description:
            "The traditional robes of a Jedi Knight. While offering no conventional armor protection, the robes are often treated with defensive compounds that provide marginal resistance to energy attacks. More importantly, they do not impede a Jedi's movement or connection to the Force.",
    },
];
