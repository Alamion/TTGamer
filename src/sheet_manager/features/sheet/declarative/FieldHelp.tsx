import { DocsPreviewLink } from '@site/src/shared/components/DocsFragmentCard';
import { createContext, type ReactNode, useContext } from 'react';

import { documentationFor } from '../../../components/controls/documentationFor';
import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import { useBriefPage } from './areaLayout';
import { elementHelpFor, type HelpNode } from './elementHelp';

const FieldHelpContext = createContext<{ docsPath: string; label: string } | undefined>(undefined);

/** The cell resolves help once; label slots only draw it. */
export function FieldHelpMark() {
    const help = useContext(FieldHelpContext);
    return help ? (
        <DocsPreviewLink
            docsPath={help.docsPath}
            label={documentationFor(help.label)}
            title={help.label}
            size="sm"
        />
    ) : null;
}

export function FieldHelpProvider({
    node,
    label,
    binding,
    children,
}: {
    node: HelpNode;
    label?: string;
    binding?: DocumentBindingDescriptor;
    children: ReactNode;
}) {
    const brief = useBriefPage();
    const ownPath = 'docsPath' in node ? node.docsPath : undefined;
    const hidden = 'hideHelp' in node && node.hideHelp;
    const docsPath = ownPath ?? (!brief && !hidden ? elementHelpFor(node, binding) : undefined);
    const title =
        label ??
        (node.type === 'list' || node.type === 'table' ? node.title : node.label) ??
        (node.type === 'primitive' ? node.bindingKey : '');
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

/** Collections without a caption keep the mark beside their existing first row. */
export function FieldHelpLayout({ label, children }: { label?: ReactNode; children: ReactNode }) {
    const help = useFieldHelpMark();
    return label ? (
        <div className="grid gap-1">
            <h3 className="text-sm font-semibold text-textPrimary">
                {label}
                {help}
            </h3>
            {children}
        </div>
    ) : help ? (
        <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">{children}</div>
            {help}
        </div>
    ) : (
        children
    );
}
