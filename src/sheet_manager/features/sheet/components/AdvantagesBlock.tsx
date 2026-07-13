import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { CustomTraitList, MeritFlawList } from '../../../components';
import type { CatalogEntry } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import type { Background, MeritFlawItem } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';
import { MERITS_FLAWS } from '@site/src/data/meritsFlawsData';
import type { MeritFlawEntry } from '@site/src/data/meritsFlawsData';
import { BACKGROUNDS } from '@site/src/data/backgroundsData';
import type { BackgroundEntry } from '@site/src/data/backgroundsData';

interface AdvantagesBlockProps {
    accentColor?: AccentColor;
}

export function AdvantagesBlock({ accentColor = 'primary' }: AdvantagesBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const backgrounds = character.backgrounds ?? [];
    const merits = character.merits ?? [];
    const flaws = character.flaws ?? [];

    const meritsCatalog: CatalogEntry[] = MERITS_FLAWS.filter((e) => e.type === 'Merit').map(
        (e: MeritFlawEntry) => ({ id: e.id, name: e.name, subtitle: e.shortDescription })
    );
    const flawsCatalog: CatalogEntry[] = MERITS_FLAWS.filter((e) => e.type === 'Flaw').map(
        (e: MeritFlawEntry) => ({ id: e.id, name: e.name, subtitle: e.shortDescription })
    );
    const backgroundsCatalog: CatalogEntry[] = BACKGROUNDS.map((e: BackgroundEntry) => ({
        id: e.id,
        name: e.name,
        subtitle: e.shortDescription,
    }));

    const addBackground = () => {
        if (readOnly) return;
        const newBackground: Background = { id: generateId(), label: '', value: 0 };
        updateCharacter(character.id, {
            backgrounds: [...backgrounds, newBackground],
        });
    };

    const removeBackground = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            backgrounds: backgrounds.filter((b) => b.id !== id),
        });
    };

    const updateBackground = (id: string, value: number, label?: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            backgrounds: backgrounds.map((b) =>
                b.id === id ? { ...b, value: value, label: label ?? b.label } : b
            ),
        });
    };

    const addMerit = () => {
        if (readOnly) return;
        const newMerit: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(character.id, {
            merits: [...merits, newMerit],
        });
    };

    const removeMerit = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            merits: merits.filter((m) => m.id !== id),
        });
    };

    const updateMerit = (id: string, points: number, label: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            merits: merits.map((m) => (m.id === id ? { ...m, points, label } : m)),
        });
    };

    const addFlaw = () => {
        if (readOnly) return;
        const newFlaw: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(character.id, {
            flaws: [...flaws, newFlaw],
        });
    };

    const removeFlaw = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            flaws: flaws.filter((f) => f.id !== id),
        });
    };

    const updateFlaw = (id: string, points: number, label: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            flaws: flaws.map((f) => (f.id === id ? { ...f, points, label } : f)),
        });
    };

    const handleMeritCatalogSelect = (id: string, entry: CatalogEntry) => {
        if (readOnly) return;
        const catalogEntry = MERITS_FLAWS.find((e) => e.id === entry.id);
        updateCharacter(character.id, {
            merits: merits.map((m) =>
                m.id === id
                    ? {
                          ...m,
                          catalogId: entry.id,
                          label: entry.name,
                          points: catalogEntry?.cost ?? m.points,
                      }
                    : m
            ),
        });
    };

    const handleFlawCatalogSelect = (id: string, entry: CatalogEntry) => {
        if (readOnly) return;
        const catalogEntry = MERITS_FLAWS.find((e) => e.id === entry.id);
        updateCharacter(character.id, {
            flaws: flaws.map((f) =>
                f.id === id
                    ? {
                          ...f,
                          catalogId: entry.id,
                          label: entry.name,
                          points: catalogEntry?.cost ?? f.points,
                      }
                    : f
            ),
        });
    };

    const handleBackgroundCatalogSelect = (id: string, entry: CatalogEntry) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            backgrounds: backgrounds.map((b) =>
                b.id === id ? { ...b, catalogId: entry.id, label: entry.name } : b
            ),
        });
    };

    return (
        <CollapsibleBlock title="Advantages" accentColor={accentColor} storageKey="advantagesBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard
                    title="Backgrounds"
                    docsPath="/docs/star-wars-wod-2e/character/backgrounds"
                >
                    <CustomTraitList
                        items={backgrounds}
                        disabled={readOnly}
                        onAdd={addBackground}
                        onRemove={removeBackground}
                        onChange={(id, val) => updateBackground(id, val)}
                        onLabelChange={(id, label) => updateBackground(id, 0, label)}
                        size="md"
                        placeholder="Background name..."
                        catalog={backgroundsCatalog}
                        onCatalogSelect={handleBackgroundCatalogSelect}
                    />
                </SectionCard>

                <MeritFlawList
                    title="Merits"
                    items={merits}
                    disabled={readOnly}
                    onAdd={addMerit}
                    onRemove={removeMerit}
                    onChange={updateMerit}
                    isMerit={true}
                    docsPath="/docs/star-wars-wod-2e/character/merits-flaws"
                    catalog={meritsCatalog}
                    onCatalogSelect={handleMeritCatalogSelect}
                />

                <MeritFlawList
                    title="Flaws"
                    items={flaws}
                    disabled={readOnly}
                    onAdd={addFlaw}
                    onRemove={removeFlaw}
                    onChange={updateFlaw}
                    isMerit={false}
                    docsPath="/docs/star-wars-wod-2e/character/merits-flaws"
                    catalog={flawsCatalog}
                    onCatalogSelect={handleFlawCatalogSelect}
                />
            </div>
        </CollapsibleBlock>
    );
}
