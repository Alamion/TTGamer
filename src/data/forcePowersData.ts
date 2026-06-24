export interface ForcePowerEntry {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    skills: string[];
    forcePointCost: boolean;
}

export const FORCE_POWERS: ForcePowerEntry[] = [
    {
        id: 'awareness',
        name: 'Awareness',
        shortDescription: 'Perceive Force auras and read surface strength',
        description:
            'You extend your senses through the Force to perceive the world around you. Add your Sense dots to all Alertness rolls. With a deliberate roll of Perception + Sense, you can study a target to determine their Force sensitivity, approximate Dark Side Resistance, and relative Force Skill strength. The difficulty is 6 for a casual reading, scaling to 8+ if the target is concealing their presence. With 1 success you get a vague impression; 3+ successes reveal precise dot ratings.',
        skills: ['Sense'],
        forcePointCost: false,
    },
    {
        id: 'bridge-minds',
        name: 'Bridge Minds',
        shortDescription: 'Forge a mental connection between two beings',
        description:
            "You create a temporary psychic bond between two willing or unresisting characters, allowing them to share emotions, impressions, and basic concepts across any distance. Roll Perception + Sense to initially perceive the target's Virtue ratings. Then roll Charisma + Rapport to establish the bridge. The quality of the connection scales with successes: 1 success allows emotional impressions, 3 successes allows wordless concepts, 5+ successes allows full sentence-level communication. The bridge lasts one scene per success.",
        skills: ['Rapport', 'Sense'],
        forcePointCost: false,
    },
    {
        id: 'calm-beast',
        name: 'Calm Beast',
        shortDescription: 'Soothe a non-sentient creature through the Force',
        description:
            "You reach out through the Force to calm an agitated or hostile non-sentient creature. Roll Charisma + Rapport. The difficulty depends on the creature's state (6 for uneasy, 8 for enraged). With 1 success, the creature becomes docile for a few moments. With 3 successes, it remains calm for an entire scene unless provoked. With 5+ successes, you establish a temporary bond that lets you guide its actions. This power does not work on sentient beings or creatures with Force resistance.",
        skills: ['Rapport'],
        forcePointCost: false,
    },
    {
        id: 'clairvoyance',
        name: 'Clairvoyance',
        shortDescription: 'Observe distant events through the Force',
        description:
            'You open your mind to see events occurring far away. Roll Intelligence + Sense. The base difficulty is 6, modified by your relationship to the target, time elapsed, and distance (see Difficulty Modifiers). With 1 success you get a vague impression — strong emotions or significant events. With 3 successes you observe the scene as if standing in the room. With 5+ successes you can hear sounds and read text. Each success also grants one minute of observation.',
        skills: ['Sense'],
        forcePointCost: false,
    },
    {
        id: 'concealment',
        name: 'Concealment',
        shortDescription: 'Hide your Force signature from detection',
        description:
            "You shroud your presence in the Force, making it difficult for others to sense you. Roll Manipulation + Dynamism. Opposed by the searcher's Perception + Sense. With 1 success you reduce your detectable range. With 3 successes, other Force users perceive your Dark Side Resistance as a flat 5 regardless of your actual rating. With 5+ successes, you become effectively invisible to Force detection for the scene. You cannot use other Force Powers while maintaining Concealment without breaking it.",
        skills: ['Dynamism'],
        forcePointCost: false,
    },
    {
        id: 'contain-energy',
        name: 'Contain Energy',
        shortDescription: 'Absorb or redirect incoming energy attacks',
        description:
            "You reach out with the Force to catch, absorb, or redirect incoming energy — blaster bolts, Sith lightning, plasma bursts. Spend 1 Force Point. Roll Dexterity + Dynamism as a reaction. Each success reduces the incoming damage by one die. With 3+ successes beyond what's needed to fully absorb the attack, you may redirect the energy back at the attacker (make a new attack roll). The difficulty to contain a single shot is 6; containing a sustained barrage or area-effect energy is 8+.",
        skills: ['Dynamism'],
        forcePointCost: true,
    },
    {
        id: 'crush',
        name: 'Crush (Force Choke)',
        shortDescription: 'Crush or choke a target with telekinetic force',
        description:
            "You apply telekinetic pressure to a target's throat or body. Spend 1 Force Point to activate. The target takes Bashing damage equal to your Telekinesis dots each round you maintain concentration. The target may resist with a Stamina roll (difficulty 6) each round to reduce damage by their successes. If the target is reduced to Incapacitated, they fall unconscious. This power requires line of sight and sustained concentration. The dark side influence: using Crush on a defenseless target may trigger a Conscience roll.",
        skills: ['Telekinesis'],
        forcePointCost: true,
    },
    {
        id: 'energy-burst',
        name: 'Energy Burst (Sith Lightning)',
        shortDescription: 'Discharge crackling energy at a target',
        description:
            'You channel the Force into a torrent of electrical energy that arcs from your fingertips. Spend 1 Force Point. Make a ranged attack roll of Dexterity + Dynamism against difficulty 6. Damage equals your current Force Points. The damage type escalates: Stun damage against targets with full health, Bashing once the Stun track is full, and Lethal once Bashing is full. You may maintain the barrage for multiple rounds by spending 1 FP per additional round and succeeding on a Willpower roll (difficulty 6) each round.',
        skills: ['Dynamism'],
        forcePointCost: true,
    },
    {
        id: 'focus',
        name: 'Focus',
        shortDescription: 'Multiply successes on your next Force Power',
        description:
            'You center yourself, letting the Force flow through you with perfect clarity. Spend one turn concentrating. On the next turn, when you use another Force Power, multiply its successes by the lower of your Control or Sense dots. For example, if you have Control 3 and Sense 2, and your next power scores 3 successes, you effectively have 6 successes (3 × 2). If you take damage or perform any other action during the concentration turn, the Focus is lost.',
        skills: ['Control', 'Sense'],
        forcePointCost: false,
    },
    {
        id: 'force-feats',
        name: 'Force Feats',
        shortDescription: 'Augment a physical feat with the Force',
        description:
            'You call on the Force to amplify a single physical action — jumping a chasm, lifting a heavy object, breaking through a door. Spend 1 Force Point. Roll the physical action as normal, then multiply the successes by the lower of your Control or Telekinesis dots. For example, with Control 3 and Telekinesis 2, rolling 4 successes on a Strength + Athletics jump check yields 8 effective successes. The augmentation applies to one instant action, not an extended duration.',
        skills: ['Control', 'Telekinesis'],
        forcePointCost: true,
    },
    {
        id: 'healing',
        name: 'Healing',
        shortDescription: 'Accelerate natural healing through the Force',
        description:
            'You channel the Force to mend wounds and accelerate natural healing. Spend 1 Force Point. For self-healing, roll Control + Medicine. To heal another, roll Rapport + Medicine (requires touch). Each success restores one Health level. Healing Lethal damage requires 3+ successes and takes longer (hours rather than minutes). The difficulty is 7 for Bashing, 8 for Lethal. You cannot heal the same target more than once per day without risking tissue damage.',
        skills: ['Control', 'Rapport'],
        forcePointCost: true,
    },
    {
        id: 'heave',
        name: 'Heave',
        shortDescription: 'Hurl a large object with telekinetic force',
        description:
            "You establish a telekinetic grip on a large object and hurl it with lethal force. You must first have a Force connection to the object (you've touched it, or it's within your line of sight and you've studied it for a turn). Roll Telekinesis + Passion (difficulty varies by object size: 6 for chair-sized, 8 for speeder-sized). On success, the object flies at your target. Damage equals your current Force Points. For lifting/positioning rather than hurling, use Feats of Strength rules.",
        skills: ['Telekinesis'],
        forcePointCost: false,
    },
    {
        id: 'ignore-pain',
        name: 'Ignore Pain',
        shortDescription: 'Suppress wound penalties through Force focus',
        description:
            'You draw on the Force to numb pain and push through injuries. Roll Stamina + Control. For the remainder of the scene, ignore wound penalties equal to your successes. With 1 success, ignore a -1 penalty. With 3 successes, ignore up to -3. With 5+ successes, you operate as if fully healthy regardless of wounds. When the effect ends, all accumulated pain hits at once — you immediately suffer the full wound penalties for the next scene.',
        skills: ['Control'],
        forcePointCost: false,
    },
    {
        id: 'lightsaber-combat',
        name: 'Lightsaber Combat',
        shortDescription: 'Enhanced lightsaber dueling technique',
        description:
            'You attune your lightsaber to the Force, enhancing your combat capabilities. The base difficulty for lightsaber attacks drops from 8 to 6. Add your Control dots to your Initiative for melee combat. You may automatically parry a number of incoming ranged attacks per round equal to your Sense dots — each parried shot is simply deflected without requiring a roll. This power remains active for the duration of a combat scene and does not require concentration.',
        skills: ['Control', 'Sense'],
        forcePointCost: false,
    },
    {
        id: 'lightsaber-creation',
        name: 'Lightsaber Creation',
        shortDescription: 'Construct a new lightsaber from a Kyber crystal',
        description:
            'You construct a lightsaber attuned to you through the Force. This is an extended ritual requiring several hours and a Kyber crystal. Three successive rolls are required: (1) Intelligence + Sense to design the focusing matrix (difficulty 7, need 10 successes over hours), (2) Dexterity + Telekinesis to assemble the components (difficulty 7, need 10 successes), (3) Dynamism to attune the crystal (difficulty 8, need 5 successes). Failure on any step means the crystal is ruined and you must find a new one.',
        skills: ['Dynamism', 'Sense', 'Telekinesis'],
        forcePointCost: false,
    },
    {
        id: 'lightsaber-empower',
        name: 'Lightsaber Empower',
        shortDescription: 'Channel the Force to increase lightsaber damage',
        description:
            "You channel raw Force energy through your lightsaber, making it blaze with intensified power. Spend 1 Force Point. For the remainder of the scene, add your Dynamism dots to the lightsaber's damage dice pool. The blade may glow brighter, hum louder, or crackle with energy. You cannot stack this power with itself, but it can be used alongside Lightsaber Combat.",
        skills: ['Dynamism'],
        forcePointCost: true,
    },
    {
        id: 'manipulate-object',
        name: 'Manipulate Object',
        shortDescription: 'Precise telekinetic control of an object',
        description:
            'You manipulate an object with fine telekinetic control — picking a lock from across the room, guiding a tool through a delicate repair, redirecting a lever. Spend 1 Force Point. Substitute your Telekinesis dots for the relevant Attribute or Ability in the manipulation roll. For example, instead of Dexterity + Security to pick a lock, you roll Telekinesis + Security. The difficulty is the same as the normal action. Range is limited to line of sight.',
        skills: ['Telekinesis'],
        forcePointCost: true,
    },
    {
        id: 'meditate',
        name: 'Meditate',
        shortDescription: 'Enter a trance to restore Force Points',
        description:
            'You enter a deep meditative trance, opening yourself to the Light Side of the Force to replenish your strength. Roll your current Dark Side Resistance as a dice pool (difficulty 6). Each success restores one spent Force Point. While meditating, reduce the difficulty of any other Force Power you use by 2 (minimum 3). Meditation requires absolute concentration and at least 10 minutes of uninterrupted trance. You cannot move, speak, or perceive your surroundings while in this state. If your DSR is 0, you cannot use this power — you must rely on Vanquish instead.',
        skills: ['Dynamism'],
        forcePointCost: false,
    },
    {
        id: 'meld-with-force',
        name: 'Meld with Force',
        shortDescription: 'Prepare to become a Force ghost upon death',
        description:
            'You prepare your spirit to retain its identity after death, becoming one with the Force while preserving your consciousness. This is a two-step ritual. First, prepare by rolling Control + Self-Control (difficulty 8, need 20 extended successes over days or weeks). Second, upon death or when ready to transition, roll Dynamism + Conscience (difficulty 9). Success means you become a Force ghost, able to appear to and communicate with the living. Failure means your identity dissolves into the Force.',
        skills: ['Control', 'Dynamism'],
        forcePointCost: false,
    },
    {
        id: 'operate',
        name: 'Operate',
        shortDescription: 'Remotely pilot or control a machine',
        description:
            'You extend your senses into a machine, vehicle, or computer system to operate it remotely through the Force. Roll Sense + the lower of your Dynamism or Telekinesis dots. With 1 success you can press buttons and flip switches. With 3 successes you can pilot a vehicle (using your Force dice instead of Pilot). With 5+ successes you can access computer systems and execute commands. Range is limited to line of sight for most operations.',
        skills: ['Dynamism', 'Sense', 'Telekinesis'],
        forcePointCost: false,
    },
    {
        id: 'physical-prowess',
        name: 'Physical Prowess',
        shortDescription: 'Augment all athletic abilities with the Force',
        description:
            'The Force flows through your body, enhancing your natural athletic capabilities. For the remainder of the scene, add your Control dots to all Athletics rolls — including climbing, jumping, swimming, running, and acrobatics. This power is passive and requires no concentration once activated. It does not stack with Force Feats (which provide a larger bonus to a single action).',
        skills: ['Control'],
        forcePointCost: false,
    },
    {
        id: 'probe-memories',
        name: 'Probe Memories',
        shortDescription: 'Forcefully extract memories from a target',
        description:
            "You invade a target's mind to extract specific memories. Spend 1 Force Point. This is an extended, resisted roll: you roll Rapport + Intimidation, the target rolls Willpower. The winner of the contest may ask the loser a number of questions equal to their Sense dots. If you win, the target must answer truthfully (though they may be vague or unhelpful if they are skilled at resistance). If the target wins, your probe is repelled and they know someone tried to read them.",
        skills: ['Rapport', 'Sense'],
        forcePointCost: true,
    },
    {
        id: 'proficiency',
        name: 'Proficiency',
        shortDescription: 'Temporarily enhance one Ability with the Force',
        description:
            'You channel the Force to temporarily enhance your skill in one Ability. Spend 1 Force Point. For the remainder of the scene, add the lower of your Control or Sense dots to all rolls using a single chosen Ability (e.g., Blaster, Stealth, Pilot). You cannot use this power to enhance Force Skills. The bonus applies to both Attribute + Ability rolls and Ability-only rolls.',
        skills: ['Control', 'Sense'],
        forcePointCost: true,
    },
    {
        id: 'project-thoughts',
        name: 'Project Thoughts',
        shortDescription: 'Send a mental message to another being',
        description:
            'You project a thought, image, or emotion across any distance to a target you know. Roll Rapport + Empathy. The base difficulty is 6, modified by your relationship to the target and distance (see Difficulty Modifiers). With 1 success you send a simple emotion (fear, calm, urgency). With 3 successes you send a clear sentence or image. With 5+ successes you can conduct a two-way mental conversation. The target always knows the message originated from you.',
        skills: ['Rapport'],
        forcePointCost: false,
    },
    {
        id: 'read-surface-thoughts',
        name: 'Read Surface Thoughts',
        shortDescription: 'Hear the surface thoughts of a nearby target',
        description:
            "You attune your mind to a target's surface thoughts — what they are actively thinking about. Roll Perception + Rapport (difficulty 6, or the target's Willpower if they are resisting). Each success grants you one turn of insight into their thoughts. Information received per turn equals your Sense dots in sentences or distinct facts. If the target is actively resisting, they may make an opposed Willpower roll each turn to push you out.",
        skills: ['Rapport', 'Sense'],
        forcePointCost: false,
    },
    {
        id: 'repel',
        name: 'Repel',
        shortDescription: 'Throw targets backward with telekinetic force',
        description:
            'You unleash a wave of telekinetic force that throws targets backward. Spend 1 Force Point. All targets within a cone in front of you are thrown back. The distance thrown is roughly 10 feet per Telekinesis dot. Targets take falling damage based on the distance thrown (1 level per 10 feet). A Dexterity + Athletics roll (difficulty 6) allows a target to halve the distance. Large or anchored targets may resist with a Strength roll (difficulty = your Telekinesis).',
        skills: ['Telekinesis'],
        forcePointCost: true,
    },
    {
        id: 'somnolence',
        name: 'Somnolence',
        shortDescription: 'Force a target into magical sleep',
        description:
            "You reach into a target's mind and induce overwhelming drowsiness. Spend 1 Force Point. You must touch the target. Roll Rapport + Subterfuge versus the target's Willpower. If you succeed, the target falls into a deep, natural sleep for a number of hours equal to your successes. Loud noises or physical shaking can awaken them early, but the sleep is otherwise unnaturally deep. Creatures that do not sleep (droids, some species) are immune. This power has no effect on targets already in combat.",
        skills: ['Rapport'],
        forcePointCost: true,
    },
    {
        id: 'subjugate',
        name: 'Subjugate',
        shortDescription: "Take control of another being's body",
        description:
            "You override a target's will and take direct control of their physical body. Spend 1 Force Point. Roll Rapport + Command versus the target's Willpower. With success, you control their movements and actions for one turn per success. You can make them walk, speak, or perform simple actions — but you cannot make them use Force Powers or Abilities they don't already know. Each turn, the target may spend a Force Point to attempt a new resisted roll to break free. This is a dark side act.",
        skills: ['Rapport'],
        forcePointCost: true,
    },
    {
        id: 'suggestion',
        name: 'Suggestion (Jedi Mind Trick)',
        shortDescription: 'Implant a simple command in a weak mind',
        description:
            'The classic Jedi mind trick — you implant a simple suggestion into a target\'s mind. Spend 1 Force Point. Roll Rapport + Diplomacy versus the target\'s Willpower. The suggestion must be simple and believable: "These aren\'t the droids you\'re looking for," "You want to let us pass," "You never saw us." With 1 success the target follows the suggestion briefly. With 3 successes it sticks for several minutes. With 5+ successes the target may even rationalize their behavior afterward. Strong-willed targets or those expecting Jedi tricks gain +2 to their Willpower.',
        skills: ['Rapport'],
        forcePointCost: true,
    },
    {
        id: 'summon-object',
        name: 'Summon Object',
        shortDescription: 'Pull an object to your hand through the Force',
        description:
            "You reach out with the Force and pull a nearby object to your hand. Roll Dexterity + Telekinesis. The difficulty depends on the object's size and distance: 4 for a small object at arm's length, 6 for a lightsaber across a room, 8 for a heavy object at the edge of your range. If someone is holding the object, your roll is opposed by their Strength. If the object is fastened or secured, use Feats of Strength rules. The object flies to your hand at impressive speed.",
        skills: ['Telekinesis'],
        forcePointCost: false,
    },
    {
        id: 'transfer-life',
        name: 'Transfer Life',
        shortDescription: 'Transfer health levels between two beings',
        description:
            'You create a Force conduit between two beings to transfer life energy. Spend 1 Force Point. The donor rolls Control + Medicine (or Rapport + Medicine if they are the recipient). Each success transfers one Health level from the donor to the recipient. The donor takes Bashing damage equal to the transferred levels; the recipient heals Bashing or Lethal damage. The transfer requires touch and concentration. If the target is unwilling, they may resist with Willpower (difficulty 7).',
        skills: ['Control', 'Rapport'],
        forcePointCost: true,
    },
    {
        id: 'vanquish',
        name: 'Vanquish',
        shortDescription: 'Claim Force Points through domination',
        description:
            'The dark side answer to Meditate — you replenish your Force Points by dominating or destroying another being. When you kill a sentient being in combat or reduce them to utter submission, you may use this power. Roll a number of dice equal to 10 minus your current Dark Side Resistance (minimum 1 die). Each success steals one Force Point from the target and adds it to your current pool (up to your maximum). If the target has no Force Points remaining, each success restores one of your spent FP from the ambient energy of the act. This is an inherently dark side act and always triggers a Conscience roll.',
        skills: ['Dynamism'],
        forcePointCost: false,
    },
    {
        id: 'ventriloquism',
        name: 'Ventriloquism',
        shortDescription: 'Create auditory illusions with the Force',
        description:
            "You manipulate the Force to create convincing sounds — voices, footsteps, machinery, or any other noise. Roll Wits + Dynamism versus the target's Perception + Alertness. With 1 success you create simple sounds (a knock, a footstep). With 3 successes you create complex sounds (a conversation, a droid beeping). With 5+ successes you can throw your own voice to appear to come from elsewhere. The illusion persists for one turn per success. Observers who interact with the sound source may make a new Perception roll to detect the trick.",
        skills: ['Dynamism'],
        forcePointCost: false,
    },
];
