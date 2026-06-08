export interface SoundManagerConfig {
    enabled: boolean;
    volume: number;
    speedThreshold?: number;
}

interface SurfaceSoundMap {
    [surface: string]: HTMLAudioElement[];
}

interface DieSoundMap {
    [material: string]: HTMLAudioElement[];
}

const SURFACE_SOUND_COUNTS: Record<string, number> = {
    felt: 7,
    wood_table: 7,
    wood_tray: 7,
    metal: 9,
};

const DIE_MATERIAL_SOUND_COUNTS: Record<string, number> = {
    coin: 6,
    metal: 12,
    plastic: 15,
    wood: 12,
};

const DIE_SURFACE = 'felt';
const DIE_MATERIAL = 'plastic';

import { warn } from '../../utils/logging';

const SOUND_DELAY_MS = 10;

function getExtensionSoundsBaseUrl(): string {
    return '/sounds/';
}

function loadAudio(src: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => resolve(audio);
        audio.crossOrigin = 'anonymous';
        audio.src = src;
        audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
    });
}

export class SoundManager {
    private enabled: boolean;
    private volume: number;
    private speedThreshold: number;
    private baseUrl: string;
    private surfaceSounds: SurfaceSoundMap = {};
    private dieSounds: DieSoundMap = {};
    private loaded = false;

    private lastSoundStep = -1;
    private lastSoundTime = 0;
    private lastSoundType = '';

    constructor(config?: Partial<SoundManagerConfig>) {
        this.enabled = config?.enabled ?? true;
        this.volume = config?.volume ?? 80;
        this.speedThreshold = config?.speedThreshold ?? 250;
        this.baseUrl = getExtensionSoundsBaseUrl();
    }

    async init(): Promise<void> {
        if (this.loaded) return;
        try {
            await Promise.all([
                this.loadSurfaceSounds(DIE_SURFACE),
                this.loadDieMaterialSounds('coin'),
                this.loadDieMaterialSounds(DIE_MATERIAL),
            ]);
            this.loaded = true;
        } catch {
            warn('Sound init failed — no collision audio will play', '3DDiceRolls');
            this.loaded = false;
        }
    }

    private async loadSurfaceSounds(surface: string): Promise<void> {
        if (this.surfaceSounds[surface]) return;
        const count = SURFACE_SOUND_COUNTS[surface];
        if (!count) return;

        const clips: HTMLAudioElement[] = [];
        for (let s = 1; s <= count; s++) {
            try {
                const clip = await loadAudio(`${this.baseUrl}surfaces/surface_${surface}${s}.mp3`);
                clips.push(clip);
            } catch {
                // skip individual sound load failures
            }
        }
        if (clips.length > 0) {
            this.surfaceSounds[surface] = clips;
        }
    }

    private async loadDieMaterialSounds(material: string): Promise<void> {
        if (this.dieSounds[material]) return;
        const count = DIE_MATERIAL_SOUND_COUNTS[material];
        if (!count) return;

        const clips: HTMLAudioElement[] = [];
        for (let s = 1; s <= count; s++) {
            try {
                const clip = await loadAudio(`${this.baseUrl}dicehit/dicehit_${material}${s}.mp3`);
                clips.push(clip);
            } catch {
                // skip
            }
        }
        if (clips.length > 0) {
            this.dieSounds[material] = clips;
        }
    }

    onCollide(event: {
        body: {
            mass: number;
            velocity: { length(): number };
            world: { stepnumber: number };
            diceShape?: string;
        };
        target: { velocity: { length(): number } };
    }): void {
        if (!this.enabled || !this.loaded) return;
        if (this.volume <= 0) return;

        const now = Date.now();
        const stepNumber = (event.body as unknown as { world: { stepnumber: number } }).world
            .stepnumber;

        const currentSoundType = event.body.mass > 0 ? 'dice' : 'table';

        if (
            (this.lastSoundStep === stepNumber || this.lastSoundTime > now) &&
            currentSoundType !== 'dice'
        )
            return;
        if (
            (this.lastSoundStep === stepNumber || this.lastSoundTime > now) &&
            currentSoundType === 'dice' &&
            this.lastSoundType === 'dice'
        )
            return;

        if (event.body.mass > 0) {
            const speed = event.body.velocity.length();
            if (speed < this.speedThreshold) return;

            let sound: HTMLAudioElement | undefined;
            const diceShape = (event.body as { diceShape?: string }).diceShape;
            if (diceShape === 'd2' && this.dieSounds['coin']?.length) {
                sound =
                    this.dieSounds['coin'][
                        Math.floor(Math.random() * this.dieSounds['coin'].length)
                    ];
            } else if (this.dieSounds[DIE_MATERIAL]?.length) {
                sound =
                    this.dieSounds[DIE_MATERIAL][
                        Math.floor(Math.random() * this.dieSounds[DIE_MATERIAL].length)
                    ];
            }

            if (sound) {
                sound.volume = Math.min(speed / 8000, this.volume / 100);
                sound.play().catch(() => {});
            }
            this.lastSoundType = 'dice';
        } else {
            const speed = event.target.velocity.length();
            if (speed < this.speedThreshold) return;

            const list = this.surfaceSounds[DIE_SURFACE];
            if (list?.length) {
                const sound = list[Math.floor(Math.random() * list.length)];
                sound.volume = Math.min(speed / 8000, this.volume / 100);
                sound.play().catch(() => {});
            }
            this.lastSoundType = 'table';
        }

        this.lastSoundStep = stepNumber;
        this.lastSoundTime = now + SOUND_DELAY_MS;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(100, volume));
    }

    get isLoaded(): boolean {
        return this.loaded;
    }

    dispose(): void {
        this.surfaceSounds = {};
        this.dieSounds = {};
        this.loaded = false;
    }
}
