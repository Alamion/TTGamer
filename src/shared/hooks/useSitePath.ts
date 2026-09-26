import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/** Site-relative path under the current locale's base URL (`/ru/...` in the Russian build). */
export function useSitePath(): (path: string) => string {
    const baseUrl = useDocusaurusContext().siteConfig.baseUrl ?? '/';
    return (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`;
}
