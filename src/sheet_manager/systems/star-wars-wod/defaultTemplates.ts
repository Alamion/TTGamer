import type { CustomTemplate } from '../../types/template';
import { starWarsCharacterTemplates } from './templates/character';
import { starWarsCreatureTemplates } from './templates/creature';
import { starWarsFodderTemplates } from './templates/fodder';
import { starWarsVehicleTemplates } from './templates/vehicle';

/** All shipped Star Wars default templates (one module per document kind under `templates/`). */
export const starWarsWodDefaultTemplates: readonly CustomTemplate[] = [
    ...starWarsCharacterTemplates,
    ...starWarsCreatureTemplates,
    ...starWarsVehicleTemplates,
    ...starWarsFodderTemplates,
];
