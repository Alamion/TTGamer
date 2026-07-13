export interface ToolGearEntry {
    id: string;
    name: string;
    category: string;
    cost: string;
    effect: string;
    description: string;
}

export const TOOLS_GEAR: ToolGearEntry[] = [
    {
        id: 'first-aid-medpac',
        name: 'First Aid Medpac',
        category: 'Medical',
        cost: '100c',
        effect: '-1 difficulty to Medicine rolls',
        description:
            'A standard-issue emergency medical kit containing bacta spray, bandages, antiseptic, and basic surgical tools. Found in every military kit and civilian medbay across the galaxy. One-use — after the supplies are exhausted, the medpac is empty.',
    },
    {
        id: 'advanced-medpac',
        name: 'Advanced Medpac',
        category: 'Medical',
        cost: '500c',
        effect: '-2 difficulty to Medicine rolls',
        description:
            'A professional-grade medical kit with enhanced bacta compounds, diagnostic scanner, and micro-surgical tools. Used by field medics and shipboard surgeons. Contains enough supplies for three serious treatments before replacement is needed.',
    },
    {
        id: 'surgical-kit',
        name: 'Surgical Kit',
        category: 'Medical',
        cost: '2,000c',
        effect: '-2 difficulty to Surgery rolls; required for surgery',
        description:
            'A complete set of precision surgical instruments, bone fusers, and tissue regenerators. Required for any surgical procedure. Without a surgical kit, the difficulty of surgery increases by +3.',
    },
    {
        id: 'bacta-tank',
        name: 'Bacta Tank',
        category: 'Medical',
        cost: '10,000c',
        effect: 'Converts recovery time from days to hours',
        description:
            'A full immersion bacta tank that accelerates healing dramatically. The patient is suspended in bacta fluid while the tank monitors and regulates their recovery. Requires Medicine Knowledge of at least 3D to operate. Only one patient at a time. Once installed, it cannot be transported without complete disassembly.',
    },
    {
        id: 'infirmary',
        name: 'Infirmary',
        category: 'Medical',
        cost: '1,000c',
        effect: '-2 difficulty to Medicine rolls',
        description:
            'A stationary medical facility stocked with diagnostic equipment, surgical tools, and a pharmacy. Found on starships, military bases, and in settled communities. More comprehensive than a medpac but not portable.',
    },
    {
        id: 'hospital',
        name: 'Hospital',
        category: 'Medical',
        cost: '100,000c',
        effect: '-3 difficulty to Medicine rolls',
        description:
            'A full medical facility with operating theatres, intensive care, Bacta tanks, and specialist equipment. Found on developed worlds and major space stations. Provides the best possible environment for medical treatment outside of extraordinary circumstances.',
    },
    {
        id: 'basic-tool-set',
        name: 'Basic Tool Set',
        category: 'Tool Set',
        cost: '100c',
        effect: '-1 difficulty to Repair/Tech rolls',
        description:
            "A general-purpose toolkit containing spanners, hydrospanners, fusers, and diagnostic sensors. Enough for basic repairs on common equipment. Without a tool set, Repair and Tech rolls suffer a +2 difficulty penalty at the Storyteller's discretion.",
    },
    {
        id: 'advanced-tool-set-structural',
        name: 'Advanced Tool Set (Structural)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (structural specialty)',
        description:
            'A professional toolkit specialized for structural repairs — hull plating, load-bearing frames, construction materials. One of six advanced specialties. Each advanced set covers only its specialty; using it outside its field grants no bonus.',
    },
    {
        id: 'advanced-tool-set-propulsion',
        name: 'Advanced Tool Set (Propulsion)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (propulsion specialty)',
        description:
            'A professional toolkit specialized for propulsion systems — ion engines, hyperdrives, repulsorlifts, thruster assemblies. One of six advanced specialties.',
    },
    {
        id: 'advanced-tool-set-droid-cybernetic',
        name: 'Advanced Tool Set (Droid & Cybernetic)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (droid/cybernetic specialty)',
        description:
            'A professional toolkit specialized for droid repair and cybernetic installation. Contains micro-manipulators, logic probe, and interface cables. One of six advanced specialties.',
    },
    {
        id: 'advanced-tool-set-computer',
        name: 'Advanced Tool Set (Computer)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (computer specialty)',
        description:
            'A professional toolkit specialized for computer systems, slicing, and datacore repairs. Contains diagnostic software suites, interface splices, and code-breaking modules. One of six advanced specialties.',
    },
    {
        id: 'advanced-tool-set-energy-field',
        name: 'Advanced Tool Set (Energy Field)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (energy field specialty)',
        description:
            'A professional toolkit specialized for shields, power generators, and energy field projectors. Contains field calibrators and emission scanners. One of six advanced specialties.',
    },
    {
        id: 'advanced-tool-set-weapons',
        name: 'Advanced Tool Set (Weapons)',
        category: 'Tool Set',
        cost: '1,000c',
        effect: '-2 difficulty to Repair/Tech rolls (weapons specialty)',
        description:
            'A professional toolkit specialized for blasters, missile launchers, and mounted weapons. Contains barrel alignment tools, power cell testers, and calibration targets. One of six advanced specialties.',
    },
    {
        id: 'complete-workshop',
        name: 'Complete Workshop',
        category: 'Tool Set',
        cost: '10,000c',
        effect: '-3 difficulty to all Repair/Tech rolls',
        description:
            'A fully equipped workshop covering all six specialties — structural, propulsion, droid & cybernetic, computer, energy field, and weapons. Stationary. Can fabricate simple parts if raw materials are available.',
    },
    {
        id: 'security-kit',
        name: 'Security Kit',
        category: 'Security',
        cost: '200c',
        effect: '-1 difficulty to Security/Slicing rolls',
        description:
            'A lockpick set, codebreaker, and electronic bypass tools. Allows a character to attempt to open locked doors, disable alarms, and slice security systems. Without a security kit, the difficulty of such tasks increases by +2.',
    },
    {
        id: 'slicer-kit',
        name: 'Slicer Kit',
        category: 'Security',
        cost: '800c',
        effect: '-2 difficulty to Slicing rolls; requires Computer specialty',
        description:
            'An advanced computer slicing rig with decryption modules, code-breaking algorithms, and a dedicated processing unit. Can interface with most standard computer systems. Requires Computer Knowledge to operate effectively.',
    },
    {
        id: 'comlink-short-range',
        name: 'Comlink (Short-Range)',
        category: 'Communication',
        cost: '200c',
        effect: 'Planetary-range communication',
        description:
            "A compact wrist- or belt-mounted communication device capable of transmitting voice and basic data across a planet's surface. Standard galaxy-issue — almost every traveler carries one. Can be tapped or jammed with appropriate equipment.",
    },
    {
        id: 'comlink-long-range',
        name: 'Comlink (Long-Range)',
        category: 'Communication',
        cost: '1,000c',
        effect: 'System-wide communication; can reach orbiting ships',
        description:
            "A larger, more powerful comlink with a boosted transmitter and directional antenna. Can reach low orbit, allowing communication with ships in a planet's vicinity. Often built into starships, bases, and ground vehicles.",
    },
    {
        id: 'holoprojector',
        name: 'Holoprojector',
        category: 'Communication',
        cost: '800c',
        effect: 'Projects 3D holographic images and communications',
        description:
            'A device that captures and projects three-dimensional holographic images. Used for communication (holographic calls), navigation (terrain projection), and tactical planning. Portable versions are briefcase-sized.',
    },
    {
        id: 'glow-rod',
        name: 'Glow Rod',
        category: 'Utility',
        cost: '25c',
        effect: 'Illuminates 10m radius for 6 hours',
        description:
            'A simple handheld light source. Emits a steady, adjustable glow that illuminates a 10-meter radius. Powered by a small energy cell that lasts for 6 hours of continuous use. Waterproof and durable.',
    },
    {
        id: 'macrobinoculars',
        name: 'Macrobinoculars',
        category: 'Utility',
        cost: '500c',
        effect: '×50 magnification; includes range-finder and low-light mode',
        description:
            'Electro-optical binoculars with 50× magnification, integrated range-finder, and low-light amplification. Standard equipment for scouts, rangers, and anyone who needs to see a long way. Can record still images and short video clips.',
    },
    {
        id: 'datapad',
        name: 'Datapad',
        category: 'Utility',
        cost: '300c',
        effect: 'Personal computing device; stores and processes data',
        description:
            'A ubiquitous personal computing device used for data storage, communication, navigation, and entertainment. Most datapads are touch-screen tablets with wireless connectivity. Found in every corner of the galaxy from Core Worlds to the Outer Rim.',
    },
    {
        id: 'climbing-gear',
        name: 'Climbing Gear',
        category: 'Utility',
        cost: '200c',
        effect: '-1 difficulty to Athletics (climbing) rolls',
        description:
            'A harness, grapnel, 30m of durasteel cable, and pitons. Essential equipment for scaling cliffs, buildings, or starship hulls. Without climbing gear, the difficulty of climbing tasks increases by +2.',
    },
    {
        id: 'liquid-cable-dispenser',
        name: 'Liquid Cable Dispenser',
        category: 'Utility',
        cost: '400c',
        effect: 'Fires adhesive cable up to 20m; supports 200kg',
        description:
            'A wrist-mounted device that fires a quick-hardening liquid cable. The cable adheres to most surfaces and can support up to 200kg. Useful for rappelling, securing equipment, or creating emergency restraints. The dispenser holds enough liquid for 5 uses.',
    },
    {
        id: 'breath-mask',
        name: 'Breath Mask / Filter',
        category: 'Utility',
        cost: '100c',
        effect: 'Filters toxins, smoke, and particulate. 2 hours of oxygen.',
        description:
            'A compact respiratory aid that filters airborne toxins, smoke, and particulate matter. Provides 2 hours of emergency oxygen in vacuum or thin atmospheres. Standard in emergency kits and on ships not equipped with full life support.',
    },
    {
        id: 'power-pack-spare',
        name: 'Power Pack (Spare)',
        category: 'Utility',
        cost: '50c',
        effect: 'Replacement blaster power cell',
        description:
            'A standard blaster power pack. Used as a replacement for depleted power cells in blaster pistols and rifles. Always carry spares — a blaster without power is just a very expensive club.',
    },
    {
        id: 'tool-kit-parts',
        name: 'Tool Kit (Misc. Spare Parts)',
        category: 'Utility',
        cost: '75c/week',
        effect: 'Consumable parts for field repairs',
        description:
            'A collection of common spare parts — capacitors, fuses, wiring, connectors, and fasteners. Used as consumable materials for Repair and Tech rolls. One kit provides enough parts for one week of field repairs. Without spare parts, the Storyteller may increase repair difficulty.',
    },
    {
        id: 'fusion-lantern',
        name: 'Fusion Lantern',
        category: 'Utility',
        cost: '150c',
        effect: 'Powerful area light; 50m radius. Lasts 200 hours.',
        description:
            'A portable fusion-powered area light producing enough illumination to light a small camp. Output is adjustable from dim night-vision-safe to bright work-light. Powers small tools via integrated power socket. Rugged and reliable.',
    },
    {
        id: 'electrobinoculars',
        name: 'Electrobinoculars',
        category: 'Utility',
        cost: '750c',
        effect: '×100 magnification; thermal, night-vision, and tracking modes',
        description:
            'Advanced electro-optical binoculars with 100× magnification, multi-spectrum imaging (thermal, night-vision, electromagnetic), target tracking, and integrated range-finder. Military-grade optics used by scouts, snipers, and forward observers.',
    },
    {
        id: 'scanner-detector',
        name: 'Multi-Scanner',
        category: 'Utility',
        cost: '600c',
        effect: 'Detects energy signatures, life forms, and movement (100m range)',
        description:
            'A handheld sensor suite that detects energy emissions, life form bio-signs, and movement within a 100m radius. Can be tuned to filter out specific signatures or search for particular energy types. Essential equipment for scouts, bounty hunters, and salvage operators.',
    },
    {
        id: 'binders',
        name: 'Binders / Stun Cuffs',
        category: 'Security',
        cost: '50c',
        effect: 'Restrains humanoid targets; diff 8 to escape',
        description:
            'Standard restraining cuffs used by law enforcement and military across the galaxy. Made of durasteel alloy with a magnetic lock. Escaping requires a Dexterity + Athletics roll at difficulty 8 (or a Security Tools roll at difficulty 6).',
    },
];
