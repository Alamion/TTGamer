export interface RangedWeaponEntry {
    id: string;
    name: string;
    damage: string;
    damageNotation: string;
    range: number;
    ammo: number;
    difficulty: number;
    conceal: string;
    notes: string;
    description: string;
}

export const RANGED_WEAPONS: RangedWeaponEntry[] = [
    {
        id: 'hold-out-blaster',
        name: 'Hold-out Blaster',
        damage: '5D',
        damageNotation: '5d10>=6',
        range: 12,
        ammo: 6,
        difficulty: 6,
        conceal: 'Pocket',
        notes: 'Easy to hide. Lowest stopping power of any blaster.',
        description:
            'A compact blaster designed for concealed carry. Small enough to fit in a boot or sleeve holster, the hold-out blaster is the weapon of choice for smugglers, spies, and anyone who needs a backup piece. Its compact power cell limits both range and stopping power, but a blaster in hand beats a rifle in the locker.',
    },
    {
        id: 'light-blaster-pistol',
        name: 'Light Blaster Pistol',
        damage: '6D',
        damageNotation: '6d10>=6',
        range: 30,
        ammo: 25,
        difficulty: 6,
        conceal: 'Jacket',
        notes: 'Standard sidearm. Most common blaster in the galaxy.',
        description:
            'The standard sidearm across the galaxy — reliable, easy to maintain, and powerful enough for most situations. Used by civilian self-defenders, sector rangers, and anyone who needs a no-nonsense blaster. The DH-17 and its countless knock-offs are found on every settled world.',
    },
    {
        id: 'heavy-blaster-pistol',
        name: 'Heavy Blaster Pistol',
        damage: '7D',
        damageNotation: '7d10>=6',
        range: 35,
        ammo: 6,
        difficulty: 6,
        conceal: 'Jacket',
        notes: 'Powerful sidearm. Highest damage of any one-handed blaster.',
        description:
            'A large-frame blaster pistol trading concealability for stopping power. Favored by bounty hunters and officers who want to end a fight with a single shot. The hefty power pack and reinforced emitter produce a bolt that punches through light cover.',
    },
    {
        id: 'sporting-blaster-rifle',
        name: 'Sporting Blaster Rifle',
        damage: '8D',
        damageNotation: '8d10>=6',
        range: 175,
        ammo: 25,
        difficulty: 6,
        conceal: 'None',
        notes: 'Civilian hunting rifle. Less rugged than military grade.',
        description:
            "A civilian-grade blaster rifle designed for sport hunting and vermin control on colony worlds. Less robust than military hardware but still deadly — a tusken raider's cycler rifle is functionally identical. Common on frontier worlds where predators threaten livestock and settlements.",
    },
    {
        id: 'blaster-carbine',
        name: 'Blaster Carbine',
        damage: '8D',
        damageNotation: '8d10>=6',
        range: 100,
        ammo: 25,
        difficulty: 6,
        conceal: 'Trenchcoat',
        notes: 'Compact rifle. Shorter barrel than a full rifle but still braced.',
        description:
            'A compact shoulder-braced blaster that bridges the gap between pistol and rifle. Used by scout troopers, naval security, and anyone needing a full-power weapon without the bulk of a long rifle. Easier to maneuver in tight corridors than a full-length blaster rifle.',
    },
    {
        id: 'blaster-rifle',
        name: 'Blaster Rifle',
        damage: '9D',
        damageNotation: '9d10>=6',
        range: 200,
        ammo: 50,
        difficulty: 6,
        conceal: 'None',
        notes: 'Standard military long arm. Power pack sustains extended engagements.',
        description:
            'The standard-issue long arm of the Imperial military and most planetary defense forces. The E-11 and its contemporaries pack a heavy punch at long range and can sustain extended firefights. Carried openly — too large to conceal on a person.',
    },
    {
        id: 'heavy-blaster-rifle',
        name: 'Heavy Blaster Rifle',
        damage: '10D',
        damageNotation: '10d10>=6',
        range: 200,
        ammo: 30,
        difficulty: 6,
        conceal: 'None',
        notes: 'High-powered military rifle. Heavy recoil but devastating damage.',
        description:
            'A heavier military-grade blaster rifle trading portability for raw stopping power. The DLT-19 and similar models are used by heavy weapon specialists and elite stormtroopers. Its reinforced emitter assembly produces a bolt that can punch through light vehicle armor.',
    },
    {
        id: 'blaster-sniper-rifle',
        name: 'Blaster Sniper Rifle',
        damage: '10D',
        damageNotation: '10d10>=6',
        range: 400,
        ammo: 10,
        difficulty: 6,
        conceal: 'None',
        notes: 'Long-range precision weapon. Can be broken down for transport.',
        description:
            'A precision long-arm with an enhanced targeting scope and focused emitter for extreme accuracy at range. The sniper rifle can be disassembled into a compact carrying case, requiring a full action to assemble. Adds +2 dice to Perception-based aiming rolls when the target is stationary or unaware.',
    },
    {
        id: 'light-repeating-blaster',
        name: 'Light Repeating Blaster',
        damage: '6D',
        damageNotation: '6d10>=6',
        range: 100,
        ammo: 100,
        difficulty: 6,
        conceal: 'None',
        notes: 'Full-Auto capable. Belt-fed power pack.',
        description:
            'A crew-served or bipod-braced automatic blaster that lays down sustained suppressing fire. Uses Full-Auto rules: can spray an area, hitting multiple targets. Standard issue for heavy weapon troopers, E-Web emplacements, and shipboard security. The belt-fed power magazine allows extended fire.',
    },
    {
        id: 'slugthrower-pistol',
        name: 'Slugthrower Pistol',
        damage: '4D',
        damageNotation: '4d10>=6',
        range: 20,
        ammo: 8,
        difficulty: 6,
        conceal: 'Jacket',
        notes: 'Primitive projectile weapon. -1D damage vs equivalent blaster.',
        description:
            'A primitive projectile weapon that fires solid metal slugs rather than plasma bolts. Common on backwater worlds where power packs are scarce. Slugthrowers are less damaging and carry fewer shots than blasters, but their ammunition can be manufactured locally. The projectiles can penetrate some materials that dissipate blaster bolts.',
    },
    {
        id: 'slugthrower-rifle',
        name: 'Slugthrower Rifle',
        damage: '6D',
        damageNotation: '6d10>=6',
        range: 150,
        ammo: 15,
        difficulty: 6,
        conceal: 'None',
        notes: 'Kinetic long arm. -1D damage vs equivalent blaster rifle.',
        description:
            'A long-barreled projectile rifle firing metal-jacketed slugs. Used by militia forces, primitive cultures, and anyone who needs a weapon that can be maintained with a basic tool kit. The crack of a slugthrower echoes across countless Outer Rim worlds where blaster tech is a luxury.',
    },
    {
        id: 'bowcaster',
        name: 'Bowcaster',
        damage: '4L+4B',
        damageNotation: '4d10>=6',
        range: 20,
        ammo: 1,
        difficulty: 6,
        conceal: 'None',
        notes: 'Explosive quarrel. Cock action requires Feat of Strength (pool 4).',
        description:
            'A traditional Wookiee weapon that fires explosive quarrels wrapped in an energy cocoon. On impact the quarrel deals 4D Lethal damage to the target and 4D Bashing damage to the target and anyone nearby — the bowcaster is effectively a grenade launcher. Must be manually cocked between shots (Feat of Strength, pool 4). Uses the Blaster skill.',
    },
];
