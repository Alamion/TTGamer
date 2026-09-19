import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import type { ReactNode } from 'react';

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    const version = String(siteConfig.customFields?.version);
    return (
        <header className="relative overflow-hidden border-b-2 border-primary/40 bg-gradient-to-b from-bgSurface to-bgBase">
            <div className="absolute inset-0 opacity-5">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(0deg, transparent, transparent 49px, rgb(var(--primary) / 0.15) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgb(var(--primary) / 0.15) 50px)',
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>
            <div className="relative container mx-auto px-4 py-16 md:py-24">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded border border-jedi-green/40 bg-jedi-green/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-jedi-green">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-jedi-green" />
                        {translate(uiMessages.site.home.hero.status, { version })}
                    </div>
                    <Heading
                        as="h1"
                        className="mb-4 text-4xl font-black uppercase tracking-tight text-textPrimary md:text-6xl"
                    >
                        {siteConfig.title}
                    </Heading>
                    <p className="mb-8 max-w-2xl text-lg font-medium text-textSecondary md:text-xl">
                        {translate(uiMessages.site.home.hero.tagline)}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            className="inline-flex items-center justify-center gap-2 rounded border-2 border-primary bg-primary px-8 py-3 font-bold uppercase tracking-wider text-on-primary shadow-lg transition-all duration-200 hover:bg-primary-hover hover:shadow-xl active:scale-95"
                            to="/universal_sheet"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                <path d="M14 2v6h6" />
                                <path d="M12 18v-6" />
                                <path d="M9 15h6" />
                            </svg>
                            {translate(uiMessages.site.home.hero.characterSheet)}
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center gap-2 rounded border-2 border-border bg-bgSurface px-8 py-3 font-bold uppercase tracking-wider text-textPrimary shadow transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-95"
                            to="/docs/star-wars-wod-2e/quick-start"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                            {translate(uiMessages.site.home.hero.quickStart)}
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    href,
    badge,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    href: string;
    badge?: string;
}) {
    return (
        <Link
            to={href}
            className="group block h-full rounded border border-border bg-bgSurface p-6 shadow transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/20">
                {icon}
            </div>
            <Heading
                as="h3"
                className="mb-2 text-lg font-bold uppercase tracking-wide text-textPrimary"
            >
                {title}
                {badge && (
                    <span className="ml-2 rounded bg-droid-gold/20 px-2 py-0.5 text-xs font-mono text-droid-gold">
                        {badge}
                    </span>
                )}
            </Heading>
            <p className="text-sm leading-relaxed text-textSecondary">{description}</p>
        </Link>
    );
}

export default function Home(): ReactNode {
    const { siteConfig } = useDocusaurusContext();
    const version = String(siteConfig.customFields?.version);

    return (
        <Layout
            title={translate(uiMessages.site.home.meta.pageTitle)}
            description={translate(uiMessages.site.home.meta.pageDescription)}
        >
            <div className="tailwind-root">
                <HomepageHeader />
                <main className="container mx-auto px-4 py-12">
                    <div className="mb-12 text-center">
                        <Heading
                            as="h2"
                            className="mb-2 text-2xl font-bold uppercase tracking-wide text-textPrimary"
                        >
                            {translate(uiMessages.site.home.features.heading)}
                        </Heading>
                        <div className="mx-auto h-1 w-16 bg-primary" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon={
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            }
                            title={translate(uiMessages.site.home.features.characterSheet.title)}
                            description={translate(
                                uiMessages.site.home.features.characterSheet.summary
                            )}
                            href="/universal_sheet"
                        />
                        <FeatureCard
                            icon={
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            }
                            title={translate(uiMessages.site.home.features.diceRoller.title)}
                            description={translate(
                                uiMessages.site.home.features.diceRoller.summary
                            )}
                            href="/docs/star-wars-wod-2e/core-rules/dice-pools"
                        />
                        <FeatureCard
                            icon={
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    <path d="M2 12h20" />
                                </svg>
                            }
                            title={translate(uiMessages.site.home.features.documentation.title)}
                            description={translate(
                                uiMessages.site.home.features.documentation.summary
                            )}
                            href="/docs/star-wars-wod-2e/"
                        />
                    </div>

                    <div className="mt-16 rounded border border-border bg-bgSurface p-8 shadow">
                        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                            <div className="flex-1">
                                <Heading
                                    as="h3"
                                    className="mb-2 text-xl font-bold uppercase tracking-wide text-textPrimary"
                                >
                                    {translate(uiMessages.site.home.about.title)}
                                </Heading>
                                <p className="text-textSecondary">
                                    <Translate
                                        id={uiMessages.site.home.about.body.id}
                                        values={{
                                            weg: (
                                                <strong className="text-textPrimary">
                                                    Star Wars WEG
                                                </strong>
                                            ),
                                            wod: (
                                                <strong className="text-textPrimary">
                                                    {translate(
                                                        uiMessages.site.home.about.worldOfDarkness
                                                    )}
                                                </strong>
                                            ),
                                        }}
                                    >
                                        {uiMessages.site.home.about.body.message}
                                    </Translate>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 rounded border border-droid-gold/30 bg-droid-gold/5 p-4 text-center">
                        <p className="text-sm font-mono text-textSecondary">
                            <span className="text-droid-gold">
                                {translate(uiMessages.site.home.status.live)}
                            </span>{' '}
                            ttgamer.vercel.app{' '}
                            <span className="mx-2 text-border-more-contrast">|</span>{' '}
                            <span className="text-primary">v{version}</span>{' '}
                            <span className="mx-2 text-border-more-contrast">|</span>{' '}
                            <span className="text-jedi-green">
                                {translate(uiMessages.site.home.status.docsComplete, { count: 29 })}
                            </span>{' '}
                            <span className="mx-2 text-border-more-contrast">|</span>{' '}
                            <span className="text-hologram-blue">React 19 + Docusaurus 3.10</span>
                        </p>
                    </div>
                </main>
            </div>
        </Layout>
    );
}
