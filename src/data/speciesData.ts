export interface SpeciesEntry {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    category: string;
    eras: string[];
    merits: string[];
    flaws: string[];
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

export const SPECIES: SpeciesEntry[] = [
    {
        id: 'ewok',
        name: 'Ewok',
        shortDescription: 'Small, furry bipeds native to the forest moon of Endor',
        description:
            'Ewoks are small, sentient bipeds covered in thick fur, standing about one meter tall. Native to the forest moon of Endor, they are a tribal species with a deep connection to their environment. Despite their primitive technology, Ewoks are ingenious, courageous, and fiercely protective of their home. Their small stature makes it difficult to keep up in a chase, but their keen noses and pitiable appearance serve them well in social situations.',
        category: 'Biped (small)',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-olfactory', 'pitiable'],
        flaws: ['ap-short'],
    },
    {
        id: 'gamorrean-slavery',
        name: 'Gamorrean',
        shortDescription: 'Hulking, porcine humanoids known for brute strength',
        description:
            'Gamorreans are hulking, porcine humanoids with thick greenish skin, small tusks, and a culturally ingrained love of combat. Across the galaxy they are stereotyped as brutish thugs — a reputation their aggressive culture does little to dispel. In eras where the Empire or similar regimes hold power, Gamorreans are widely enslaved or discriminated against.',
        category: 'Biped (large)',
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: ['ap-thick-skinned'],
        flaws: ['ap-limited-vocal-range', 'stereotyped', 'slave-race'],
    },
    {
        id: 'gamorrean-free',
        name: 'Gamorrean',
        shortDescription: 'Hulking, porcine humanoids known for brute strength',
        description:
            'Gamorreans are hulking, porcine humanoids with thick greenish skin, small tusks, and a culturally ingrained love of combat. In the post-Imperial era, many Gamorreans have begun to integrate into galactic society, though they still contend with lingering stereotypes.',
        category: 'Biped (large)',
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: ['ap-thick-skinned'],
        flaws: ['ap-limited-vocal-range', 'stereotyped'],
    },
    {
        id: 'ithorian',
        name: 'Ithorian',
        shortDescription: 'Gentle, long-necked herbivores with a reverence for nature',
        description:
            'Ithorians are tall, gentle herbivores with two long necks and wide mouths, native to the jungle world of Ithor. They are a deeply spiritual species with a profound reverence for nature, often serving as ecologists and environmental stewards across the galaxy. Their towering height gives them a natural advantage in pursuit, but their ecological philosophy is often dismissed by the wider galaxy.',
        category: 'Biped (large)',
        eras: ALL_ERAS,
        merits: ['ap-tall'],
        flaws: ['stereotyped'],
    },
    {
        id: 'mon-calamari-slavery',
        name: 'Mon Calamari',
        shortDescription: 'Amphibious, fish-headed humanoids gifted in shipbuilding',
        description:
            'Mon Calamari are amphibious humanoids with salmon-colored skin, large expressive eyes, and high-domed heads. They are renowned across the galaxy as master shipwrights and engineers. During the Imperial era, Mon Calamari were enslaved and their oceans exploited. Those who escaped joined the Rebellion, providing its backbone of capital ships.',
        category: 'Amphibious',
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: ['ap-amphibious'],
        flaws: ['ap-environmental-sensitivity', 'slave-race'],
    },
    {
        id: 'mon-calamari-free',
        name: 'Mon Calamari',
        shortDescription: 'Amphibious, fish-headed humanoids gifted in shipbuilding',
        description:
            'Mon Calamari are amphibious humanoids with salmon-colored skin, large expressive eyes, and high-domed heads. In the post-Imperial era, Mon Calamari have reclaimed their place in the galaxy as visionary engineers and statespeople, though their physiological sensitivity to arid environments remains.',
        category: 'Amphibious',
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: ['ap-amphibious'],
        flaws: ['ap-environmental-sensitivity'],
    },
    {
        id: 'rodian',
        name: 'Rodian',
        shortDescription: 'Reptilian humanoids with a reputation for bounty hunting',
        description:
            'Rodians are reptilian humanoids with tapered snouts, multifaceted eyes, and a rigid facial crest. Hailing from the damp, jungle planet of Rodia, they are known across the galaxy as skilled bounty hunters and trackers. Their nimble fingers give them an edge in delicate work, but their reputation for untrustworthiness precedes them.',
        category: 'Reptilian',
        eras: ALL_ERAS,
        merits: ['ap-light-touch'],
        flaws: ['stereotyped'],
    },
    {
        id: 'sullustan',
        name: 'Sullustan',
        shortDescription: 'Large-eyed humanoids with exceptional navigational abilities',
        description:
            'Sullustans are short, large-eyed humanoids native to the volcanic world of Sullust. Their keen senses — evolved in the dim light of their subterranean cities — make them exceptional pilots and navigators. They are known across the galaxy for their innate sense of direction and ability to navigate the most treacherous space lanes.',
        category: 'Biped (small)',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-vision', 'ap-enhanced-hearing', 'direction-sense'],
        flaws: [],
    },
    {
        id: 'twilek',
        name: "Twi'lek",
        shortDescription: 'Humanoids with distinctive head-tails called lekku',
        description:
            "Twi'leks are humanoids distinguished by their colorful skin and two prehensile head-tails called lekku, which communicate emotion and intent through subtle movements and pheromones. Hailing from the planet Ryloth, Twi'leks are found across the galaxy as diplomats, entertainers, traders, and spies.",
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-non-verbal-language'],
        flaws: [],
    },
    {
        id: 'wookiee-slavery',
        name: 'Wookiee',
        shortDescription: 'Towering, powerful fur-covered bipeds from Kashyyyk',
        description:
            'Wookiees are towering, powerful bipeds covered in thick fur, native to the forest world of Kashyyyk. They are renowned for their strength, loyalty, and fierce temper. During the Imperial era, Wookiees were enslaved in vast numbers, their homeworld exploited for timber and labor. Those who escaped often joined the Rebellion as fearsome warriors.',
        category: 'Biped (large)',
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: ['ap-natural-weapons', 'ap-tall', 'berserker', 'ap-powerful'],
        flaws: ['ap-limited-vocal-range', 'stereotyped', 'slave-race'],
    },
    {
        id: 'wookiee-free',
        name: 'Wookiee',
        shortDescription: 'Towering, powerful fur-covered bipeds from Kashyyyk',
        description:
            'Wookiees are towering, powerful bipeds covered in thick fur, native to the forest world of Kashyyyk. After the fall of the Empire, Kashyyyk was liberated and Wookiee society began to rebuild. In this era, Wookiees stand as free beings — still fierce and proud, but no longer burdened by the chains of slavery.',
        category: 'Biped (large)',
        eras: ['The New Republic', 'The Rise of the First Order'],
        merits: ['ap-natural-weapons', 'ap-tall', 'berserker', 'ap-powerful'],
        flaws: ['ap-limited-vocal-range', 'stereotyped'],
    },
    {
        id: 'human',
        name: 'Human',
        shortDescription: 'The most numerous and diverse species in the galaxy',
        description:
            'Humans are the dominant species in the Core Worlds and beyond, found in every corner of the galaxy. Their adaptability, ambition, and sheer numbers have made them a force in galactic politics, commerce, and culture. Humans have no biological advantages or disadvantages — their strength lies in their diversity and drive.',
        category: 'Biped',
        eras: ALL_ERAS,
        merits: [],
        flaws: [],
    },
    {
        id: 'zabrak',
        name: 'Zabrak',
        shortDescription: 'Horned humanoids known for their determination and endurance',
        description:
            'Zabraks are a proud, strong-willed species distinguished by facial tattoos and a crown of horns. Hailing from Iridonia, they are known throughout the galaxy for their fierce independence, physical endurance, and resistance to pain. Their intimidating appearance often precedes them, but their determination and fortitude are legendary.',
        category: 'Biped (horned)',
        eras: ALL_ERAS,
        merits: ['ap-hardy'],
        flaws: ['stereotyped'],
    },
    {
        id: 'duros',
        name: 'Duros',
        shortDescription:
            'Blue-skinned humanoids with large red eyes and natural piloting instincts',
        description:
            'Duros are a species of blue-skinned, red-eyed humanoids from the planet Duro. Their large, light-sensitive eyes and innate sense of spatial orientation make them among the finest pilots and navigators in the galaxy. Duros are a spacefaring species with a long tradition of exploration and starfaring commerce.',
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-vision', 'direction-sense'],
        flaws: [],
    },
    {
        id: 'bothan',
        name: 'Bothan',
        shortDescription: 'Furry humanoids famed for their espionage network and political acumen',
        description:
            'Bothans are a species of furry humanoids with distinctive whiskers and a talent for information gathering. Their famous spy network provided the Rebellion with critical intelligence, including the plans for the second Death Star. Bothans are shrewd, subtle, and deeply involved in galactic politics, though their secretive nature draws suspicion.',
        category: 'Biped (furry)',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-hearing'],
        flaws: ['stereotyped'],
    },
    {
        id: 'cerean',
        name: 'Cerean',
        shortDescription: 'Tall humanoids with elongated heads and a binary brain structure',
        description:
            'Cereans are a tall, dignified species from the planet Cerea, known for their elongated craniums and unique binary brain structure that allows them to process two independent streams of thought simultaneously. This mental duality makes them exceptional scholars, diplomats, and strategists, though their towering height can be imposing.',
        category: 'Biped (tall)',
        eras: ALL_ERAS,
        merits: ['ap-tall', 'ap-binary-mind'],
        flaws: [],
    },
    {
        id: 'nautolan',
        name: 'Nautolan',
        shortDescription: 'Amphibious humanoids with tentacled heads and aquatic origins',
        description:
            'Nautolans are amphibious humanoids from the aquatic world of Glee Anselm, distinguished by their colorful tentacled head-tresses. These tentacles are highly sensitive olfactory organs that can detect emotions and chemical traces. Nautolans are equally at home in water and on land, though dry environments quickly sap their vitality.',
        category: 'Amphibious',
        eras: ALL_ERAS,
        merits: ['ap-amphibious', 'ap-enhanced-olfactory'],
        flaws: ['ap-environmental-sensitivity'],
    },
    {
        id: 'togruta',
        name: 'Togruta',
        shortDescription: 'Humanoids with montrals and head-tails, known for heightened awareness',
        description:
            'Togruta are a graceful species native to Shili, distinguished by their large montrals and striped head-tails called lekku. Their montrals grant them a passive form of echolocation, allowing them to sense the presence and movement of others around them even when blind. Togruta are community-minded and often exhibit strong moral convictions.',
        category: 'Biped (horned)',
        eras: ALL_ERAS,
        merits: ['ap-heightened-awareness'],
        flaws: [],
    },
    {
        id: 'kel-dor',
        name: 'Kel Dor',
        shortDescription: 'Humanoids requiring breath masks, with keen low-light vision',
        description:
            'Kel Dors are a species from the planet Dorin, which has a helium-rich atmosphere. In standard oxygen-nitrogen environments, Kel Dors must wear antiox breath masks and protective goggles. Despite this limitation, their large eyes grant excellent low-light vision, and they are known as perceptive, principled beings.',
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-vision'],
        flaws: ['ap-unique-atmosphere'],
    },
    {
        id: 'chiss',
        name: 'Chiss',
        shortDescription: 'Blue-skinned humanoids with glowing red eyes and a strategic mindset',
        description:
            'The Chiss are a enigmatic species from the Unknown Regions, instantly recognizable by their blue skin, glowing red eyes, and jet-black hair. Their eyes are adapted to low-light conditions, granting superior night vision. The Chiss are renowned for their strategic thinking and calculated demeanor, though outsiders often perceive them as cold and unfeeling.',
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-vision'],
        flaws: ['stereotyped'],
    },
    {
        id: 'neimoidian',
        name: 'Neimoidian',
        shortDescription: 'Green-skinned humanoids with a reputation for greed and cowardice',
        description:
            'Neimoidians are a species of green-skinned humanoids from the planet Neimoidia, known for their prominent role in the Trade Federation. Obsessed with status and wealth, Neimoidian society is deeply hierarchical and avaricious. Their reputation for cowardice and greed precedes them everywhere, making trust difficult in negotiations.',
        category: 'Biped',
        eras: ['The Fall of the Jedi', 'The Reign of the Empire', 'The Age of Rebellion'],
        merits: [],
        flaws: ['stereotyped'],
    },
    {
        id: 'weequay',
        name: 'Weequay',
        shortDescription: 'Weather-beaten humanoids with a distinctive pheromonal language',
        description:
            'Weequays are a rugged species with weathered, leathery skin, often seen working as mercenaries or laborers across the galaxy. They communicate through a complex system of pheromones in addition to spoken language, though their vocal cords cannot form the sounds of Galactic Basic. Weequays are known for their endurance and loyalty.',
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-hardy'],
        flaws: ['ap-limited-vocal-range'],
    },
    {
        id: 'aqualish',
        name: 'Aqualish',
        shortDescription: 'Walrus-faced humanoids with sharp tusks and a combative nature',
        description:
            'Aqualish are a stout, strong species from the planet Ando, identifiable by their walrus-like faces, sharp tusks, and fin-like hands. They have a cultural tradition of aggression and personal combat, making them feared in close quarters. Their tusks serve as natural weapons, but their combative reputation complicates social interactions.',
        category: 'Amphibious',
        eras: ALL_ERAS,
        merits: ['ap-natural-weapons'],
        flaws: ['stereotyped'],
    },
    {
        id: 'trandoshan',
        name: 'Trandoshan',
        shortDescription: 'Reptilian humanoids with regenerative scales and a hunter culture',
        description:
            'Trandoshans are a reptilian species from the planet Trandosha, covered in thick, scaly hide. Their culture glorifies hunting, and they are infamous across the galaxy as slavers and trophy collectors. Their natural armor and retractable claws make them formidable in combat, but their reputation as brutish savages precedes them.',
        category: 'Reptilian',
        eras: ALL_ERAS,
        merits: ['ap-natural-weapons', 'ap-thick-skinned'],
        flaws: ['stereotyped'],
    },
    {
        id: 'quarren',
        name: 'Quarren',
        shortDescription: 'Squid-faced amphibious humanoids native to Mon Calamari',
        description:
            'Quarren are an amphibious species sharing the planet Mon Calamari with their more famous neighbors. With tentacled faces and a reserved, isolationist culture, Quarren often work as laborers, engineers, and traders. They are well-adapted to aquatic life but suffer in dry environments, and their cautious nature sets them apart from the optimistic Mon Calamari.',
        category: 'Amphibious',
        eras: ALL_ERAS,
        merits: ['ap-amphibious'],
        flaws: ['ap-environmental-sensitivity'],
    },
    {
        id: 'bith',
        name: 'Bith',
        shortDescription: 'Large-domed humanoids with extraordinary hearing and musical talent',
        description:
            "Bith are a species characterized by their large, hairless craniums, small facial features, and long-fingered hands. Hailing from the planet Clak'dor VII, Bith are renowned across the galaxy as musicians, scientists, and scholars. Their keen hearing covers a broader frequency range than most species, making them sensitive to sounds others cannot perceive.",
        category: 'Biped',
        eras: ALL_ERAS,
        merits: ['ap-enhanced-hearing'],
        flaws: [],
    },
    {
        id: 'noghri',
        name: 'Noghri',
        shortDescription: 'Stealthy, gray-skinned assassins with an acute sense of smell',
        description:
            'Noghri are a primitive humanoid species with steely gray skin, renowned across the galaxy as superlative assassins and bodyguards. Their innate talents for stealth and hand-to-hand combat, combined with a keen sense of smell, make them deadly hunters. Tricked into serving the Empire by Darth Vader, the Noghri were enslaved for decades before being freed by Princess Leia. They are bound by a strict code of honor and repay life-debts with unwavering loyalty.',
        category: 'Biped',
        eras: ['The Reign of the Empire', 'The Age of Rebellion', 'The New Republic'],
        merits: ['ap-enhanced-olfactory', 'ap-natural-weapons'],
        flaws: ['slave-race'],
    },
    {
        id: 'selkath',
        name: 'Selkath',
        shortDescription: 'Aquatic catfish-like humanoids with venom-tipped claws',
        description:
            'Selkath are an aquatic species native to the water world of Manaan, resembling anthropomorphic catfish with aqua-colored skin. They are superb swimmers who breathe both air and water with equal ease. Selkath possess venom-tipped retractable claws, though using them in combat is considered deeply dishonorable by their culture. As a species, they maintain staunch neutrality in galactic conflicts, enforced by harsh laws.',
        category: 'Amphibious',
        eras: ALL_ERAS,
        merits: ['ap-amphibious', 'ap-natural-weapons'],
        flaws: [],
    },
    {
        id: 'barabel',
        name: 'Barabel',
        shortDescription:
            'Reptilian humanoids covered in scales, with sharp teeth and a fearsome reputation',
        description:
            'Barabels are a reptilian species from the planet Barab I, covered in protective scales and armed with long, pointed teeth. They are exceptionally strong and feared across the galaxy as aggressive predators who prefer their food still alive. Barabels hold an immense respect for the Jedi Order, stemming from an ancient Jedi who settled a bloody clan war. They never apologize — the concept is alien to them, and being apologized to is considered mildly insulting.',
        category: 'Reptilian',
        eras: ALL_ERAS,
        merits: ['ap-thick-skinned', 'ap-natural-weapons'],
        flaws: ['stereotyped'],
    },
    {
        id: 'pauan',
        name: "Pau'an",
        shortDescription: 'Tall, gaunt near-humans with long lifespans and dark-adapted vision',
        description:
            "Pau'ans, also known as Ancients, are a gaunt, tall species native to the sinkhole world of Utapau. Standing nearly two meters tall, they have pale wrinkled skin, sunken black eyes adapted to darkness, and fang-like teeth suited to their carnivorous diet. Pau'ans are renowned for their long lifespans — up to 700 years — and serve as the natural leaders and administrators of Utapaun society alongside the Utai.",
        category: 'Biped (tall)',
        eras: ALL_ERAS,
        merits: ['ap-tall', 'ap-enhanced-vision'],
        flaws: ['ap-strict-diet'],
    },
    {
        id: 'toydarian',
        name: 'Toydarian',
        shortDescription: 'Short, winged humanoids immune to mental manipulation',
        description:
            'Toydarians are short, blue-skinned humanoids from the swamp world of Toydaria, with stout bodies, trunk-like snouts, and leathery wings that grant them natural flight. Their unique biology makes them completely immune to Force-based mind tricks and mental manipulation — only money and negotiation can sway them. Toydarians are shrewd, pragmatic traders with a talent for haggling, though their insular society and airborne lifestyle keep them somewhat removed from mainstream galactic affairs.',
        category: 'Biped (small)',
        eras: ALL_ERAS,
        merits: ['ap-flight-wings', 'ap-immune-jedi-mind-tricks'],
        flaws: [],
    },
    {
        id: 'besalisk',
        name: 'Besalisk',
        shortDescription: 'Four-armed, bulky humanoids from the icy planet Ojom',
        description:
            'Besalisks are a race of four-armed humanoids from the frozen world of Ojom, though females may have up to eight arms. Despite their bulky, fleshy appearance, Besalisks are keen-witted and gregarious, able to survive long periods without food or water. Their bony crests and profuse sweating (a relic of their cold homeworld) often lead others to mistakenly view them as gluttonous or nervous. The extra limbs make them formidable in combat or any task requiring multitasking.',
        category: 'Biped (large)',
        eras: ALL_ERAS,
        merits: ['ap-four-arms'],
        flaws: ['stereotyped'],
    },
];
