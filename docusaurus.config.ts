import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
    title: 'TTGamer',
    tagline: 'TTRPG Sheets and Docs',
    favicon: 'img/favicon.ico',

    future: {
        v4: true,
    },

    url: 'https://alamion.github.io',
    baseUrl: '/',

    organizationName: 'Alamion',
    projectName: 'ttgamer',

    onBrokenLinks: 'throw',

    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: false,
                // docs: {
                //     sidebarPath: './sidebars.ts',
                //     editUrl: 'https://github.com/Alamion/TTGamer/tree/master/',
                // },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'TTGamer',
            logo: {
                alt: 'TTGamer Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    to: '/universal_sheet',
                    label: 'Sheet Manager',
                    position: 'left',
                },
                // {
                //     type: 'docSidebar',
                //     sidebarId: 'docsSidebar',
                //     position: 'right',
                //     label: 'Docs',
                // },
                {
                    href: 'https://github.com/Alamion/TTGamer',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        // footer: {
        //     style: 'dark',
        //     links: [
        //         {
        //             title: 'Docs',
        //             items: [
        //                 {
        //                     label: 'Documentation',
        //                     to: '/docs',
        //                 },
        //             ],
        //         },
        //         {
        //             title: 'More',
        //             items: [
        //                 {
        //                     label: 'GitHub',
        //                     href: 'https://github.com/Alamion/TTGamer',
        //                 },
        //             ],
        //         },
        //     ],
        //     copyright: `Copyright © ${new Date().getFullYear()} TTGamer. Built with Docusaurus.`,
        // },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
