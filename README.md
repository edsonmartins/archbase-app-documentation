# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.


### Development

#### Color Palette
https://smart-swatch.netlify.app/#4299e1

CSS

main color: #3994e0

:root {
  --color-50: #e0f0ff;
  --color-100: #b8d5fa;
  --color-200: #8ebef1;
  --color-300: #63a8e8;
  --color-400: #3994e0;
  --color-500: #1f70c6;
  --color-600: #134d9b;
  --color-700: #082f70;
  --color-800: #001746;
  --color-900: #00061d;
}



{
  50: '#e0f0ff',
  100: '#b8d5fa',
  200: '#8ebef1',
  300: '#63a8e8',
  400: '#3994e0',
  500: '#1f70c6',
  600: '#134d9b',
  700: '#082f70',
  800: '#001746',
  900: '#00061d',
}


# archbase-app-documentation
