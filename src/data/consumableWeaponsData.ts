export interface ConsumableWeaponEntry {
    id: string;
    name: string;
    type: string;
    damage: string;
    damageType: 'L' | 'B' | 'Special';
    falloff: string;
    cost: string;
    notes: string;
    description: string;
}

export const CONSUMABLE_WEAPONS: ConsumableWeaponEntry[] = [
    {
        id: 'fragmentation-grenade',
        name: 'Fragmentation Grenade',
        type: 'Grenade',
        damage: '12D',
        damageType: 'L',
        falloff: '-1 die/yd',
        cost: '200c',
        notes: 'Standard fragmentation blast. Lethal radius ~5 yards.',
        description:
            'The standard military fragmentation grenade found across the galaxy. When detonated, it sprays shrapnel in a lethal radius. At ground zero the full 12D damage pool applies; the pool decreases by 1 die for every yard from the blast center. Frag grenades are unreliable against armored targets but devastating against soft targets.',
    },
    {
        id: 'concussion-grenade',
        name: 'Concussion Grenade',
        type: 'Grenade',
        damage: '8D',
        damageType: 'B',
        falloff: '-1 die/yd',
        cost: '150c',
        notes: 'Non-lethal blast. Stuns and disorients through shockwave.',
        description:
            'A non-lethal explosive that delivers a powerful shockwave designed to stun and disorient rather than kill. Used by police forces, bounty hunters with bounties to collect alive, and military units in hostage situations. The concussive blast bypasses armor and can knock targets unconscious.',
    },
    {
        id: 'thermal-detonator',
        name: 'Thermal Detonator',
        type: 'Grenade',
        damage: '12D',
        damageType: 'L',
        falloff: '-1 die/2yds',
        cost: '500c',
        notes: 'Incendiary explosion. Sets materials on fire. White phosphorus effect.',
        description:
            'A highly volatile explosive that produces both a powerful blast and intense fire. Thermal detonators deal Lethal damage and can ignite flammable materials in the blast radius. The fire element burns for several minutes, dealing additional damage to anyone caught in the area. The blast has a gentler falloff than fragmentation grenades, maintaining effectiveness over a larger area.',
    },
    {
        id: 'smoke-grenade',
        name: 'Smoke Grenade',
        type: 'Grenade',
        damage: '—',
        damageType: 'Special',
        falloff: '—',
        cost: '75c',
        notes: 'Fills 10×10 yd area with thick smoke. Lasts 10 minutes.',
        description:
            'A canister that emits a dense, obscuring cloud of smoke on detonation. The smoke fills a 10×10 yard area and persists for approximately 10 minutes (less in windy conditions). Visibility through smoke is severely limited — all attacks into or through the cloud suffer +3 difficulty. Thermal and infrared optics can partially penetrate.',
    },
    {
        id: 'ion-grenade',
        name: 'Ion Grenade',
        type: 'Grenade',
        damage: '8D',
        damageType: 'Special',
        falloff: '-1 die/yd',
        cost: '250c',
        notes: 'Electromagnetic pulse. Disables droids and electronics. No effect on organics.',
        description:
            'An electromagnetic pulse grenade designed to disable droids, vehicles, and electronic equipment. Deals 8D damage against electronic targets only — organics are completely unaffected. A droid hit by an ion grenade must succeed on a Stamina roll (difficulty 6) or be stunned for 1d3 turns.',
    },
    {
        id: 'proton-grenade',
        name: 'Proton Grenade',
        type: 'Grenade',
        damage: '14D',
        damageType: 'L',
        falloff: '-2 dice/yd',
        cost: '800c',
        notes: 'High-explosive anti-armor grenade. Short lethal radius.',
        description:
            'A shaped-charge grenade designed for anti-armor and anti-structure use. The proton grenade focuses its blast into a directed cone, allowing it to punch through vehicle armor and reinforced doors. Against organic targets, the tight focus means a very small lethal radius but devastating damage at the point of impact.',
    },
    {
        id: 'anti-vehicle-mine',
        name: 'Anti-Vehicle Mine',
        type: 'Mine',
        damage: '14D',
        damageType: 'L',
        falloff: '-2 dice/yd',
        cost: '1,000c',
        notes: 'Pressure-triggered. Designed for vehicles but lethal to personnel.',
        description:
            'A buried explosive device triggered by pressure or proximity. Anti-vehicle mines are designed to disable or destroy speeders, walkers, and ground transports. They are powerful enough to cripple a light vehicle and will kill anyone standing near the detonation. Detection requires an Intelligence + Awareness roll at difficulty 8.',
    },
    {
        id: 'proton-missile',
        name: 'Proton Missile',
        type: 'Missile',
        damage: '16D',
        damageType: 'L',
        falloff: '-2 dice/yd',
        cost: '2,000c',
        notes: 'Vehicle/emplacement weapon. Fired from missile launcher. Speeder-scale damage.',
        description:
            'A self-propelled explosive projectile designed for use against vehicles and fortified positions. Proton missiles require a missile launcher tube to fire and are typically seen in vehicle-mounted or crew-served configurations. The warhead delivers a devastating shaped-charge explosion that can penetrate Walker-scale armor.',
    },
    {
        id: 'concussion-missile',
        name: 'Concussion Missile',
        type: 'Missile',
        damage: '12D',
        damageType: 'B',
        falloff: '-1 die/2yds',
        cost: '1,500c',
        notes: 'Area-effect anti-personnel missile. Wide blast radius.',
        description:
            'A missile with a concussion warhead designed for anti-personnel and soft-target engagement. The blast wave is less lethal than a proton missile but covers a much wider area. Concussion missiles are effective against infantry formations and can be used in atmosphere or vacuum.',
    },
    {
        id: 'explosive-charge',
        name: 'Explosive Charge',
        type: 'Explosive Charge',
        damage: '10D',
        damageType: 'B',
        falloff: '-1 die/yd',
        cost: '300c',
        notes: 'Placed demolition charge. Timer or remote detonation. Can be linked.',
        description:
            'A programmable demolition charge used for breaching, demolition, and structural sabotage. Can be set with a timer (1–60 minute delay) or triggered remotely. Multiple charges can be linked for larger explosions — every doubling of linked charges adds +2D to the damage pool. Placement requires an Intelligence + Demolitions roll.',
    },
];
