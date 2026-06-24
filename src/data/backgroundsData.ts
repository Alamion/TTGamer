export interface BackgroundEntry {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    category: string;
    scale: string[];
}

export const BACKGROUNDS: BackgroundEntry[] = [
    {
        id: 'allies',
        name: 'Allies',
        shortDescription: 'People who will help you without immediate payment',
        description:
            'You have friends in the galaxy — people who will lend a hand without asking for immediate payment. These are not followers or retainers; they are independent individuals with their own lives and motivations who genuinely want to help you. Allies might include a former smuggler partner, a sympathetic doctor, a grizzled veteran, or a information broker who owes you a favor. Unlike Retainers, Allies cannot be ordered around — they must be asked, and they expect reciprocity over time.',
        category: 'Social Influence',
        scale: [
            'One ally of modest ability — a local contact with limited reach.',
            'Two or three allies, or one ally with moderate influence in a specific field.',
            'Several allies spread across a region, or one very influential ally (a sector-level figure).',
            'A network of allies across multiple systems, including one powerful patron.',
            'Allies at the highest levels — a Moff who owes you, a Rebel cell leader who trusts you implicitly, or a Hutt who considers you a friend.',
        ],
    },
    {
        id: 'contacts',
        name: 'Contacts',
        shortDescription: 'Informants who feed you information',
        description:
            'Contacts are individuals who provide you with information. Unlike Allies, they do not perform tasks or risk themselves for you — they pass along rumors, gossip, and data they come across in their daily lives. A contact might be a cantina bartender who overhears everything, a dock worker who notices unusual cargo, or an Imperial clerk with access to shipping manifests. Contacts expect to be paid or favored in return for useful information.',
        category: 'Social Influence',
        scale: [
            'One contact who moves in a specific social circle or profession.',
            'A few contacts in related fields, giving you decent coverage in one area.',
            'Contacts scattered across a city or spaceport, in various walks of life.',
            'A broad network across a planet or sector — someone always knows something.',
            'Contacts reaching into the highest levels of society and the lowest depths of the underworld.',
        ],
    },
    {
        id: 'customization',
        name: 'Customization',
        shortDescription: 'A piece of equipment improved beyond stock specifications',
        description:
            "You begin play with equipment that has been improved beyond its stock attributes. Use the dot-rank guidelines below to determine how much a piece of gear can be improved. You can split Customization between multiple items: one point to a blaster, two to a vehicle, one to armor. One-for-one attribute trade-offs — such as a weapon with 20% increased Range but 1D decreased Damage, or a vehicle with 1D increased Durability but 1D decreased Maneuverability — should be allowed for free with the Storyteller's permission.",
        category: 'Equipment',
        scale: [
            'Cosmetic or convenience improvements. Paint or body work to look sleek or fierce. Adding a comlink into a cybernetic arm.',
            'Easy improvements. Increasing an attribute by 1D or 20%. Adding a hidden vibro-knife in a cybernetic arm.',
            'Average improvements. Increasing an attribute by 2D or 40%. Adding a hidden hold-out blaster in a cybernetic arm.',
            'Difficult improvements. Increasing an attribute by 3D or 60%. Adding a heavy blaster pistol to a cybernetic arm.',
            'Extraordinary improvements. Increasing an attribute by 4D or 80%. Adding a light repeating blaster to a cybernetic arm.',
        ],
    },
    {
        id: 'droid',
        name: 'Droid',
        shortDescription: 'You own a non-player character droid',
        description:
            'You begin play owning an NPC droid. Work with the Storyteller to develop a suitable character. The droid has its own personality, skills, and quirks — it is not a mere tool but an independent (if owned) being. Droids acquired through this background follow the standard NPC droid creation rules for their degree. The degree determines overall capability: a Fifth-Degree droid is a simple labor unit, while a First-Degree droid is a sophisticated medical or scientific platform.',
        category: 'Equipment',
        scale: [
            'Fifth-Degree droid — simple labor, cleaning, or utility (e.g., MSE-6 mouse droid).',
            'Fourth-Degree droid — security or battle droid (e.g., B1 battle droid, IG-86 sentinel).',
            'Third-Degree droid — protocol or service droid (e.g., C-3PO, TC-4).',
            'Second-Degree droid — astromech or technical droid (e.g., R2-D2, BB-8).',
            'First-Degree droid — medical or scientific droid (e.g., 2-1B surgical droid).',
        ],
    },
    {
        id: 'influence',
        name: 'Influence',
        shortDescription: 'Pull with organizations — government, guild, or underworld',
        description:
            'You have pull with some organization in the galaxy. This could be the Empire, the Rebellion, a planetary government, a trade guild, or a criminal syndicate. Influence represents your ability to call in markers, expedite paperwork, get access to restricted areas, or apply pressure through official (or unofficial) channels. This is not about commanding individuals but about getting the system to work for you.',
        category: 'Social Influence',
        scale: [
            'Minor influence — you know a few mid-level functionaries in the organization.',
            'Moderate influence — you can get meetings, skip queues, and access semi-restricted areas.',
            'Substantial influence — your name carries weight. You can call in serious favors.',
            'Major influence — you have direct access to high-level officials and can shape policy at a local level.',
            'Enormous influence — you can move entire organizations. Your pull reaches the highest chambers.',
        ],
    },
    {
        id: 'mentor',
        name: 'Mentor',
        shortDescription: 'An experienced teacher who advises you',
        description:
            'You have a mentor — an older, wiser, or more experienced individual who takes an interest in your development. A mentor provides advice, training, and sometimes material support. Unlike an Ally, a mentor expects you to follow their guidance and may have their own agenda. A mentor might be a retired Rebellion general teaching you strategy, an old Jedi survivor guiding your Force training, or a seasoned smuggler showing you the tricks of the trade.',
        category: 'Social Influence',
        scale: [
            'A mentor who is available remotely — holocalls and occasional meetings.',
            'A mentor who checks in regularly and can provide advice in person a few times per story.',
            'A mentor who is usually around and actively invested in your development.',
            'A mentor of significant reputation or power who devotes considerable time to your training.',
            'A legendary figure — a Jedi Master, a sector-level military commander, a crime lord of vast reach — who personally guides you.',
        ],
    },
    {
        id: 'military-rank',
        name: 'Military Rank',
        shortDescription: 'Formal rank in a military organization',
        description:
            'You hold a formal rank within a military organization — typically the Rebellion, the Imperial military, a planetary defense force, or a corporate security division. Rank grants authority over subordinates, access to military facilities and resources, and a clear chain of command. Both Army and Navy ranks are listed, though other branches may exist. Characters may be promoted during play.',
        category: 'Status',
        scale: [
            'Sergeant (Army) / Chief (Navy) — non-commissioned officer, leads a small squad or section.',
            'Lieutenant (Army) / Ensign (Navy) — junior officer, commands a platoon or serves as a department head.',
            'Major (Army) / Commander (Navy) — mid-grade officer, commands a battalion or a small vessel.',
            'Colonel (Army) / Captain (Navy) — senior officer, commands a regiment or a capital ship.',
            'General (Army) / Admiral (Navy) — flag officer, commands a sector force or fleet.',
        ],
    },
    {
        id: 'noble-status',
        name: 'Noble Status',
        shortDescription: 'Title and social standing from noble birth',
        description:
            'Your homeworld maintains a system of inherited privilege where certain families are considered elite. Your noble birth gives you a certain amount of respect and consideration. Having a noble title does not necessarily mean you are well known or have any influence or money — just that you were born into a good family. The Storyteller can tell you if such a hierarchy exists on your homeworld and what the appropriate titles are.',
        category: 'Status',
        scale: [
            'Baron, clan leader, or land owner — a minor title with local recognition.',
            'Count or leader of several houses or clans — known across your home region.',
            "Duke with direct control over large portions of your planet's population and territory.",
            'Prince, Princess, or potential heir to the highest station on your planet.',
            'King, Queen, or Monarch — the ruling sovereign of your planet.',
        ],
    },
    {
        id: 'reputation',
        name: 'Reputation',
        shortDescription: 'You are known across the galaxy for something',
        description:
            'You have a reputation — good, bad, or both — that precedes you. This replaces V:TM\'s Fame background. When you take Reputation, declare what you are known for (e.g., "ace pilot," "deadly shot," "trustworthy negotiator," "ruthless bounty hunter"). The reputation is a double-edged sword — being well known among the Rebellion means you are probably well known among the Empire as well. Your reputation opens some doors and closes others.',
        category: 'Status',
        scale: [
            'Known to a select subculture — smugglers, pilots, or a specific guild.',
            'Known locally or within a single guild house or organization.',
            'Known planet-wide or throughout an entire guild.',
            'Known across an entire star system.',
            'Known galaxy-wide — your name and face are recognized everywhere.',
        ],
    },
    {
        id: 'resources',
        name: 'Resources',
        shortDescription: 'Disposable income and material wealth',
        description:
            'Resources represents your disposable income and material wealth — the credits in your pocket, the assets you can liquidate, and the standard of living you maintain. This is not about a single score of credits but your ongoing financial situation. Resources equal to zero means you live hand-to-mouth. At high levels, you can buy starships, fund operations, and never worry about the cost of a drink or a meal.',
        category: 'Wealth',
        scale: [
            'Poor — 500 credits per month. You live cheaply and cannot afford major purchases.',
            'Adequate — 2,000 credits per month. A modest lifestyle with some savings for emergencies.',
            'Comfortable — 10,000 credits per month. A good starship, decent gear, and no money worries day-to-day.',
            'Wealthy — 50,000 credits per month. You can fund operations, buy expensive equipment, and live well.',
            'Rich — 250,000+ credits per month. You have serious assets — estates, ships, and enough money to matter in sector politics.',
        ],
    },
    {
        id: 'retainers',
        name: 'Retainers',
        shortDescription: 'Loyal followers who carry out your orders',
        description:
            'Retainers are loyal followers who work for you. Unlike Allies, Retainers are dependents — they follow your orders, handle tasks you assign, and generally make themselves useful. They might be former soldiers, hired hands, rescued slaves who swore loyalty, or old crew members who stayed on. Retainers are not super-competent — they are normal people with normal skills. They expect to be paid, housed, and fed.',
        category: 'Social Influence',
        scale: [
            'One retainer — perhaps a loyal deckhand or a personal assistant.',
            'A pair of retainers, or one with unusually useful skills.',
            'A small team of three to five retainers — enough to maintain a ship or run a small operation.',
            'A squad of retainers (six to ten) — you could run a modest compound or a busy starport office.',
            'A platoon of retainers (twelve to twenty) — you have real manpower at your disposal.',
        ],
    },
    {
        id: 'vehicle',
        name: 'Vehicle',
        shortDescription: 'A personal vehicle reserved for your use',
        description:
            'You begin play owning a vehicle, or at least have one reserved for your use. Discuss with the Storyteller to determine the exact nature, make, and attributes of the vehicle. The vehicle is yours to maintain, modify, and lose — and if lost, recovering or replacing it becomes a story hook. The scale of the vehicle determines what it can do and where it can go.',
        category: 'Wealth',
        scale: [
            'Unarmed Speeder-scale vehicle — a swoop bike, landspeeder, or airspeeder.',
            'Armed Speeder-scale vehicle or Walker-scale vehicle — a speeder with a mounted weapon, or an AT-ST.',
            'Starfighter-scale vehicle — a starfighter, shuttle, or light freighter (e.g., YT-1300, A-Wing).',
            'Transport-scale vehicle — a bulk freighter, corvette, or frigate-sized craft.',
            'Capital-scale vehicle — a cruiser, destroyer, or larger starship.',
        ],
    },
];
