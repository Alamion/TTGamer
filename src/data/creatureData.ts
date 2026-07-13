export interface CreatureAttack {
    name: string;
    damage: string;
    type: 'L' | 'B';
}

export interface CreatureTrait {
    name: string;
    description: string;
}

export interface CreatureAbility {
    name: string;
    dice: string;
}

export interface CreatureEntry {
    id: string;
    name: string;
    type: string;
    scale: string;
    size: string;
    strength: string;
    dexterity: string;
    stamina: string;
    perception: string;
    intelligence: string;
    wits: string;
    willpower: string;
    abilities: CreatureAbility[];
    armor: string | null;
    attacks: CreatureAttack[];
    movement: string;
    merits: CreatureTrait[];
    flaws: CreatureTrait[];
    description: string;
    source: string;
}

export const CREATURES: CreatureEntry[] = [
    {
        id: 'wampa',
        name: 'Wampa',
        type: 'Snow predator',
        scale: 'Speeder',
        size: '3m tall',
        strength: '5D',
        dexterity: '3D',
        stamina: '5D',
        perception: '2D',
        intelligence: '2D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Stealth', dice: '3D' },
            { name: 'Survival', dice: '3D' },
            { name: 'Intimidation', dice: '3D' },
        ],
        armor: 'Tough hide +1D',
        attacks: [
            { name: 'Claw', damage: 'STR+1D', type: 'L' },
            { name: 'Teeth', damage: 'STR+2D', type: 'L' },
        ],
        movement: 'Tracking, Walking',
        merits: [
            { name: 'Powerful +3', description: '+3 dice to Strength-related rolls.' },
            {
                name: 'Non-verbal Language (howl)',
                description: 'Communicates through howls and body language.',
            },
            {
                name: 'Camouflage (snow)',
                description: 'Gains bonus to Stealth in snowy environments.',
            },
        ],
        flaws: [],
        description:
            'A massive, carnivorous predator native to the ice world of Hoth. Wampas hunt by tracking prey through blizzards, using their thick fur and powerful build to endure the extreme cold. They drag their kills back to icy caves for later consumption. Their claws and teeth can tear through most armor, and their strength is legendary — a wampa can rip a man-sized target apart with ease.',
        source: 'SWRPG page 224',
    },
    {
        id: 'tauntaun',
        name: 'Tauntaun',
        type: 'Arctic climate omnivore',
        scale: 'Speeder',
        size: '1.2–3m at the shoulder',
        strength: '4D',
        dexterity: '3D',
        stamina: '4D',
        perception: '3D',
        intelligence: '3D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Alertness', dice: '3D' },
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Dodge', dice: '4D' },
            { name: 'Intimidation', dice: '2D' },
            { name: 'Stealth', dice: '3D' },
        ],
        armor: null,
        attacks: [{ name: 'Charge', damage: 'STR+1D', type: 'B' }],
        movement: 'Running',
        merits: [
            {
                name: 'Environment Adaptation (cold)',
                description: 'Ignores penalties from cold environments.',
            },
            {
                name: 'Extra Appendage (tail)',
                description: 'Gains one additional limb for balance and limited attacks.',
            },
        ],
        flaws: [],
        description:
            'A furry, two-legged omnivore native to the icy plains of Hoth. Tauntauns are used as mounts by the Rebel Alliance, prized for their speed, endurance, and resistance to cold. They are herd animals by nature, trainable with patience, and fiercely protective of their riders. Their charge attack delivers a powerful bashing impact.',
        source: 'SWRPG page 222',
    },
    {
        id: 'rancor',
        name: 'Rancor',
        type: 'Subterranean carnivore',
        scale: 'Walker',
        size: '5–10m tall',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '2D',
        intelligence: '1D',
        wits: '3D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Intimidation', dice: '5D' },
            { name: 'Stealth', dice: '1D' },
        ],
        armor: 'Thick hide +2D',
        attacks: [
            { name: 'Claw', damage: 'STR+3D', type: 'L' },
            { name: 'Bite', damage: 'STR+4D', type: 'L' },
            { name: 'Stomp', damage: 'STR+2D', type: 'B' },
        ],
        movement: 'Walking, Charging',
        merits: [
            { name: 'Powerful +4', description: '+4 dice to Strength-related rolls.' },
            { name: 'Thick Skinned +2', description: '+2 dice to Stamina soak.' },
            { name: 'Berserker', description: 'Ignores wound penalties when enraged.' },
        ],
        flaws: [
            {
                name: 'Weakness (bright light)',
                description: 'Suffers penalties in bright light; may be dazed by flash weapons.',
            },
            {
                name: 'Bestial Intelligence',
                description:
                    'Cannot reason or communicate — driven entirely by instinct and hunger.',
            },
        ],
        description:
            'A hulking subterranean carnivore with a ravenous appetite and tremendous strength. Rancors are used by crime lords and arena masters as executioners and gladiatorial beasts. Despite their slow intellect, they are cunning ambush predators in their native cave environments. A Rancor at Walker scale can tear through armored vehicles and shrug off blaster fire that would fell a platoon of soldiers.',
        source: 'SWRPG page 225',
    },
    {
        id: 'nexu',
        name: 'Nexu',
        type: 'Apex feline predator',
        scale: 'Character',
        size: '1.5m at the shoulder',
        strength: '4D',
        dexterity: '5D',
        stamina: '3D',
        perception: '4D',
        intelligence: '2D',
        wits: '5D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '5D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: null,
        attacks: [
            { name: 'Claw rake', damage: 'STR+2D', type: 'L' },
            { name: 'Bite (neck snap)', damage: 'STR+3D', type: 'L' },
        ],
        movement: 'Pouncing, Climbing, Sprinting',
        merits: [
            { name: 'Cat-like Reflexes +2', description: '+2 dice to Dexterity-related rolls.' },
            { name: 'Natural Weapons (claws)', description: 'Retractable claws count as weapons.' },
            { name: 'Ambush Predator', description: 'Gains bonus dice on surprise attacks.' },
        ],
        flaws: [
            {
                name: 'Feral Rage',
                description: 'May attack nearest target indiscriminately when wounded.',
            },
        ],
        description:
            'A lean, quadrupedal predator covered in tan fur with quills running down its spine. Native to the planet Cholganna, the Nexu is a relentless hunter that combines feline grace with reptilian resilience. Its quills flare when threatened, and it can scale sheer surfaces to ambush prey from above. In the Geonosian arena, a Nexu proved itself a deadly opponent — fast enough to dodge blaster bolts and strong enough to tear through humanoid targets.',
        source: 'SWRPG page 226',
    },
    {
        id: 'acklay',
        name: 'Acklay',
        type: 'Aquatic crustacean predator',
        scale: 'Walker',
        size: '3–4m tall',
        strength: '5D',
        dexterity: '3D',
        stamina: '5D',
        perception: '3D',
        intelligence: '1D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Intimidation', dice: '4D' },
        ],
        armor: 'Chitinous carapace +3D',
        attacks: [
            { name: 'Pincer', damage: 'STR+2D', type: 'L' },
            { name: 'Leg blade', damage: 'STR+3D', type: 'L' },
            { name: 'Stomp', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Walking, Swimming',
        merits: [
            { name: 'Thick Skinned +3', description: '+3 dice to Stamina soak.' },
            {
                name: 'Environment Adaptation (aquatic)',
                description: 'Breathes and moves freely underwater.',
            },
            {
                name: 'Extra Limbs (6 legs)',
                description: 'Multiple limbs for stability and multiple attacks.',
            },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Driven entirely by instinct and hunger.',
            },
            { name: 'Slow on Land', description: 'Reduced movement speed on solid ground.' },
        ],
        description:
            'A giant, six-legged crustacean with bladed forelimbs and a chitinous exoskeleton. Native to the planet Vendaxa, the Acklay is an amphibious predator equally at home in water or on land. Its legs end in razor-sharp points that can impale a human-sized target, and its claws can crush durasteel. The Acklay was famously used in the Geonosian arena, where its aquatic adaptations proved a terrifying surprise for opponents.',
        source: 'SWRPG page 226',
    },
    {
        id: 'reek',
        name: 'Reek',
        type: 'Herbivorous bovine',
        scale: 'Speeder',
        size: '2.5m at the shoulder',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '2D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Intimidation', dice: '3D' },
        ],
        armor: 'Thick hide +2D',
        attacks: [
            { name: 'Gore (horn)', damage: 'STR+3D', type: 'L' },
            { name: 'Stomp', damage: 'STR+2D', type: 'B' },
            { name: 'Charge', damage: 'STR+2D', type: 'B' },
        ],
        movement: 'Walking, Charging',
        merits: [
            { name: 'Powerful +3', description: '+3 dice to Strength-related rolls.' },
            { name: 'Thick Skinned +2', description: '+2 dice to Stamina soak.' },
            { name: 'Berserker', description: 'Ignores wound penalties when enraged.' },
        ],
        flaws: [
            {
                name: 'Short Temper',
                description: 'Must make a Wits roll to avoid charging when provoked.',
            },
        ],
        description:
            'A massive, thick-hided bovine with three sharp horns and a volatile temper. Native to the planet Ylesia, the Reek is a herbivore by diet but a brawler by nature. Its thick hide shrugs off most attacks, and its horns can punch through armor plate. In the Geonosian arena, a Reek proved that herbivores can be just as deadly as predators when provoked. Its charge attack builds tremendous momentum.',
        source: 'SWRPG page 227',
    },
    {
        id: 'mynock',
        name: 'Mynock',
        type: 'Space-dwelling parasite',
        scale: 'Vermin',
        size: '0.5–1m wingspan',
        strength: '1D',
        dexterity: '3D',
        stamina: '2D',
        perception: '3D',
        intelligence: '1D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Stealth', dice: '4D' },
        ],
        armor: null,
        attacks: [{ name: 'Bite (cable)', damage: 'STR+1D', type: 'L' }],
        movement: 'Flying (space), Clinging',
        merits: [
            {
                name: 'Environment Adaptation (vacuum)',
                description: 'Survives and flies in the vacuum of space.',
            },
            {
                name: 'Sonar Navigation',
                description: 'Navigates via sonar in darkness or dense environments.',
            },
        ],
        flaws: [
            {
                name: 'Fragile',
                description: 'Easily killed by physical attacks; suffers double wound penalties.',
            },
        ],
        description:
            'A leathery, winged parasite that dwells in the void of space, often found in asteroid fields or clinging to the hulls of starships. Mynocks feed on energy — draining power cables, hyperspace motivators, and other ship systems. They are more nuisance than threat to armed crews, but a swarm can disable a ship over time. Their screech is unmistakable in the corridors of a darkened vessel.',
        source: 'SWRPG page 227',
    },
    {
        id: 'dianoga',
        name: 'Dianoga',
        type: 'Trash-compactor scavenger',
        scale: 'Speeder',
        size: '3–8m long',
        strength: '4D',
        dexterity: '3D',
        stamina: '4D',
        perception: '3D',
        intelligence: '1D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Tough hide +1D',
        attacks: [
            { name: 'Tentacle constriction', damage: 'STR+2D', type: 'B' },
            { name: 'Bite', damage: 'STR+1D', type: 'L' },
        ],
        movement: 'Swimming, Clinging',
        merits: [
            {
                name: 'Environment Adaptation (aquatic)',
                description: 'Breathes and moves freely in water and sewage.',
            },
            {
                name: 'Extra Appendage (tentacles)',
                description: 'Seven tentacles for grappling and constriction.',
            },
            {
                name: 'Ambush Predator',
                description: 'Gains bonus dice on surprise attacks from hiding.',
            },
            { name: 'Camouflage (refuse)', description: 'Blends into garbage and murky water.' },
        ],
        flaws: [
            {
                name: 'Light Sensitivity',
                description: 'Disoriented by bright light; suffers penalties in illuminated areas.',
            },
            {
                name: 'Bestial Intelligence',
                description: 'Driven entirely by instinct and hunger.',
            },
        ],
        description:
            'A massive, tentacled scavenger that lurks in garbage compactors, sewers, and waste processing facilities across the galaxy. The dianoga has a single central eye atop a stalk and seven muscular tentacles. Native to the planet Vodran, dianogas have spread across the galaxy as stowaways on transports. They lie submerged in refuse, striking with their tentacles to drag prey into the depths. The trash compactor on the Death Star held a particularly large specimen.',
        source: 'SWRPG page 227',
    },
    {
        id: 'sarlacc',
        name: 'Sarlacc',
        type: 'Subterranean pit dweller',
        scale: 'Capitol',
        size: '100m+ deep',
        strength: '5D',
        dexterity: '1D',
        stamina: '5D',
        perception: '3D',
        intelligence: '1D',
        wits: '2D',
        willpower: '6D',
        abilities: [
            { name: 'Brawl', dice: '3D' },
            { name: 'Intimidation', dice: '5D' },
            { name: 'Survival', dice: '2D' },
        ],
        armor: 'Impenetrable hide +5D',
        attacks: [
            { name: 'Tentacle', damage: 'STR+2D', type: 'B' },
            { name: 'Beak', damage: 'STR+4D', type: 'L' },
        ],
        movement: 'Stationary (buried)',
        merits: [
            {
                name: 'Thick Skinned +5',
                description: '+5 dice to Stamina soak; virtually impenetrable.',
            },
            {
                name: 'Extra Appendage (tentacles)',
                description: 'Multiple tentacles can reach up to 20m from the pit.',
            },
            {
                name: 'Regeneration',
                description: 'Heals damage over time; almost impossible to kill permanently.',
            },
        ],
        flaws: [
            {
                name: 'Immobile',
                description: 'Cannot move — entirely dependent on prey coming to it.',
            },
            {
                name: 'Bestial Intelligence',
                description: 'Acts on pure instinct; no reasoning capacity.',
            },
        ],
        description:
            "A colossal, immobile predator that buries itself in desert sand, leaving only a wide pit opening. Found on Tatooine and similar arid worlds, the sarlacc digests its prey over a thousand years, consuming them slowly in its cavernous gullet. Its tentacles are strong enough to pull a fully grown humanoid into the pit, and its beak can crush durasteel. The sarlacc's near-immortal nature makes it more a terrain hazard than a traditional combat encounter.",
        source: 'SWRPG page 228',
    },
    {
        id: 'krayt-dragon',
        name: 'Krayt Dragon',
        type: 'Apex desert predator',
        scale: 'Walker',
        size: '20–50m long',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '4D',
        intelligence: '2D',
        wits: '4D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '5D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Intimidation', dice: '5D' },
            { name: 'Survival', dice: '4D' },
            { name: 'Stealth', dice: '4D' },
        ],
        armor: 'Armored scales +4D',
        attacks: [
            { name: 'Bite', damage: 'STR+4D', type: 'L' },
            { name: 'Tail sweep', damage: 'STR+3D', type: 'B' },
            { name: 'Claw', damage: 'STR+2D', type: 'L' },
            { name: 'Acid spit', damage: '6D', type: 'L' },
        ],
        movement: 'Burrowing, Walking',
        merits: [
            { name: 'Powerful +4', description: '+4 dice to Strength-related rolls.' },
            { name: 'Thick Skinned +4', description: '+4 dice to Stamina soak.' },
            {
                name: 'Natural Weapons (acid)',
                description: 'Can spit corrosive acid that ignores armor.',
            },
            { name: 'Burrower', description: 'Can burrow through sand and rock at full speed.' },
        ],
        flaws: [{ name: 'Rare', description: 'Extremely rare; encounters are legendary events.' }],
        description:
            "The undisputed apex predator of Tatooine, the Krayt Dragon is a massive reptilian beast that can burrow through solid rock and sand. Its armored scales are nearly impervious to blaster fire, and its acidic spit can dissolve a human in seconds. The dragon's bellow can be heard for kilometers across the Dune Sea. Tusken Raiders revere the Krayt Dragon and hunt it for its pearl — a valuable gem formed in its gullet.",
        source: 'SWRPG page 228',
    },
    {
        id: 'dewback',
        name: 'Dewback',
        type: 'Desert reptile mount',
        scale: 'Speeder',
        size: '1.5m at the shoulder, 3m long',
        strength: '4D',
        dexterity: '2D',
        stamina: '4D',
        perception: '3D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: 'Scaly hide +1D',
        attacks: [
            { name: 'Bite', damage: 'STR+1D', type: 'L' },
            { name: 'Tail slap', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Walking, Running',
        merits: [
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot, arid environments.',
            },
            {
                name: 'Pack Animal',
                description: 'Can carry heavy loads over long distances without penalty.',
            },
        ],
        flaws: [],
        description:
            'A large, docile desert reptile commonly used as a mount by Imperials and locals across Tatooine. Dewbacks are cold-blooded, absorbing heat from the twin suns and becoming sluggish in the cold. Their scaly hides provide natural armor against the elements and blaster fire. Dewbacks are loyal, trainable mounts that can go for days without water and navigate the Dune Sea with unerring instinct.',
        source: 'SWRPG page 229',
    },
    {
        id: 'bantha',
        name: 'Bantha',
        type: 'Desert pack animal',
        scale: 'Speeder',
        size: '2–3m at the shoulder',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '3D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Shaggy hide +1D',
        attacks: [
            { name: 'Gore (horn)', damage: 'STR+2D', type: 'L' },
            { name: 'Stomp', damage: 'STR+2D', type: 'B' },
        ],
        movement: 'Walking, Herd migration',
        merits: [
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot, arid environments.',
            },
            {
                name: 'Pack Animal',
                description: 'Can carry heavy loads over long distances without penalty.',
            },
            {
                name: 'Herd Instinct',
                description: 'Fights more effectively when near other banthas.',
            },
        ],
        flaws: [
            { name: 'Stubborn', description: 'May refuse commands if mistreated or frightened.' },
        ],
        description:
            "A massive, shaggy-haired ungulate native to Tatooine and other arid worlds. Banthas are the primary beasts of burden for Tusken Raiders, who form deep spiritual bonds with their mounts. Their thick fur protects them from the twin suns by day and insulates against the cold desert night. A bantha's curved horns can gore a predator, and the herd will rally to protect its members. Their mournful call is an iconic sound of the Dune Sea.",
        source: 'SWRPG page 229',
    },
    {
        id: 'ronto',
        name: 'Ronto',
        type: 'Large pack animal',
        scale: 'Speeder',
        size: '5m at the shoulder',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '2D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Intimidation', dice: '3D' },
        ],
        armor: 'Thick leathery hide +1D',
        attacks: [
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
            { name: 'Tail swipe', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Walking, Slow running',
        merits: [
            {
                name: 'Pack Animal',
                description: 'Can carry extremely heavy loads over long distances.',
            },
            { name: 'Powerful +2', description: '+2 dice to Strength-related rolls.' },
        ],
        flaws: [
            { name: 'Slow', description: 'Reduced movement speed; cannot outrun most predators.' },
        ],
        description:
            'A colossal, slow-moving reptile used as a beast of burden across the Outer Rim. Rontos stand taller than most speeders and can carry entire trading post inventories on their backs. They are gentle by nature but can defend themselves with surprising ferocity when provoked. Jawas prize rontos for their scavenging expeditions, loading them with salvaged technology.',
        source: 'SWRPG page 230',
    },
    {
        id: 'fathier',
        name: 'Fathier',
        type: 'Racing mount',
        scale: 'Speeder',
        size: '2m at the shoulder',
        strength: '4D',
        dexterity: '4D',
        stamina: '4D',
        perception: '3D',
        intelligence: '2D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '5D' },
            { name: 'Brawl', dice: '1D' },
            { name: 'Alertness', dice: '3D' },
        ],
        armor: null,
        attacks: [{ name: 'Kick', damage: 'STR+2D', type: 'B' }],
        movement: 'Galloping (sprint)',
        merits: [
            {
                name: 'Fast',
                description: 'Exceptional speed; can outrun most ground vehicles in a sprint.',
            },
            {
                name: 'Skittish',
                description: 'Highly responsive to rider commands but easily spooked.',
            },
        ],
        flaws: [
            {
                name: 'Skittish',
                description: 'Frightened by loud noises and unexpected events; may bolt.',
            },
            { name: 'Fragile Temperament', description: 'Performs poorly under harsh treatment.' },
        ],
        description:
            'A sleek, long-legged ungulate bred for speed across the galaxy. Fathiers are the premier racing mounts of the New Republic era, with champion bloodlines trading for fortunes. Their powerful hind legs can launch them into a gallop that blurs past most ground vehicles. Fathiers are sensitive animals — a calm, skilled rider can coax incredible performance from them, while harsh handling leads to bolting or refusal.',
        source: 'SWRPG page 230',
    },
    {
        id: 'eopie',
        name: 'Eopie',
        type: 'Desert pack animal',
        scale: 'Speeder',
        size: '1.5m at the shoulder',
        strength: '3D',
        dexterity: '2D',
        stamina: '4D',
        perception: '3D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: null,
        attacks: [{ name: 'Spit', damage: 'None (irritant)', type: 'B' }],
        movement: 'Walking, Trotting',
        merits: [
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot, arid environments.',
            },
            {
                name: 'Pack Animal',
                description: 'Can carry moderate loads over long distances without penalty.',
            },
            {
                name: 'Efficient Digestion',
                description: 'Can survive on minimal food and water for weeks.',
            },
        ],
        flaws: [],
        description:
            "A sure-footed, twin-trunked pack animal native to Tatooine's desert wastes. Eopies are smaller and more agile than banthas, making them ideal for navigating rocky canyons and tight passes. They are gentle, patient creatures that form strong bonds with their owners. Despite their mild temperament, eopies have a surprisingly accurate spit attack that irritates the eyes and mucous membranes of potential predators.",
        source: 'SWRPG page 230',
    },
    {
        id: 'massiff',
        name: 'Massiff',
        type: 'Guard reptile',
        scale: 'Character',
        size: '1m at the shoulder',
        strength: '3D',
        dexterity: '3D',
        stamina: '4D',
        perception: '4D',
        intelligence: '1D',
        wits: '4D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Intimidation', dice: '4D' },
            { name: 'Stealth', dice: '3D' },
        ],
        armor: 'Armored scales +2D',
        attacks: [{ name: 'Bite', damage: 'STR+2D', type: 'L' }],
        movement: 'Walking, Sprinting',
        merits: [
            { name: 'Thick Skinned +2', description: '+2 dice to Stamina soak.' },
            { name: 'Loyal Guardian', description: 'Fights without fear to protect its handler.' },
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot environments.',
            },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Follows simple commands only; cannot reason.',
            },
        ],
        description:
            'A heavily armored reptilian guard beast native to Tatooine and used by the Trade Federation and Imperial forces. Massiffs have powerful jaws lined with serrated teeth and thick armored scales that deflect blaster bolts. They are trained from hatching to be loyal guardians, attacking intruders without hesitation and pursuing prey with relentless determination. Their low, guttural growl is a warning few ignore.',
        source: 'SWRPG page 231',
    },
    {
        id: 'gundark',
        name: 'Gundark',
        type: 'Aggressive primate predator',
        scale: 'Character',
        size: '2m tall',
        strength: '5D',
        dexterity: '3D',
        stamina: '5D',
        perception: '3D',
        intelligence: '2D',
        wits: '3D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '5D' },
            { name: 'Intimidation', dice: '5D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Tough hide +1D',
        attacks: [
            { name: 'Punch', damage: 'STR+2D', type: 'B' },
            { name: 'Bite', damage: 'STR+1D', type: 'L' },
            { name: 'Throw (object)', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Climbing, Walking, Charging',
        merits: [
            { name: 'Powerful +3', description: '+3 dice to Strength-related rolls.' },
            {
                name: 'Extra Arm (4 arms)',
                description: 'Two additional arms for grappling and multi-attacks.',
            },
            { name: 'Berserker', description: 'Ignores wound penalties when enraged.' },
        ],
        flaws: [
            {
                name: 'Feral Rage',
                description: 'May attack nearest target indiscriminately when wounded.',
            },
        ],
        description:
            'A massive, four-armed primate known across the galaxy as one of the most dangerous non-sentient predators. The Gundark is notorious for its strength — a single adult can tear a man limb from limb. Native to the planet Vanquor, gundarks are fiercely territorial and will attack anything that enters their domain. Their four arms allow them to grapple multiple opponents or deliver devastating flurries of blows.',
        source: 'SWRPG page 231',
    },
    {
        id: 'hssiss',
        name: 'Hssiss',
        type: 'Dark side corrupted reptile',
        scale: 'Character',
        size: '2–3m long',
        strength: '4D',
        dexterity: '4D',
        stamina: '4D',
        perception: '4D',
        intelligence: '2D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Intimidation', dice: '3D' },
        ],
        armor: 'Dark-scaled hide +1D',
        attacks: [
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
            { name: 'Tail lash', damage: 'STR+1D', type: 'B' },
            { name: 'Claw', damage: 'STR+1D', type: 'L' },
        ],
        movement: 'Slithering, Climbing',
        merits: [
            {
                name: 'Camouflage (darkness)',
                description: 'Nearly invisible in shadows and dark areas.',
            },
            {
                name: 'Dark Side Resilience',
                description: 'Resistant to Force-based mental attacks.',
            },
            { name: 'Ambush Predator', description: 'Gains bonus dice on surprise attacks.' },
        ],
        flaws: [{ name: 'Light Sensitivity', description: 'Suffers penalties in bright light.' }],
        description:
            'A serpentine reptile corrupted by the dark side of the Force, found in Sith temples and dark side caves. Hssiss are native to the Sith world of Korriban, where millennia of exposure to dark side energy has twisted them into aggressive, near-impossible-to-detect ambush predators. Their scales are jet black, allowing them to blend into shadows perfectly. They are drawn to Force users and attack with unnatural precision.',
        source: 'SWRPG page 231',
    },
    {
        id: 'vornskr',
        name: 'Vornskr',
        type: 'Force-sensitive predator',
        scale: 'Character',
        size: '1.5m long',
        strength: '4D',
        dexterity: '4D',
        stamina: '4D',
        perception: '5D',
        intelligence: '2D',
        wits: '4D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Alertness', dice: '5D' },
            { name: 'Stealth', dice: '4D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: null,
        attacks: [
            { name: 'Venomous tail whip', damage: 'STR+1D + poison', type: 'L' },
            { name: 'Claw', damage: 'STR+2D', type: 'L' },
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
        ],
        movement: 'Pouncing, Climbing, Tracking',
        merits: [
            {
                name: 'Force Sensitivity',
                description: 'Can track Force users across interstellar distances.',
            },
            {
                name: 'Venomous',
                description:
                    'Tail stinger delivers a paralytic venom (Stamina diff 8 or paralyzed).',
            },
            {
                name: 'Acute Senses',
                description: 'Exceptional tracking ability; can follow any scent.',
            },
        ],
        flaws: [
            {
                name: 'Force Obsession',
                description: 'Prioritizes attacking Force users over other targets.',
            },
        ],
        description:
            "A canine-like predator native to the planet Mykr, the Vornskr is notable for its sensitivity to the Force. These creatures can sense and track Force-sensitive beings across vast distances, making them feared by Jedi and Sith alike. Their tails end in a venomous stinger that can paralyze prey, and their pack-hunting tactics make them even more dangerous in numbers. The Vornskr's howl is said to chill the blood of even seasoned hunters.",
        source: 'SWRPG page 232',
    },
    {
        id: 'terentatek',
        name: 'Terentatek',
        type: 'Sith temple guardian',
        scale: 'Walker',
        size: '4–6m tall',
        strength: '5D',
        dexterity: '2D',
        stamina: '5D',
        perception: '3D',
        intelligence: '1D',
        wits: '4D',
        willpower: '7D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '5D' },
            { name: 'Intimidation', dice: '5D' },
            { name: 'Stealth', dice: '2D' },
        ],
        armor: 'Dark-side hardened carapace +4D',
        attacks: [
            { name: 'Gore (tusk)', damage: 'STR+3D', type: 'L' },
            { name: 'Claw', damage: 'STR+2D', type: 'L' },
            { name: 'Stomp', damage: 'STR+3D', type: 'B' },
        ],
        movement: 'Walking, Charging',
        merits: [
            { name: 'Powerful +4', description: '+4 dice to Strength-related rolls.' },
            { name: 'Thick Skinned +4', description: '+4 dice to Stamina soak.' },
            {
                name: 'Dark Side Aura',
                description: 'Radiation of dark side energy; Force users nearby suffer penalties.',
            },
            {
                name: 'Spell Resistance',
                description: 'Highly resistant to Force powers and supernatural effects.',
            },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Cannot reason — driven by dark side corruption and instinct.',
            },
            { name: 'Rare', description: 'Only found in ancient Sith temples and tombs.' },
        ],
        description:
            'A hulking, corrupted beast created by the ancient Sith to guard their tombs and temples. The Terentatek is a nightmarish fusion of reptilian and mammalian features, with thick tusks, armored plates, and eyes that burn with dark side energy. It is one of the few creatures that can actively resist the Force, making it a terrifying opponent for Jedi. Terentateks were hunted to near extinction during the Old Republic era.',
        source: 'SWRPG page 232',
    },
    {
        id: 'tukata',
        name: "Tuk'ata",
        type: 'Sith hound',
        scale: 'Character',
        size: '1.2m at the shoulder',
        strength: '4D',
        dexterity: '4D',
        stamina: '4D',
        perception: '5D',
        intelligence: '2D',
        wits: '4D',
        willpower: '6D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Alertness', dice: '5D' },
            { name: 'Stealth', dice: '4D' },
            { name: 'Intimidation', dice: '4D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Rune-scarred hide +1D',
        attacks: [
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
            { name: 'Claw', damage: 'STR+1D', type: 'L' },
        ],
        movement: 'Pouncing, Tracking, Sprinting',
        merits: [
            {
                name: 'Pack Hunter',
                description: "Gains bonuses when fighting alongside other Tuk'ata.",
            },
            {
                name: 'Dark Side Resilience',
                description: 'Resistant to Force-based mental attacks.',
            },
            { name: 'Tracker', description: 'Can track a specific target across great distances.' },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Loyal to its Sith master but cannot reason independently.',
            },
        ],
        description:
            "A fearsome, scarred hound bred by the ancient Sith to guard their tombs and hunt escaped slaves. Tuk'ata are muscular quadrupeds with sharp teeth, tattered ears, and hides marked by ritual scarring. They hunt in packs, coordinating their attacks with unnerving precision. Their loyalty to their Sith masters is absolute — a Tuk'ata will pursue its prey across a planet, tireless and relentless.",
        source: 'SWRPG page 233',
    },
    {
        id: 'blurrg',
        name: 'Blurrg',
        type: 'Swamp mount',
        scale: 'Speeder',
        size: '1.5m at the shoulder',
        strength: '3D',
        dexterity: '3D',
        stamina: '4D',
        perception: '3D',
        intelligence: '2D',
        wits: '2D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '3D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Leathery hide +1D',
        attacks: [
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
            { name: 'Headbutt', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Walking, Galloping',
        merits: [
            {
                name: 'Environment Adaptation (swamp)',
                description: 'Ignores penalties from swamp and muddy terrain.',
            },
            {
                name: 'Sure-footed',
                description: 'Navigates difficult terrain without movement penalties.',
            },
        ],
        flaws: [
            {
                name: 'Strong-willed',
                description: 'Requires skilled handling; resists inexperienced riders.',
            },
        ],
        description:
            'A sturdy, four-legged reptile commonly used as a mount on swamp and jungle worlds. Blurrgs are stubborn but loyal creatures with powerful jaws and a thick hide that protects them from predators. Their flat feet distribute weight across soft ground, allowing them to traverse bogs and marshes that would bog down other mounts. The Lasat species particularly favors blurrgs as riding animals.',
        source: 'SWRPG page 233',
    },
    {
        id: 'varactyl',
        name: 'Varactyl',
        type: 'Lizard-like mount',
        scale: 'Speeder',
        size: '2m at the shoulder',
        strength: '4D',
        dexterity: '4D',
        stamina: '4D',
        perception: '4D',
        intelligence: '2D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '5D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Scale plates +2D',
        attacks: [
            { name: 'Bite', damage: 'STR+1D', type: 'L' },
            { name: 'Claw', damage: 'STR+1D', type: 'L' },
        ],
        movement: 'Walking, Sprinting, Climbing',
        merits: [
            { name: 'Fast', description: 'Exceptional speed; can outrun most predators.' },
            {
                name: 'Sure-footed',
                description: 'Navigates difficult terrain including cliff faces without penalty.',
            },
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot environments.',
            },
        ],
        flaws: [],
        description:
            "A brilliantly plumed, lizard-like reptile with a long neck, powerful legs, and vibrant feathers. Varactyls are native to the planet Utapau, where they are used as mounts by the native Utai and Pau'an populations. Their multi-jointed legs allow them to scale the sheer sinkhole walls of Utapau with ease. Varactyls are loyal, brave creatures that form strong bonds with their handlers and fight fiercely to protect them.",
        source: 'SWRPG page 233',
    },
    {
        id: 'bogwing',
        name: 'Bogwing',
        type: 'Swamp aerial predator',
        scale: 'Character',
        size: '2–3m wingspan',
        strength: '3D',
        dexterity: '4D',
        stamina: '3D',
        perception: '4D',
        intelligence: '1D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '4D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: null,
        attacks: [
            { name: 'Claw rake', damage: 'STR+1D', type: 'L' },
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
        ],
        movement: 'Flying, Gliding',
        merits: [
            {
                name: 'Environment Adaptation (swamp)',
                description: 'Ignores penalties from swamp environments.',
            },
            {
                name: 'Silent Flight',
                description: 'Flies without making sound; gains bonus to Stealth.',
            },
        ],
        flaws: [{ name: 'Skittish', description: 'Easily scared off by fire or loud noises.' }],
        description:
            'A large, leathery-winged predator that dwells in the swamps and jungles of the galaxy. The Bogwing is an ambush hunter that drops silently from the canopy onto unsuspecting prey. Its wings are specially adapted for silent flight, and its eyes can see in near-total darkness. Bogwings are known to circle above battles, waiting for easy pickings among the wounded.',
        source: 'SWRPG page 234',
    },
    {
        id: 'spinewolf',
        name: 'Spinewolf',
        type: 'Pack predator',
        scale: 'Character',
        size: '1m at the shoulder',
        strength: '3D',
        dexterity: '4D',
        stamina: '3D',
        perception: '4D',
        intelligence: '2D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '4D' },
            { name: 'Survival', dice: '4D' },
            { name: 'Intimidation', dice: '3D' },
        ],
        armor: null,
        attacks: [
            { name: 'Bite', damage: 'STR+2D', type: 'L' },
            { name: 'Claw', damage: 'STR+1D', type: 'L' },
        ],
        movement: 'Pouncing, Sprinting, Tracking',
        merits: [
            {
                name: 'Pack Hunter',
                description: 'Gains bonuses when fighting alongside other spinewolves.',
            },
            { name: 'Acute Hearing', description: 'Can hear prey from great distances.' },
        ],
        flaws: [
            {
                name: 'Cowardly without Pack',
                description: 'Flees from combat if separated from its pack.',
            },
        ],
        description:
            'A gaunt, vicious pack predator recognizable by the ridge of bony spines running down its back. Found on multiple worlds, spinewolves hunt in coordinated packs, using howls to communicate and flank their prey. Their bite delivers a serrated tearing wound that causes severe bleeding. Spinewolves are persistent trackers — once a pack locks onto a target, it will pursue for days.',
        source: 'SWRPG page 234',
    },
    {
        id: 'womp-rat',
        name: 'Womp Rat',
        type: 'Desert vermin',
        scale: 'Vermin',
        size: '0.5m long',
        strength: '1D',
        dexterity: '4D',
        stamina: '2D',
        perception: '4D',
        intelligence: '1D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '1D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: null,
        attacks: [{ name: 'Bite', damage: 'STR+0D', type: 'L' }],
        movement: 'Scurrying, Burrowing',
        merits: [
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot environments.',
            },
            {
                name: 'Prolific Breeder',
                description: 'Reproduces rapidly; infestations are hard to control.',
            },
        ],
        flaws: [
            { name: 'Fragile', description: 'Easily killed; suffers double wound penalties.' },
            { name: 'Cowardly', description: 'Flees from anything larger than itself.' },
        ],
        description:
            'A large, aggressive rodent native to Tatooine and other arid worlds. Womp rats are ubiquitous pests that burrow into moisture farms, chew through power cables, and raid food stores. While a single womp rat is little threat to an armed humanoid, swarms can overwhelm even seasoned warriors. Young Anakin Skywalker famously boasted about podracing through the dangerous womp rat territories of the Dune Sea.',
        source: 'SWRPG page 234',
    },
    {
        id: 'rathtar',
        name: 'Rathtar',
        type: 'Spiny omnivorous predator',
        scale: 'Walker',
        size: '3–4m diameter',
        strength: '5D',
        dexterity: '3D',
        stamina: '5D',
        perception: '3D',
        intelligence: '1D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '4D' },
            { name: 'Alertness', dice: '3D' },
            { name: 'Intimidation', dice: '4D' },
            { name: 'Stealth', dice: '3D' },
        ],
        armor: 'Spiny hide +2D',
        attacks: [
            { name: 'Tentacle grab', damage: 'STR+2D', type: 'B' },
            { name: 'Bite (swallow)', damage: 'STR+4D', type: 'L' },
        ],
        movement: 'Rolling, Slithering',
        merits: [
            { name: 'Thick Skinned +2', description: '+2 dice to Stamina soak.' },
            {
                name: 'Extra Appendage (tentacles)',
                description: 'Multiple feeding tentacles for grappling.',
            },
            { name: 'Berserker', description: 'Ignores wound penalties when enraged.' },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Driven entirely by hunger; no reasoning capacity.',
            },
            {
                name: 'Gluttonous',
                description: 'Distracted by available food; may abandon a fight to eat.',
            },
        ],
        description:
            'A massive, spiny omnivore with a circular body covered in thick quills and surrounded by grasping tentacles around a central maw. Rathtars are notorious for their aggression and ability to consume prey nearly their own size. Native to unknown space, they are sometimes transported by smugglers and criminals as living weapons or cargo — a practice that inevitably ends in disaster when the rathtar gets loose.',
        source: 'SWRPG page 235',
    },
    {
        id: 'loth-cat',
        name: 'Loth-cat',
        type: 'Small feline predator',
        scale: 'Vermin',
        size: '0.5m long',
        strength: '1D',
        dexterity: '5D',
        stamina: '2D',
        perception: '4D',
        intelligence: '2D',
        wits: '5D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '5D' },
            { name: 'Brawl', dice: '2D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: null,
        attacks: [
            { name: 'Claw', damage: 'STR+0D', type: 'L' },
            { name: 'Bite', damage: 'STR+0D', type: 'L' },
        ],
        movement: 'Pouncing, Climbing',
        merits: [
            { name: 'Cat-like Reflexes +2', description: '+2 dice to Dexterity-related rolls.' },
            {
                name: 'Camouflage (urban)',
                description: 'Gains bonus to Stealth in urban environments.',
            },
        ],
        flaws: [
            { name: 'Fragile', description: 'Easily killed; suffers double wound penalties.' },
            {
                name: 'Mischevious',
                description: 'Attracted to shiny objects; may steal small items.',
            },
        ],
        description:
            "A small, bat-eared feline with striped fur and large, expressive eyes. Native to the planet Lothal, the Loth-cat is a common sight in urban environments, where it hunts rodents and scavenges from markets. Despite its cute appearance, the Loth-cat is a fierce predator relative to its size, capable of taking prey larger than itself through ambush tactics. Its distinctive chirping call echoes through Lothal's city streets at night.",
        source: 'SWRPG page 235',
    },
    {
        id: 'sleen',
        name: 'Sleen',
        type: 'Swamp reptile predator',
        scale: 'Character',
        size: '2–3m long',
        strength: '4D',
        dexterity: '3D',
        stamina: '4D',
        perception: '3D',
        intelligence: '1D',
        wits: '3D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '3D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '3D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '3D' },
        ],
        armor: 'Scaly hide +1D',
        attacks: [
            { name: 'Bite (death roll)', damage: 'STR+3D', type: 'L' },
            { name: 'Tail whip', damage: 'STR+1D', type: 'B' },
        ],
        movement: 'Swimming, Slithering',
        merits: [
            {
                name: 'Environment Adaptation (aquatic)',
                description: 'Breathes and moves freely underwater.',
            },
            {
                name: 'Ambush Predator',
                description: 'Gains bonus dice on surprise attacks from hiding.',
            },
            {
                name: 'Camouflage (swamp)',
                description: 'Blends into murky water and swamp vegetation.',
            },
        ],
        flaws: [
            {
                name: 'Cold-blooded',
                description: 'Sluggish in cold environments; suffers movement penalties.',
            },
        ],
        description:
            'A large, carnivorous reptile native to the swamps of Dagobah and similar wetland worlds. The Sleen is a patient ambush predator, lying submerged for hours with only its eyes above the water, waiting for prey to wander within striking range. Its bite is devastating — once locked on, the sleen performs a death roll, twisting to tear flesh and cause massive bleeding wounds.',
        source: 'SWRPG page 235',
    },
    {
        id: 'gutkurr',
        name: 'Gutkurr',
        type: 'Desert burrowing predator',
        scale: 'Character',
        size: '1.5m long',
        strength: '3D',
        dexterity: '3D',
        stamina: '4D',
        perception: '4D',
        intelligence: '1D',
        wits: '4D',
        willpower: '5D',
        abilities: [
            { name: 'Athletics', dice: '4D' },
            { name: 'Brawl', dice: '3D' },
            { name: 'Alertness', dice: '4D' },
            { name: 'Stealth', dice: '5D' },
            { name: 'Survival', dice: '4D' },
        ],
        armor: 'Armored scales +2D',
        attacks: [{ name: 'Bite', damage: 'STR+2D', type: 'L' }],
        movement: 'Burrowing, Skittering',
        merits: [
            {
                name: 'Environment Adaptation (heat)',
                description: 'Ignores penalties from hot, arid environments.',
            },
            {
                name: 'Burrower',
                description: 'Can burrow through sand and loose soil at full speed.',
            },
            {
                name: 'Ambush Predator',
                description: 'Gains bonus dice on surprise attacks from underground.',
            },
        ],
        flaws: [
            {
                name: 'Bestial Intelligence',
                description: 'Driven entirely by instinct and hunger.',
            },
            { name: 'Light Sensitivity', description: 'Disoriented by bright light above ground.' },
        ],
        description:
            'A multi-legged desert predator with a heavily armored carapace and powerful mandibles. The Gutkurr burrows beneath the sand, sensing vibrations from surface prey before erupting from below in a devastating ambush. Native to the desert world of Jedha, these creatures are a constant hazard for anyone traveling outside the Holy City. Their armor is thick enough to deflect blaster bolts, making them dangerous opponents even for well-armed groups.',
        source: 'SWRPG page 236',
    },
];
