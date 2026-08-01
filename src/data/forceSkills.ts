export interface ForceSkillEntry {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    specialties: string[];
    scale: string[];
}

export const FORCE_SKILLS: ForceSkillEntry[] = [
    {
        id: 'control',
        name: 'Control',
        shortDescription: 'Allowing the Force to guide your body and actions',
        description:
            "The skill of surrendering your own instincts and reflexes to the Force. Control governs powers that affect the user's own physical body — healing, ignoring pain, enhancing physical prowess, and lightsaber combat. High Control represents a deep trust in the Force to move through you.",
        specialties: [
            'Centered',
            'Focused',
            'Calm',
            'Patient',
            'Serene',
            'Disciplined',
            'Unshakable',
            'One with the Force',
        ],
        scale: [
            'Faint connection — you sense the Force guiding your instincts in moments of crisis.',
            'Deliberate surrender — you can let the Force enhance your actions when you focus.',
            'Body-meld — you can heal, ignore pain, and enhance your physical capabilities.',
            'Mastery — advanced healing, resistance to harm, lightsaber combat flows through you.',
            'Transcendence — you sustain yourself beyond normal limits and act in perfect Flow.',
        ],
    },
    {
        id: 'dynamism',
        name: 'Dynamism',
        shortDescription: 'Manipulating intangible energy and the Force itself',
        description:
            'The skill of manipulating intangible energy — electricity, electromagnetic waves, heat, plasma, and even the Force itself. Dynamism governs containment of blaster bolts, Sith lightning, concealment, and meditation. It is the skill of shaping what cannot be touched.',
        specialties: [
            'Energetic',
            'Intense',
            'Bright',
            'Charged',
            'Resonant',
            'Volatile',
            'Steady',
            'Quiet',
        ],
        scale: [
            'Energy sensitivity — you sense energy fields, power sources, and Force flows around you.',
            'Containment — you can deflect blaster bolts and contain small energy discharges.',
            'Projection — you can generate energy (Sith lightning), conceal your presence, and meditate deeply.',
            'Mastery — powerful energy attacks, absorption of incoming energy, redirection.',
            'Grand scale — you can influence storms, reactor cores, and even Force nexuses themselves.',
        ],
    },
    {
        id: 'rapport',
        name: 'Rapport',
        shortDescription: 'Interacting with living beings through the Force',
        description:
            "The skill of interacting with other living beings through the Force. Rapport governs powers affecting minds and physiology: suggestion (Jedi mind tricks), calming beasts, reading thoughts, probing memories, and transferring life. It is the bridge between your consciousness and others'.",
        specialties: [
            'Empathetic',
            'Warm',
            'Gentle',
            'Understanding',
            'Commanding',
            'Persuasive',
            'Reassuring',
            'Penetrating',
        ],
        scale: [
            'Emotional sensitivity — you sense the feelings of those around you and detect lies.',
            'Influence — you can calm emotions and plant basic suggestions in weak minds.',
            'Mind interaction — you read surface thoughts, project your thoughts to others, and probe memories.',
            'Deep influence — you can dominate minds, transfer life force, and heal others.',
            'Transcendent bonds — you reshape minds, create lasting Force bonds, and commune across vast distances.',
        ],
    },
    {
        id: 'sense',
        name: 'Sense',
        shortDescription: 'Observing the universe through the Force',
        description:
            'The skill of observing the universe through the Force rather than your five senses. Sense governs powers of perception: awareness, clairvoyance, reading surface thoughts, danger sense, and lightsaber combat. It represents the ability to see what is hidden — past, present, and future.',
        specialties: [
            'Alert',
            'Perceptive',
            'Keen',
            'Intuitive',
            'Far-Sighted',
            'Watchful',
            'Attentive',
            'Visions',
        ],
        scale: [
            'Hunches — vague feelings about your surroundings and a subtle danger sense.',
            'Deliberate sensing — you extend your senses intentionally, basic clairvoyance at short range.',
            'Distant sight — you perceive events across distances, read surface thoughts, sense disturbances.',
            'Deep perception — you see through deception, sense hidden truths, and perceive past echoes.',
            'Universal awareness — you glimpse past, present, and future. Nothing is hidden from you.',
        ],
    },
    {
        id: 'telekinesis',
        name: 'Telekinesis',
        shortDescription: 'Moving objects with your mind',
        description:
            'The skill of moving objects with your mind. Telekinesis governs powers that manipulate objects from afar: crushing, heaving, summoning, and manipulating with precision or lethal force. It requires concentration and line of sight, and its power grows dramatically with each dot.',
        specialties: [
            'Precise',
            'Forceful',
            'Subtle',
            'Controlled',
            'Gentle',
            'Brutal',
            'Wide',
            'Fine',
        ],
        scale: [
            'Small objects — you can move coins, datapads, or lightsabers. Requires focused concentration.',
            'Medium objects — lift and throw objects up to your own body weight. Push enemies back.',
            'Heavy objects — hurl debris, crush targets, and levitate yourself or others briefly.',
            'Large objects — manipulate vehicles, throw heavy machinery, and exercise fine control.',
            'Massive objects — move starship-scale objects, create telekinetic barriers, crush walkers.',
        ],
    },
];
