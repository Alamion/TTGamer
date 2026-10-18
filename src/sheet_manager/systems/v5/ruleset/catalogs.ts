import { anyCatalog, defineCatalog } from '../../catalogs';
import { V5_SKILL_GROUPS } from './profile';

export const V5_SKILLS_CATALOG_ID = 'v5-skills';

/**
 * The 27 V5 skills as a catalog (spec 040 D3): Storyteller characters' exceptional pools suggest
 * them. Each entry names the sheet's own skill label (`nameMessage`), so the catalog adds no
 * translation source; the catalog registry translates it.
 */
const skills = V5_SKILL_GROUPS.flatMap((group) =>
    group.traits.map((trait) => ({
        id: trait.key,
        name: trait.label.message,
        nameMessage: trait.label,
    }))
);

export const v5RulesetCatalogs = [anyCatalog(defineCatalog(V5_SKILLS_CATALOG_ID, skills, []))];
