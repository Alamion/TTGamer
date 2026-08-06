import type { AccentColor } from '../../../components';
import { CollapsibleBlock, SectionCard } from '../../../components';
import { ArmorSection } from './ArmorSection';
import { HealthBlock } from './HealthBlock.tsx';
import { ImplantsSection } from './ImplantsSection';
import { InventorySection } from './InventorySection';
import { useBodyHandlers } from './useBodyHandlers';
import { WeaponsSection } from './WeaponsSection';

interface SectionState {
    inventory: boolean;
    armor: boolean;
    weapons: boolean;
    implants: boolean;
}

interface BodyBlockProps {
    accentColor?: AccentColor;
}

export function BodyBlock({ accentColor = 'primary' }: BodyBlockProps) {
    const handlers = useBodyHandlers();

    if (!handlers) return null;

    const renderCollapsibleSection = (
        section: keyof SectionState,
        title: string,
        content: React.ReactNode,
        docsPath?: string
    ) => (
        <SectionCard title={title} storageKey={`bodyBlock_${section}`} docsPath={docsPath}>
            {content}
        </SectionCard>
    );

    const INVENTORY_DOCS = '/docs/star-wars-wod-2e/equipment#tools-gear';
    const ARMOR_DOCS = '/docs/star-wars-wod-2e/equipment#armor';
    const WEAPONS_DOCS = '/docs/star-wars-wod-2e/equipment#weapons';
    const IMPLANTS_DOCS = '/docs/star-wars-wod-2e/equipment#cybernetics';
    const HEALTH_DOCS = '/docs/star-wars-wod-2e/combat/health-damage-heal#the-health-track';

    return (
        <CollapsibleBlock
            title="Body"
            accentColor={accentColor}
            storageKey="bodyBlock"
            docsPath="/docs/star-wars-wod-2e/equipment"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                    {renderCollapsibleSection(
                        'inventory',
                        'Inventory',
                        <InventorySection
                            items={handlers.inventory}
                            readOnly={handlers.readOnly}
                            onAdd={handlers.addInventoryItem}
                            onRemove={handlers.removeInventoryItem}
                            onUpdate={handlers.updateInventoryItem}
                            onCatalogSelect={handlers.handleInventoryCatalogSelect}
                        />,
                        INVENTORY_DOCS
                    )}

                    {renderCollapsibleSection(
                        'armor',
                        'Dressed - Armor',
                        <ArmorSection
                            items={handlers.armor}
                            readOnly={handlers.readOnly}
                            onAdd={handlers.addArmorItem}
                            onRemove={handlers.removeArmorItem}
                            onUpdate={handlers.updateArmorItem}
                            onCatalogSelect={handlers.handleArmorCatalogSelect}
                        />,
                        ARMOR_DOCS
                    )}

                    {renderCollapsibleSection(
                        'weapons',
                        'Dressed - Weapons',
                        <WeaponsSection
                            items={handlers.weapons}
                            readOnly={handlers.readOnly}
                            onAdd={handlers.addWeaponItem}
                            onRemove={handlers.removeWeaponItem}
                            onUpdate={handlers.updateWeaponItem}
                            onCatalogSelect={handlers.handleWeaponCatalogSelect}
                        />,
                        WEAPONS_DOCS
                    )}

                    {renderCollapsibleSection(
                        'implants',
                        'Implants & Cyberware',
                        <ImplantsSection
                            items={handlers.implants}
                            readOnly={handlers.readOnly}
                            onAdd={handlers.addImplantItem}
                            onRemove={handlers.removeImplantItem}
                            onUpdate={handlers.updateImplantItem}
                            onCatalogSelect={handlers.handleImplantCatalogSelect}
                        />,
                        IMPLANTS_DOCS
                    )}
                </div>

                <HealthBlock docsPath={HEALTH_DOCS} />
            </div>
        </CollapsibleBlock>
    );
}
