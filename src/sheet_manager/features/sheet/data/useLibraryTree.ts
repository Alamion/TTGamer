import { useMemo } from 'react';

import { documentRefs } from '../../../store/documentIndex';
import { useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { systemRegistry } from '../../../systems';
import { buildLibraryTree, countDocuments } from './libraryTree';

/** The library tree of the current stores, rebuilt when one of them changes. */
export function useLibraryTree() {
    const types = useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    const defaultPages = useDocumentTypeStore((state) => state.defaultPages);
    const catalogs = useDocumentTypeStore((state) => state.catalogs);
    const templates = useTemplateStore((state) => state.templates);
    const defaultOverrides = useTemplateStore((state) => state.defaultOverrides);
    const entries = useDocumentStore((state) => state.entries);
    const counts = useMemo(() => countDocuments(documentRefs(entries)), [entries]);
    return useMemo(
        () =>
            buildLibraryTree({
                registry: systemRegistry,
                types,
                settings,
                templates,
                defaultOverrides,
                defaultPages,
                counts,
                catalogs,
            }),
        [types, settings, templates, defaultOverrides, defaultPages, counts, catalogs]
    );
}
