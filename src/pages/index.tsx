import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRight,
    BookOpen,
    Columns3,
    Dices,
    FilePlus2,
    Files,
    HardDrive,
    PencilRuler,
    Send,
} from 'lucide-react';
import type { ReactNode } from 'react';

const home = uiMessages.site.home;

interface GameLink {
    label: string;
    href: string;
}

interface Game {
    title: string;
    summary: string;
    links: GameLink[];
}

interface Feature {
    icon: LucideIcon;
    title: string;
    summary: string;
    href: string;
}

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    const version = String(siteConfig.customFields?.version);
    return (
        <header className="relative overflow-hidden border-b-2 border-primary/40 bg-linear-to-b from-bgSurface to-bgBase">
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
                    <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-jedi-green/40 bg-jedi-green/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-jedi-green">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-jedi-green" />
                        {translate(home.hero.status, { version })}
                    </div>
                    <Heading
                        as="h1"
                        className="mb-4 text-4xl font-black uppercase tracking-tight text-textPrimary md:text-6xl"
                    >
                        {siteConfig.title}
                    </Heading>
                    <p className="mb-8 max-w-2xl text-lg font-medium text-textSecondary md:text-xl">
                        {translate(home.hero.tagline)}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            className="inline-flex items-center justify-center gap-2 rounded-sm border-2 border-primary bg-primary px-8 py-3 font-bold uppercase tracking-wider text-on-primary shadow-lg transition-all duration-200 hover:bg-primary-hover hover:shadow-xl active:scale-95"
                            to="/universal_sheet"
                        >
                            <FilePlus2 className="h-5 w-5" aria-hidden />
                            {translate(home.hero.openSheet)}
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center gap-2 rounded-sm border-2 border-border bg-bgSurface px-8 py-3 font-bold uppercase tracking-wider text-textPrimary shadow-sm transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-95"
                            to="/docs/guide/"
                        >
                            <BookOpen className="h-5 w-5" aria-hidden />
                            {translate(home.hero.siteGuide)}
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

function SectionHeading({ children }: { children: ReactNode }) {
    return (
        <div className="mb-8 text-center">
            <Heading
                as="h2"
                className="mb-2 text-2xl font-bold uppercase tracking-wide text-textPrimary"
            >
                {children}
            </Heading>
            <div className="mx-auto h-1 w-16 bg-primary" />
        </div>
    );
}

function GameCard({ title, summary, links }: Game) {
    return (
        <article className="flex h-full flex-col rounded-sm border border-border bg-bgSurface p-6 shadow-sm">
            <Heading
                as="h3"
                className="mb-2 text-xl font-bold uppercase tracking-wide text-textPrimary"
            >
                {title}
            </Heading>
            <p className="mb-6 flex-1 leading-relaxed text-textSecondary">{summary}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {links.map(({ label, href }) => (
                    <Link
                        key={href}
                        to={href}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-hover"
                    >
                        {label}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                ))}
            </div>
        </article>
    );
}

function FeatureCard({ icon: Icon, title, summary, href }: Feature) {
    return (
        <Link
            to={href}
            className="group block h-full rounded-sm border border-border bg-bgSurface p-6 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/20">
                <Icon className="h-6 w-6" aria-hidden />
            </div>
            <Heading
                as="h3"
                className="mb-2 text-lg font-bold uppercase tracking-wide text-textPrimary"
            >
                {title}
            </Heading>
            <p className="text-sm leading-relaxed text-textSecondary">{summary}</p>
        </Link>
    );
}

export default function Home(): ReactNode {
    const games: Game[] = [
        {
            title: translate(home.games.starWars.title),
            summary: translate(home.games.starWars.summary),
            links: [
                {
                    label: translate(home.games.starWars.quickStart),
                    href: '/docs/star-wars-wod-2e/quick-start',
                },
                { label: translate(home.games.starWars.rules), href: '/docs/star-wars-wod-2e/' },
            ],
        },
        {
            title: translate(home.games.v5.title),
            summary: translate(home.games.v5.summary),
            links: [
                {
                    label: translate(home.games.v5.hunterQuickStart),
                    href: '/docs/wod-v5/hunter/quick-start',
                },
                {
                    label: translate(home.games.v5.vampireQuickStart),
                    href: '/docs/wod-v5/vampire/quick-start',
                },
                { label: translate(home.games.v5.rules), href: '/docs/wod-v5/' },
            ],
        },
    ];
    const features: Feature[] = [
        {
            icon: Files,
            title: translate(home.features.documents.title),
            summary: translate(home.features.documents.summary),
            href: '/docs/guide/sheet',
        },
        {
            icon: Columns3,
            title: translate(home.features.layout.title),
            summary: translate(home.features.layout.summary),
            href: '/docs/guide/documents/#layout',
        },
        {
            icon: PencilRuler,
            title: translate(home.features.templates.title),
            summary: translate(home.features.templates.summary),
            href: '/docs/guide/template-editor/',
        },
        {
            icon: Dices,
            title: translate(home.features.dice.title),
            summary: translate(home.features.dice.summary),
            href: '/docs/guide/dice-roller',
        },
        {
            icon: Send,
            title: translate(home.features.rollSharing.title),
            summary: translate(home.features.rollSharing.summary),
            href: '/docs/guide/roll-sharing/',
        },
        {
            icon: HardDrive,
            title: translate(home.features.storage.title),
            summary: translate(home.features.storage.summary),
            href: '/docs/guide/sheet#storage',
        },
    ];

    return (
        <Layout
            title={translate(home.meta.pageTitle)}
            description={translate(home.meta.pageDescription)}
        >
            <div className="tailwind-root">
                <HomepageHeader />
                <main className="container mx-auto px-4 py-12">
                    <section>
                        <SectionHeading>{translate(home.games.heading)}</SectionHeading>
                        <div className="grid gap-6 md:grid-cols-2">
                            {games.map((game) => (
                                <GameCard key={game.title} {...game} />
                            ))}
                        </div>
                    </section>
                    <section className="mt-16">
                        <SectionHeading>{translate(home.features.heading)}</SectionHeading>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <FeatureCard key={feature.href} {...feature} />
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </Layout>
    );
}
