import { testLocale } from './testLocale';

export default function useDocusaurusContext() {
    return { i18n: { currentLocale: testLocale() }, siteConfig: {}, globalData: {} };
}
