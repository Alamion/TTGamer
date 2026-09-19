import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/** The reader's Docusaurus locale (`en`, `ru`…). */
export function useLocale(): string {
    return useDocusaurusContext().i18n.currentLocale;
}
