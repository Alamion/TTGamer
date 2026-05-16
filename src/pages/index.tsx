import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <header className="hero hero--primary">
            <div className="container">
                <Heading as="h1" className="hero__title">
                    {siteConfig.title}
                </Heading>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div>
                    {/*<Link className="button button--secondary button--lg" to="/docs">*/}
                    {/*    Get Started*/}
                    {/*</Link>*/}
                    <Link
                        className="button button--primary button--lg margin-left--sm"
                        to="/universal_sheet"
                    >
                        Open Character Sheet
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default function Home(): ReactNode {
    return (
        <Layout title="Main" description="TTGamer - Star Wars TTRPG Character Sheet Manager">
            <HomepageHeader />
            <main className="container margin-vert--lg">
                <div className="row">
                    <div className="col col--8 col--offset-2">
                        <Heading as="h2">Welcome to TTGamer</Heading>
                        <p>
                            A character sheet manager for a Star Wars WEG/WoD hybrid TTRPG system.
                            Manage your characters with ease, including attributes, skills, force
                            powers, inventory, and more.
                        </p>
                    </div>
                </div>
            </main>
        </Layout>
    );
}
