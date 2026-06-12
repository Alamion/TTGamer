export interface AbilityEntry {
    id: string;
    name: string;
    category: 'Talent' | 'Skill' | 'Knowledge';
    shortDescription: string;
    description: string;
    scale: string[];
    specialties: string[];
}

export const ABILITIES: AbilityEntry[] = [
    {
        id: 'alertness',
        name: 'Alertness',
        category: 'Talent',
        shortDescription: 'Awareness of surroundings and keen perception',
        description:
            'You have become practiced in noticing all that happens around you, even without actively concentrating. Whether spotting an ambush in a narrow Coruscant alleyway or reading the mood of a crowded starport cantina, Alertness indicates how aware you are of the world — and dangers — around you.',
        scale: [
            'Novice: You tend to be alert to changes, more so than most.',
            'Practiced: You are watchful and very attentive to your surroundings.',
            'Competent: You are highly vigilant, rarely missing obvious threats.',
            'Expert: You are a truly cautious individual and rarely let your guard down.',
            'Master: You notice everything that goes on around you — nothing escapes your attention.',
        ],
        specialties: ['Bodyguarding', 'Ambushes', 'Crowds', 'Noises', 'Starports', 'Paranoia'],
    },
    {
        id: 'athletics',
        name: 'Athletics',
        category: 'Talent',
        shortDescription: 'General physical prowess and sporting ability',
        description:
            'This Ability describes your general athletic prowess and assumes familiarity with most sports and physical activities. It is used to see if you can leap across a chasm in a crumbling space station, swim through the flooded lower levels of a city, vault a fence in a chase, or climb a sheer cliff face.',
        scale: [
            'Novice: Little Leaguer — basic fitness and casual play.',
            'Practiced: High school jock — solid fundamentals in several sports.',
            'Competent: College Varsity player — disciplined training and technique.',
            'Expert: Professional athlete — peak physical conditioning and skill.',
            'Master: Olympic gold medalist — among the best in the galaxy.',
        ],
        specialties: ['Swimming', 'Mountain Climbing', 'Acrobatics', 'Running', 'Throwing'],
    },
    {
        id: 'brawl',
        name: 'Brawl',
        category: 'Talent',
        shortDescription: 'Unarmed combat and rough-and-tumble fighting',
        description:
            'You know how to fight unarmed. This Ability includes punching, kicking, grappling, throttling, throwing, headbutting, and biting — the brutal language of fists and feet. In the lawless fringe of the galaxy, Brawl is often the difference between walking away and being carried away.',
        scale: [
            'Novice: You know what to do, but have not had much real experience.',
            'Practiced: You know where to hit people and how to make it hurt.',
            'Competent: You can choose your seat in any cantina.',
            'Expert: You are a disciplined martial artist.',
            'Master: You could be a galactic bare-knuckle champion.',
        ],
        specialties: ['Armlocks', 'Boxing', 'Wrestling', 'Grappling', 'Throws', 'Headbutts'],
    },
    {
        id: 'command',
        name: 'Command',
        category: 'Talent',
        shortDescription: 'Leadership and the ability to give orders',
        description:
            'You are proficient at giving orders and having them followed. With a Command roll you can compel NPCs to follow your instructions. The more successes you roll, the more effective they will be in carrying out your directions. Command is particularly useful in running a large capital ship with a crew of hundreds.',
        scale: [
            'You will take charge if no one else will.',
            'You are comfortable being put in charge.',
            'Your friends tend to follow your lead.',
            'Everyone expects you to take charge.',
            'Strangers look to you for leadership.',
        ],
        specialties: [
            'Starship crew',
            'Crowd control',
            'Ground troops',
            'Fighter squadron',
            'Repair crew',
        ],
    },
    {
        id: 'diplomacy',
        name: 'Diplomacy',
        category: 'Talent',
        shortDescription: 'Negotiation, mediation, and social grace',
        description:
            'You have the ability to deal with people of all types and creeds across the galaxy. Even when handling touchy subjects, you get results without ruffling feathers. You are skilled at delicate negotiations and mediating disputes — getting along with others without overt manipulation and without letting your own aims fall by the wayside.',
        scale: [
            'Novice: You can iron out minor misunderstandings.',
            'Practiced: Friends ask you to handle difficult conversations for them.',
            'Competent: You could shine as a corporate liaison or sector negotiator.',
            'Expert: You could be a professional mediator or ambassador.',
            'Master: You can defuse nearly any situation, from a trade dispute to an interplanetary incident.',
        ],
        specialties: ['Mediation', 'Negotiation', 'Etiquette', 'Protocol', 'Trade agreements'],
    },
    {
        id: 'dodge',
        name: 'Dodge',
        category: 'Talent',
        shortDescription: 'Avoiding attacks and taking cover',
        description:
            'The most effective way to win a fight is not to be struck. Your rating in Dodge describes your ability to avoid both melee and ranged attacks, including diving for cover and ducking blaster bolts. In a galaxy where a single shot can end a career, Dodge keeps you alive.',
        scale: [
            'Novice: You hit the ground if someone screams "Down!"',
            'Practiced: You have no problem finding cover in a firefight.',
            'Competent: You are always the last one out in a blaster drill.',
            'Expert: A lucky shot may land once in a blue moon.',
            'Master: You can nearly sidestep blaster bolts.',
        ],
        specialties: ['Leap', 'Sidestep', 'Duck', 'Cover', 'Dive', 'Blaster fire'],
    },
    {
        id: 'empathy',
        name: 'Empathy',
        category: 'Talent',
        shortDescription: 'Understanding emotions and reading intent',
        description:
            "You understand and can sympathize with the emotions of others, and are thus able to respond to them appropriately. You can often discern the motives behind someone's actions by simply listening to them, and can detect when you are being lied to. Empathy has a downside — because you are so open to the feelings of others, you often feel the same emotions as those around you.",
        scale: [
            'Novice: People tell you their problems at dinner parties.',
            'Practiced: Occasionally you get sympathetic pangs from others.',
            "Competent: You have an amazing insight into others' motivations.",
            'Expert: No lies ever get past your scrutiny.',
            "Master: You often finish other people's sentences.",
        ],
        specialties: ['Emotions', 'Truths', 'Personalities', 'Motivations', 'Deception'],
    },
    {
        id: 'intimidation',
        name: 'Intimidation',
        category: 'Talent',
        shortDescription: 'Overbearing presence and coercion',
        description:
            'The art of intimidation comes in many forms, ranging from a subtle suggestion to a Wookiee roaring in your face. You understand the science of being overbearing and know how to use it to get what you want. People with high Intimidation ratings seem to radiate an aura of authority that makes others think twice.',
        scale: [
            'Novice: Younglings give you the right of way.',
            'Practiced: You win an occasional staredown.',
            'Competent: Your gaze is very unsettling.',
            'Expert: You would make an above-average Imperial interrogator.',
            'Master: You can make vicious beasts turn tail and run.',
        ],
        specialties: ['Interrogation', 'Staredowns', 'Threats', 'Authority', 'Physical presence'],
    },
    {
        id: 'streetwise',
        name: 'Streetwise',
        category: 'Talent',
        shortDescription: 'Underworld knowledge and urban survival',
        description:
            "The streets of the galaxy's countless spaceports, underworlds, and urban sprawls are a major source of information, money, and big-time trouble. Streetwise allows you to blend in with the local scene without drawing attention, find the black market, understand criminal slang, and know who to talk to for information or illicit goods.",
        scale: [
            'Novice: You know who sells death sticks in your neighborhood.',
            'Practiced: You are considered cool by the local populace.',
            'Competent: You have connections in a prominent syndicate.',
            'Expert: You have spent most of your life on the streets.',
            'Master: If you do not know it, it has not been said.',
        ],
        specialties: [
            'Underworld info',
            'Black markets',
            'Fencing goods',
            'Street slang',
            'Spaceports',
        ],
    },
    {
        id: 'subterfuge',
        name: 'Subterfuge',
        category: 'Talent',
        shortDescription: 'Deception, intrigue, and hidden motives',
        description:
            'You know how to conceal your own motives and decipher the motives of others. The secrets and intrigues of others interest you, and you work at understanding their weaknesses. A command of Subterfuge makes you the ultimate conversationalist — or the ultimate spy. Whether bluffing your way past an Imperial checkpoint or running a long con on a Hutt, Subterfuge is your tool.',
        scale: [
            'Novice: A few white lies never hurt anyone.',
            'Practiced: You can talk your way into an exclusive club.',
            'Competent: You could be a criminal lawyer.',
            'Expert: Used car salesmen have nothing on you.',
            'Master: You could sell a used landspeeder to a Jawas.',
        ],
        specialties: [
            'Finding weaknesses',
            'Seduction',
            'Little white lies',
            'Misdirection',
            'Bluffing',
        ],
    },
    {
        id: 'blaster',
        name: 'Blaster',
        category: 'Skill',
        shortDescription: 'Proficiency with ranged energy weapons',
        description:
            'You have a broad knowledge of blasters and other ranged weapons, from a simple sporting blaster pistol to a military-grade blaster rifle, as well as the ability to maintain and repair them. Blaster does not include heavy vehicle-mounted weapons — that is the domain of Gunnery.',
        scale: [
            'Novice: You have had one or two lessons at the firing range.',
            'Practiced: You do all right at a firing range.',
            'Competent: You can pull off a few fancy shots.',
            'Expert: You are cool and steady, even under fire.',
            'Master: "Do you feel lucky? Well, do ya, punk?"',
        ],
        specialties: [
            'Blaster pistol',
            'Blaster rifle',
            'Heavy blaster',
            'Quick draw',
            'Targeting',
        ],
    },
    {
        id: 'gunnery',
        name: 'Gunnery',
        category: 'Skill',
        shortDescription: 'Operation of heavy and vehicle-mounted weapons',
        description:
            'You are trained to fire large vehicle-mounted energy weapons as well as ground-based artillery. You can also fire proton torpedoes, concussion missiles, or other "smart" weapons of any scale. Gunnery covers everything from a speeder\'s chin gun to a capital ship\'s turbolaser batteries.',
        scale: [
            'You can figure out where the trigger is.',
            'You have had the standard military orientation course on heavy weapons.',
            'Military specialization in artillery, mechanized infantry, or starship combat.',
            "You could command an artillery division or be a ship's weapons officer.",
            'There are targeting computers named after you.',
        ],
        specialties: [
            'Starship gun turrets',
            'Turbolasers',
            'Ground artillery',
            'Anti-orbital defense',
            'Starfighters',
        ],
    },
    {
        id: 'melee',
        name: 'Melee',
        category: 'Skill',
        shortDescription: 'Combat with hand-held weapons',
        description:
            'The ability to fight with a hand-held weapon is a valuable skill in a galaxy where energy cells run dry and honor is settled blade-to-blade. Proficiency in this Skill allows you to use vibroblades, stun batons, force pikes, training lightsabers, and any other hand-to-hand weapon. Melee is also used to parry and disarm opponents.',
        scale: [
            'Novice: You have seen a vibroblade being used.',
            'Practiced: You have taken a six-week course in fencing.',
            'Competent: Average street thug with some real experience.',
            'Expert: Any weapon is deadly in your grasp.',
            'Master: A Jedi weapon master with a blade — any blade.',
        ],
        specialties: ['Vibroblades', 'Stun batons', 'Force pikes', 'Knives', 'Disarms'],
    },
    {
        id: 'pilot',
        name: 'Pilot',
        category: 'Skill',
        shortDescription: 'Operation of vehicles and starships',
        description:
            'You are skilled at operating vehicles of all types. From the cockpit of a walker, to the saddle of a simple speeder bike, to the helm of the largest capital starship, you have some capability to operate any of them. Piloting is instinct, training, and nerve all rolled into one.',
        scale: [
            'You can pilot a speeder in established traffic patterns or in a level plane.',
            'You can handle three-dimensional maneuvers in atmosphere or outer space.',
            'Professional commercial pilot — you fly for a living.',
            'Military fighter pilot or helmsman — combat maneuvers are second nature.',
            '"You are not actually going to fly INTO an asteroid field?"',
        ],
        specialties: ['Speeders', 'Walkers', 'Starfighters', 'Transports', 'Capital starship'],
    },
    {
        id: 'programming',
        name: 'Programming',
        category: 'Skill',
        shortDescription: 'Writing code and directing computers',
        description:
            'You are capable of giving complex directions to computers, droids, or any other device that accepts input and operates on a variable set of instructions. Of course you must have some way to interface with the device, and it must be able to accept your instructions — or else you may have to slice past its security first.',
        scale: [
            'You can write a simple program to monitor news feeds for key words.',
            'You can write a program to play a challenging game of dejarik or sabbac.',
            'You could program droids professionally.',
            'You could program security systems professionally.',
            'You could program complex operating systems professionally.',
        ],
        specialties: [
            'Security systems',
            'NAV computers',
            'Droids',
            'Sensor masks',
            'Databases',
            'Slicing',
        ],
    },
    {
        id: 'repair',
        name: 'Repair',
        category: 'Skill',
        shortDescription: 'Fixing and maintaining technology',
        description:
            'You are able to repair simple or complex devices of all sorts — from a faulty hyperdrive motivator on a freighter to a damaged protocol droid. Given the proper tools and time, you can fix almost anything. Repair covers everything from starship engineering to electronics to droids.',
        scale: [
            'Novice: You can assemble ready-made kits and follow basic instructions.',
            'Practiced: With proper time you can rewire a house or patch a hull breach.',
            'Competent: You save quite a few credits in mechanic fees.',
            'Expert: You are able to repair complex systems within minutes.',
            'Master: If it is broke, you can fix it — and make it run better.',
        ],
        specialties: [
            'Computers',
            'Droids',
            'Energy fields',
            'Propulsion',
            'Structural',
            'Weapons',
        ],
    },
    {
        id: 'ride',
        name: 'Ride',
        category: 'Skill',
        shortDescription: 'Riding and handling beasts of burden',
        description:
            'You can climb onto a riding animal and stand a good chance of getting where you want to go without falling off, being thrown, or having anything else unpleasant happen to you. When attempting something difficult, or when danger threatens, the Storyteller may require a Dexterity + Ride roll to avoid trouble.',
        scale: [
            'Novice: Occasional rider — you can stay on in calm conditions.',
            'Practiced: Comfortable at a gallop; you ride regularly.',
            'Competent: Instructor-level skill; riding is second nature.',
            'Expert: You could perform in a traveling show or ride in rough terrain.',
            'Master: Stunt rider — you can ride anything, anywhere.',
        ],
        specialties: ['Dewbacks', 'Tauntauns', 'Varactyls', 'Gallop', 'Tricks'],
    },
    {
        id: 'security',
        name: 'Security',
        category: 'Skill',
        shortDescription: 'Locks, alarms, and bypassing security systems',
        description:
            'You know the techniques and are proficient with the tools used for slicing locks, bypassing alarms, hotwiring vehicles, and cracking safes — as well as many other forms of breaking and entering. Many who possess Security do not use it for crime, but rather to prevent it or to reconstruct how a breach occurred.',
        scale: [
            'Novice: You can pick a simple mechanical lock.',
            'Practiced: You can hotwire a speeder.',
            "Competent: You can disable a building's alarm system.",
            'Expert: You can crack a vault or slice a secure databank.',
            'Master: The Imperial Treasury is not safe from you.',
        ],
        specialties: ['Electronics', 'Pick locks', 'Burglar alarms', 'Safes', 'Slicing'],
    },
    {
        id: 'stealth',
        name: 'Stealth',
        category: 'Skill',
        shortDescription: 'Moving unseen and unheard',
        description:
            'Stealth is the ability to sneak about or hide without being seen or heard. Whether you are infiltrating an Imperial base, tailing a mark through the streets of Nar Shaddaa, or simply avoiding unwanted attention, Stealth keeps you out of sight.',
        scale: [
            'Novice: You can hide in the dark.',
            'Practiced: You can hide in the shadows.',
            'Competent: You are an accomplished stalker.',
            'Expert: You could walk silently over dry leaves.',
            'Master: You move like a ghost — nobody knows you are there.',
        ],
        specialties: ['Prowl', 'Hide', 'Lurk', 'Shadows', 'Crowds', 'Urban'],
    },
    {
        id: 'survival',
        name: 'Survival',
        category: 'Skill',
        shortDescription: 'Wilderness survival and tracking',
        description:
            'The wilderness of a thousand worlds is a dangerous place for those who do not understand it. Survival includes seeking shelter, finding food and water, navigating treacherous terrain, and tracking prey or enemies. From the deserts of Tatooine to the frozen wastes of Hoth, Survival keeps you alive.',
        scale: [
            'Novice: You can survive a five-mile hike in mild conditions.',
            'Practiced: You are familiar with basic wilderness skills.',
            'Competent: You know how to find water, build shelter, and navigate.',
            'Expert: You are at home in the wild, even on hostile worlds.',
            'Master: You could find an oasis on Tatooine and track a bantha across the Dune Sea.',
        ],
        specialties: ['Tracking', 'Desert', 'Arctic', 'Jungle', 'Hunting'],
    },
    {
        id: 'astrogation',
        name: 'Astrogation',
        category: 'Knowledge',
        shortDescription: 'Hyperspace route planning and navigation',
        description:
            'You know how to plot hyperspace routes through the ever-shifting geography of the galaxy to navigate between star systems. Experience has also given you general knowledge of a variety of charted planets such as their technology level, inhabitants, climates, and local hazards.',
        scale: [
            'Student: You have taken a course in astrogation.',
            'College: You can handle short, well-traveled routes by yourself.',
            'Masters: You are a fully qualified astrogator.',
            'Doctorate: Commercial starships trust their cargo, crews, and passengers to you.',
            'Scholar: You could plot the Kessel Run in less than eleven parsecs.',
        ],
        specialties: [
            'Specific hyperspace route',
            'Region of space',
            'Unknown regions',
            'Trade routes',
        ],
    },
    {
        id: 'bureaucracy',
        name: 'Bureaucracy',
        category: 'Knowledge',
        shortDescription: 'Navigating organizations and red tape',
        description:
            'This Knowledge includes the ability to work within — and around — bureaucratic systems, whether Imperial, corporate, or guild. You understand power structures, know who is really in control, and can bribe, stall, or bypass officials as needed. In a galaxy run on forms and permits, Bureaucracy is power.',
        scale: [
            'Student: You have good organizational ability and can file basic forms.',
            'College: You understand power structures and who is really in control.',
            'Masters: You can perform stalling tactics indefinitely.',
            'Doctorate: You can perform high-level administrative duties.',
            'Scholar: You could get a meeting with a Moff or a corporate chairman.',
        ],
        specialties: [
            'Negotiation',
            'Bribery',
            'Imperial red tape',
            'Corporate structure',
            'Guild regulations',
        ],
    },
    {
        id: 'cultures',
        name: 'Cultures',
        category: 'Knowledge',
        shortDescription: 'Understanding alien societies and customs',
        description:
            'Through study, observation, or experience, you have learned about the different beings you share the galaxy with. In addition to alien traditions, etiquette, and protocol, you understand the history, beliefs, and geography that have shaped various civilizations and the way they organize, govern, and comport themselves.',
        scale: [
            'Student: You enjoy watching travel-log holos.',
            'College: You like to venture beyond the starport and tourist districts.',
            'Masters: You have frequent contact with a variety of aliens.',
            'Doctorate: You could be a professional diplomat or anthropologist.',
            'Scholar: You understand some civilizations better than the natives.',
        ],
        specialties: [
            'Specific system or sector',
            'Genus of alien',
            'Level of development',
            'Customs and protocol',
        ],
    },
    {
        id: 'interfaces',
        name: 'Interfaces',
        category: 'Knowledge',
        shortDescription: 'Operating machines and control systems',
        description:
            "You are able to efficiently operate machines for their intended purpose. Whether scanning for life forms, shutting down garbage mashers, transmitting a holo-message to a distant planet, or retrieving data tapes from an Imperial archive, Interfaces runs the galaxy's technology. Through intuition or training, you can make sense of any control panel.",
        scale: [
            'Student: Your home systems never give you trouble.',
            'College: You can usually guess what unfamiliar icons and labels mean.',
            'Masters: The purpose of every knob, button, and slider is apparent.',
            'Doctorate: You routinely find control shortcuts others miss.',
            'Scholar: You comprehend the hidden logic in the most baffling interfaces.',
        ],
        specialties: [
            'Comm systems',
            'Scanning systems',
            'Industrial systems',
            'Data retrieval',
            'Military interfaces',
        ],
    },
    {
        id: 'investigation',
        name: 'Investigation',
        category: 'Knowledge',
        shortDescription: 'Detective work, research, and clue-gathering',
        description:
            'You are trained to notice all sorts of details others might miss, and at high levels may function as a detective. This Knowledge also reflects your ability to do research, both in databases and through interviews. Investigation is the key to solving mysteries, uncovering conspiracies, and finding the truth.',
        scale: [
            'Student: Amateur sleuth — you read the holos and speculate.',
            'College: Competent investigator — you could work for a security force.',
            'Masters: Private investigator — you can uncover most secrets with time.',
            'Doctorate: Intelligence agent — ISB, Rebellion intelligence, or equivalent.',
            'Scholar: You are a legend — nothing stays hidden from you for long.',
        ],
        specialties: [
            'Search',
            'Surveillance',
            'Tail',
            'Detective work',
            'Database research',
            'Interrogation',
        ],
    },
    {
        id: 'languages',
        name: 'Languages',
        category: 'Knowledge',
        shortDescription: 'Understanding and speaking multiple languages',
        description:
            'While all characters speak their native language automatically and understand Basic, Languages allows you to speak one additional language fluently for each dot you possess. Moreover, semantics and syntax seem to have evolved along similar lines throughout the galaxy, giving you a chance to understand just about any language spoken to you.',
        scale: [
            'Student: You learned one language through your basic education.',
            'College: You have been in several starports and held multilingual conversations.',
            'Masters: You travel a great deal and pick up background conversations.',
            'Doctorate: You deal with aliens regularly and sometimes dream in alien languages.',
            'Scholar: "I am fluent in over six million forms of communication."',
        ],
        specialties: [
            'Reptilian species',
            'Humanoid species',
            'Insectoid species',
            'Binary (droidspeak)',
            'Specific language family',
        ],
    },
    {
        id: 'medicine',
        name: 'Medicine',
        category: 'Knowledge',
        shortDescription: 'Healing, diagnosis, and xenobiology',
        description:
            'Medicine is the study of the body and the techniques used to cure its ills. It includes knowledge of the structure and functions of both human and alien physiologies, the use of pharmaceuticals and bacta, and the diagnosis and treatment of diseases and injuries across multiple species.',
        scale: [
            'Student: You know the basics of setting bones and preventing shock.',
            'College: You have paramedic-quality training and field trauma experience.',
            'Masters: You are a fully qualified physician across multiple species.',
            'Doctorate: You can perform complex surgery.',
            'Scholar: You are a specialist of great renown — species specialist or research pioneer.',
        ],
        specialties: ['Emergency care', 'Surgery', 'Xenobiology', 'Pharmacy', 'Bacta treatment'],
    },
    {
        id: 'politics',
        name: 'Politics',
        category: 'Knowledge',
        shortDescription: 'Political systems, power, and influence',
        description:
            'This Knowledge provides familiarity with the politics of the day, including the people in charge and how they got there. Whether navigating the Imperial Senate (before its dissolution), dealing with planetary governors, or understanding the power dynamics of the Hutt cartels, Politics is essential when power is the currency.',
        scale: [
            'Student: Casual observer or protester — you follow political holos.',
            'College: Campaign worker or political science student — you understand the game.',
            'Masters: Campaign manager or speech writer — you can shape political outcomes.',
            'Doctorate: Politician or influential advisor — you are in the room where it happens.',
            'Scholar: You are a political genius — Senator Palpatine would be impressed.',
        ],
        specialties: [
            'Sector politics',
            'Imperial politics',
            'Corporate politics',
            'Hutt cartels',
            'Rebel Alliance',
        ],
    },
    {
        id: 'tech',
        name: 'Tech',
        category: 'Knowledge',
        shortDescription: 'Designing and understanding technology',
        description:
            'While Repair is the Skill to put something back together, Tech is the Knowledge to design and build new equipment from scratch or to improve existing equipment beyond its intended abilities. It can also be used to understand strange, new technology you have not encountered before.',
        scale: [
            'Student: You have installed plug-and-play upgrades.',
            'College: You can follow complex instructions to wire a complicated upgrade.',
            'Masters: You could adapt a component to work with a system it was not designed for.',
            'Doctorate: You can design and fabricate your own custom parts.',
            'Scholar: You design and custom build all your own equipment from scratch.',
        ],
        specialties: [
            'Computers',
            'Droids',
            'Energy fields',
            'Propulsion',
            'Structural',
            'Weapons',
        ],
    },
    {
        id: 'trade',
        name: 'Trade',
        category: 'Knowledge',
        shortDescription: 'Commerce, appraisal, and economics',
        description:
            'You are knowledgeable about the values of many different goods across the galaxy and can properly evaluate the worth of almost any item. Whether negotiating a cargo haul, appraising a rare artifact, or determining the fair market value of a starship, Trade ensures you are not cheated.',
        scale: [
            'Student: You can perform basic accounting and keep ledgers.',
            'College: Having studied or gained practical experience, you understand higher commerce.',
            "Masters: You could run a trading operation or manage a starport's cargo exchange.",
            'Doctorate: You can make sound investments and spot market trends.',
            'Scholar: You are an economic genius — you could manipulate entire sector markets.',
        ],
        specialties: ['Accounting', 'Smuggling', 'Fencing', 'Investing', 'Appraisal'],
    },
];
