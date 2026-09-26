import { testLocale } from './testLocale';

export default function useDocusaurusContext() {
    const locale = testLocale();
    // Like the real site: each non-default locale is built under its own base URL.
    const baseUrl = locale === 'en' ? '/' : `/${locale}/`;
    return { i18n: { currentLocale: locale }, siteConfig: { baseUrl }, globalData: {} };
}
