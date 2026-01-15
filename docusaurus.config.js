// @ts-check
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Archbase Java',
  tagline: 'Framework Java para aplicações corporativas com DDD',

  favicon: 'favicon-light.png',

  url: 'https://java.archbase.dev',
  baseUrl: '/',

  organizationName: 'edsonmartins',
  projectName: 'archbase-app-framework',

  onBrokenLinks: 'warn',

  // Markdown config
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
      onBrokenMarkdownImages: 'ignore',
    },
  },

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: '/docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/edsonmartins/archbase-app-framework/edit/main/docs/docusaurus/',
          breadcrumbs: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Archbase Java',
        logo: {
          alt: 'Archbase Java Logo',
          src: 'img/logo-sem-texto-light.png',
          srcDark: 'img/logo-sem-texto-dark.png',
          width: 32,
          height: 32,
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentação Java',
          },
          {
            href: 'https://react.archbase.dev',
            label: 'Documentação React',
            position: 'left',
          },
          {
            href: 'https://github.com/edsonmartins/archbase-app-framework',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'Archbase Java Logo',
          src: 'img/logo-com-texto-dark.png',
          width: 200,
          height: 60,
        },
        links: [
          {
            title: 'Documentação Java',
            items: [
              {
                label: 'Começando',
                to: '/docs/getting-started/installation',
              },
              {
                label: 'Conceitos DDD',
                to: '/docs/conceitos/ddd',
              },
              {
                label: 'Módulos',
                to: '/docs/modulos/starter',
              },
            ],
          },
          {
            title: 'Documentação React',
            items: [
              {
                label: 'React Docs',
                href: 'https://react.archbase.dev',
              },
            ],
          },
          {
            title: 'Comunidade',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/edsonmartins/archbase-app-framework',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Archbase Java.`,
      },
      prism: {
        additionalLanguages: ['java', 'yaml', 'bash', 'groovy'],
        theme: {
          plain: {},
          styles: [],
        },
      },
    }),
};

export default config;
