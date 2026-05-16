declare module '@theme/Layout' {
    import type { ReactNode } from 'react';

    export interface Props {
        readonly children?: ReactNode;
        readonly title?: string;
        readonly description?: string;
        readonly noFooter?: boolean;
        readonly wrapperClassName?: string;
        readonly searchMetadatas?: Record<string, unknown>;
    }
    export default function Layout(props: Props): ReactNode;
}

declare module '@theme/Heading' {
    import type { ComponentProps, ReactNode } from 'react';

    export type Props = ComponentProps<'h1'> & {
        readonly as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    };
    export default function Heading(props: Props): ReactNode;
}
