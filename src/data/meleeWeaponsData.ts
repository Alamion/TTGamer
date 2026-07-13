export interface MeleeWeaponEntry {
    id: string;
    name: string;
    damage: string;
    damageNotation: string;
    difficulty: number;
    conceal: string;
    notes: string;
    description: string;
}

export const MELEE_WEAPONS: MeleeWeaponEntry[] = [
    {
        id: 'knife',
        name: 'Knife',
        damage: 'Str +1',
        damageNotation: '3d10>=6',
        difficulty: 6,
        conceal: 'Pocket',
        notes: 'Basic blade.',
        description:
            'A simple blade — combat knife, vibro-shiv, or equivalent. Ubiquitous across the galaxy. When all else fails, you still have a knife.',
    },
    {
        id: 'vibroblade',
        name: 'Vibroblade',
        damage: 'Str +2',
        damageNotation: '4d10>=6',
        difficulty: 6,
        conceal: 'Jacket',
        notes: 'Powered blade (+1D over standard knife).',
        description:
            'A powered blade that vibrates at ultra-high frequency, allowing it to slice through armor and bone. Standard melee weapon for military operatives and bounty hunters who expect to face armored opponents. The vibro-edge adds +1D to the damage of a standard knife.',
    },
    {
        id: 'club-baton',
        name: 'Club / Baton',
        damage: 'Str +1',
        damageNotation: '3d10>=6',
        difficulty: 4,
        conceal: 'Jacket',
        notes: 'Basic blunt weapon. Easy to use.',
        description:
            'A simple club, baton, or weighted bar. Easy to pick up and swing — the lowest difficulty of any melee weapon. Standard issue for police and security forces who prefer non-lethal options.',
    },
    {
        id: 'sword',
        name: 'Sword',
        damage: 'Str +2',
        damageNotation: '4d10>=6',
        difficulty: 6,
        conceal: 'Jacket',
        notes: 'Heavy bladed weapon. Better chopping power than a knife.',
        description:
            'A heavy bladed weapon — vibrosword, cavalry sabre, or ceremonial blade. Carried by officers for tradition and by warriors for practicality. A well-made sword can cleave through unarmored opponents and holds an edge even after heavy use.',
    },
    {
        id: 'force-pike',
        name: 'Force Pike',
        damage: 'Str +3',
        damageNotation: '5d10>=6',
        difficulty: 7,
        conceal: 'None',
        notes: 'Electrified polearm. Can be shortened for storage.',
        description:
            'A collapsible polearm with an electrified tip carried by Imperial Royal Guards and Praetorian Guards. The force pike can deliver a powerful shock on contact, stunning or killing unarmored targets. Its reach makes it effective against lightsaber-wielders, and the shaft is reinforced to withstand a lightsaber blow.',
    },
    {
        id: 'electrostaff',
        name: 'Electrostaff',
        damage: 'Str +3',
        damageNotation: '5d10>=6',
        difficulty: 7,
        conceal: 'None',
        notes: 'Magnetically sealed staff. Can parry lightsabers.',
        description:
            "A magnetically sealed staff with energized ends, used by MagnaGuards and elite separatist troops. The electrostaff is specifically designed to resist lightsaber cuts — the magnetic seals disperse the blade's energy. Each end delivers a stunning electrical discharge on contact.",
    },
    {
        id: 'staff',
        name: 'Staff',
        damage: 'Str +2',
        damageNotation: '4d10>=6',
        difficulty: 6,
        conceal: 'None',
        notes: 'Two-handed reach weapon.',
        description:
            'A long striking pole, quarterstaff, or electrostaff. Grants reach advantage and can be used to trip, block, or strike from range. Requires two hands but delivers solid impact.',
    },
    {
        id: 'training-lightsaber',
        name: 'Training Lightsaber',
        damage: 'Str +1',
        damageNotation: '3d10>=6',
        difficulty: 8,
        conceal: 'Jacket',
        notes: 'Non-lethal practice blade. Stuns on contact.',
        description:
            'A low-power lightsaber used by Jedi younglings and padawans for training. The blade delivers a painful but non-lethal stun, allowing students to spar without risk of dismemberment. Uses the same difficulty as a standard lightsaber but deals minimal damage.',
    },
    {
        id: 'lightsaber',
        name: 'Lightsaber',
        damage: 'Str +5',
        damageNotation: '7d10>=6',
        difficulty: 8,
        conceal: 'Jacket',
        notes: 'Ignores armor. Difficulty 8 (reduced by training).',
        description:
            'The elegant weapon of a Jedi Knight. A blade of pure plasma that cuts through almost any material. Lightsabers ignore all armor soak dice — only specially reinforced exotic materials can resist them. The base difficulty of 8 reflects the intense focus required; training in Force skills can reduce this.',
    },
];
