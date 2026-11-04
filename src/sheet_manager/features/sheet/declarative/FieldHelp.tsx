import { DocsPreviewLink } from '@site/src/shared/components/DocsFragmentCard';
import { createContext, type ReactNode, useContext } from 'react';

import { documentationFor } from '../../../components/controls/documentationFor';
import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type { PrimitiveNode, TemplateField } from '../../../types/template';
import { useBriefPage } from './areaLayout';
import { elementHelpFor } from './elementHelp';

const FieldHelpContext = createContext<{ docsPath: string; label: string } | undefined>(undefined);

/** The cell resolves help once; label slots only draw it. */
export function FieldHelpMark() {
    const help = useContext(FieldHelpContext);
    return help ? (
        <DocsPreviewLink
            docsPath={help.docsPath}
            label={documentationFor(help.label)}
            title={help.label}
        />
    ) : null;
}

export function FieldHelpProvider({
    node,
    label,
    binding,
    children,
}: {
    node: TemplateField | PrimitiveNode;
    label?: string;
    binding?: DocumentBindingDescriptor;
    children: ReactNode;
}) {
    const brief = useBriefPage();
    const docsPath =
        node.docsPath ?? (!brief && !node.hideHelp ? elementHelpFor(node, binding) : undefined);
    const title = label ?? node.label ?? (node.type === 'primitive' ? node.bindingKey : '');
    return (
        <FieldHelpContext.Provider value={docsPath ? { docsPath, label: title } : undefined}>
            {children}
        </FieldHelpContext.Provider>
    );
}

/** An absent slot must stay absent for controls whose layout depends on having a label. */
export function useFieldHelpMark(): ReactNode {
    const help = useContext(FieldHelpContext);
    return help ? <FieldHelpMark /> : undefined;
}
