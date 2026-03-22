# create-sprinkles

Get started with development by creating projects from templates quickly.

## Prerequisites

create-sprinkles requires [Vite+](https://viteplus.dev). Install it with Homebrew on macOS:

```sh
brew install markmals/tap/vite-plus
```

Or use the official installer script:

```sh
# macOS/Linux
curl -fsSL https://vite.plus | bash

# Windows
irm https://vite.plus/ps1 | iex
```

## Usage

```sh
vp create sprinkles
```

The interactive prompts will guide you through:

1. **Directory** — where to create the project
2. **Project kind** — choose a template (see below)
3. **Optional features** — add-ons specific to the chosen template
4. **GitHub owner** — your GitHub user or organization

## Templates

### React Router — SPA

Single-page app with React Router, Tailwind CSS, and Vite+.

- Optional: [Convex](https://convex.dev) backend

### React Router — SSR

Server-rendered app with React Router, Tailwind CSS, Vite+, and Cloudflare deployment.

- Optional: [Convex](https://convex.dev) backend

### React Router — RSC

React Server Components with React Router, Tailwind CSS, Vite+, and Cloudflare deployment.

- Optional: Content-layer plugin for MDX-based content
- Optional: Single Executable Application (SEA) — bundles the server and all client assets into a single portable Node.js binary via `node:sea`

## License

MIT
