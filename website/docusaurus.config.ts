// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


const config: Config = {
  title: 'Harmonix on AWS',
  // tagline: 'Orchestrate Platforms and Applications',
  tagline: 'Fast, secure, and at-scale. A developer portal to meet your Enterprise needs.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://harmonixonaws.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  projectName: 'harmonix', // Usually your repo name.
  organizationName: 'awslabs', // Usually your GitHub org/user name.
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  themes: ['@docusaurus/theme-mermaid'],
  // In order for Mermaid code blocks in Markdown to work,
  // you also need to enable the Remark plugin with this option
  markdown: {
    mermaid: true,
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // editUrl:
          //   'https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/website/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-K11BYW5K62',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
      // Replace with your project's social card
    image: 'img/harmonix-blue.png',
    navbar: {
      // title: 'Harmonix on AWS', 
      hideOnScroll: false,
      logo: {
        alt: 'Harmonix on AWS Logo',
        src: 'img/harmonix-white.svg',
        srcDark: 'img/harmonix-white.svg',
        className: 'harmonix-nav-logo',
        // width: 128,
        // height: 128,
      },
      items: [
        {
          to: '/docs/getting-started/deploy-the-platform', 
          label: 'Getting Started', 
          position: 'left'
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        // {to: '/blog', label: 'Blog', position: 'left'},
        {
          to: '/workshop', 
          label: 'Workshop', 
          position: 'left'
        },
        {
          to: '/partners', 
          label: 'Partners', 
          position: 'left'
        },
        {
          to: '/about', 
          label: 'About', 
          position: 'left'
        },
        {
          href: 'https://github.com/awslabs/harmonix',
          position: 'right',
          className: 'header-github-link',
          "aria-label": 'Github repository',
        },
      ],
    },
    announcementBar: {
      content:
      'Harmonix on AWS 0.4.0 is now available.  Check it out and give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/awslabs/harmonix">GitHub</a>! ⭐️.  View changes <a target="_blank" rel="noopener noreferrer" href="https://harmonixonaws.io/docs/CHANGELOG">here</a>.',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      isCloseable: true,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/deploy-the-platform',
            },
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Learn',
          items: [
            {
              label: 'Video Tutorials',
              href: 'https://harmonixonaws.io/docs/getting-started/videos' 
            }
          ]
        },
        {
          title: 'More',
          items: [
            // {
            //   label: 'Blog',
            //   to: '/blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/awslabs/harmonix',
            },
          ],
        },
      ],
      copyright: `Built with ❤️ at AWS | Copyright © ${new Date().getFullYear()} Amazon.com, Inc. or its affiliates. All rights reserved`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    zoom: {
      selector: 'img:not(.harmonix-nav-logo)',
      background: {
        light: 'rgb(255, 255, 255)',
        dark: 'rgb(50, 50, 50)'
      },
      config: {
        // options you can specify via https://github.com/francoischalifour/medium-zoom#usage
      }
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['diff']
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    'docusaurus-lunr-search', 
    'docusaurus-plugin-image-zoom', 
    ['docusaurus-plugin-remote-content',  
    {
      name: "content",
      sourceBaseUrl: "https://raw.githubusercontent.com/awslabs/harmonix/main/",
      outDir: "docs",
      documents: ["CHANGELOG.md"],
      performCleanup: true,
      // in the plugin's options:
      // modifyContent(filename, content) {
      //   if (filename.includes("CONTRIBUTING")) {
      //     const re = /\[LICENSE\]\(LICENSE\)/g;
      //     const licenseUrl = "https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/LICENSE"
      //     var newContent = content.replace(re, `[LICENSE](${licenseUrl})`);   
      //     return {
      //         content: newContent
      //     }
      //   }
      //   // don't want to modify this item, since it doesn't contain "CONTRIBUTING" in the name
      //   return undefined
      // },
    }]
  ],
}

export default config;
