import { translate } from '@docusaurus/Translate';

import { systemRegistry } from '../../systems';
import { kindLabel, kindSettingLabel } from '../sheet/data/documentLabels';
import type { DocumentLabeler } from './query';
import { entryTitle } from './rows';

/** The labels the documents window searches, filters, and sorts by (the registry's names). */
export const documentLabeler: DocumentLabeler = {
    kind: kindLabel,
    setting: kindSettingLabel,
    system: (systemId) => {
        const system = systemRegistry.getSystem(systemId);
        return system ? translate(system.label) : systemId;
    },
    title: entryTitle,
};

/** A system's short badge and its full name (documents window rows, spec 045). */
export function systemBadge(systemId: string): { badge: string; name: string } {
    const system = systemRegistry.getSystem(systemId);
    if (!system) return { badge: systemId, name: systemId };
    return { badge: translate(system.badge ?? system.label), name: translate(system.label) };
}
