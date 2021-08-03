
/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: "useStateMachine",
  tagline: "The <1 kb state machine hook for React",
  url: "https://cassiozen.github.io",
  baseUrl: "/",
  trailingSlash: true,
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.svg",
  organizationName: "cassiozen", // Usually your GitHub org/user name.
  projectName: "useStateMachine", // Usually your repo name.
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
      switchConfig: {
        darkIcon: '🌙',
        lightIcon: '\u2600',
        darkIconStyle: {
          marginLeft: '2px',
        },
        lightIconStyle: {
          marginLeft: '1px',
        },
      },
    },
    navbar: {
      title: "useStateMachine",
      logo: {
        alt: "useStateMachine Logo",
        src: "img/logo.png",
      },
      items: [
        {
          type: 'doc',
          docId: 'api',
          position: 'left',
          label: 'API Docs',
        },
        {
          href: "https://github.com/cassiozen/useStateMachine",
          label: "GitHub",
          position: "right",
        },
      ],
    },


  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          editUrl:
            "https://github.com/cassiozen/useStateMachine/edit/main/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
    [
      "docusaurus-preset-shiki-twoslash",
      {
        themes: ["min-light", "nord"],
      },
    ],
  ],
  plugins: [require.resolve('docusaurus-lunr-search')],
};
