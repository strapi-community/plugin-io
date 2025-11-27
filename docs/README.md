# Strapi Plugin IO - Documentation

Modern, comprehensive documentation for the Socket.IO Plugin for Strapi v5, built with VitePress.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Documentation Structure

```
docs/
├── index.md                    # Homepage
├── guide/
│   └── getting-started.md      # Installation & setup guide
├── api/
│   ├── io-class.md            # Core API reference
│   └── plugin-config.md       # Configuration options
├── examples/
│   ├── index.md               # Examples overview
│   ├── content-types.md       # Content type examples
│   ├── events.md              # Custom events examples
│   └── hooks.md               # Lifecycle hooks examples
├── public/
│   └── logo.svg               # Plugin logo
└── .vitepress/
    └── config.js              # VitePress configuration
```

---

## ✨ Features

- 🎨 **Modern Design** - Clean, professional UI with dark mode
- 🔍 **Local Search** - Fast, client-side search
- 📱 **Mobile Responsive** - Works on all devices
- 💻 **Code Highlighting** - Syntax highlighting for 40+ languages
- 🔗 **Cross-References** - Easy navigation between related topics
- 📖 **Rich Content** - Tips, warnings, code tabs, and more
- ⚡ **Fast** - Static site generation for optimal performance

---

## 📖 Content Overview

### Getting Started
- Requirements & compatibility
- Installation instructions
- Basic & advanced configuration
- Authentication strategies
- Admin panel setup
- Troubleshooting

### API Reference
- **IO Class**: Complete API with 7 helper functions
- **Plugin Config**: All configuration options with examples

### Examples
- **Content Types**: Automatic real-time events
- **Events**: Custom event handlers
- **Hooks**: Lifecycle hooks & adapters
- **Use Cases**: 8 real-world implementations
- **Frameworks**: React, Vue, Next.js examples

---

## 🛠️ Technology Stack

- **VitePress**: v1.6.4
- **Vue**: v3.5.13
- **Node**: 18.0.0 - 22.x

---

## 📝 Writing Documentation

### Code Blocks

````markdown
```javascript
const socket = io('http://localhost:1337');
```
````

### Tips & Warnings

```markdown
::: tip
This is a helpful tip!
:::

::: warning
This is a warning!
:::

::: danger
This is dangerous!
:::
```

### Code Groups

````markdown
::: code-group

```javascript [JavaScript]
const socket = io();
```

```typescript [TypeScript]
const socket: Socket = io();
```

:::
````

---

## 🔧 Configuration

Edit `.vitepress/config.js` to customize:
- Site title & description
- Navigation & sidebar
- Social links
- Theme colors
- Search settings
- Footer content

---

## 🎨 Theming

The documentation uses VitePress's default theme with custom branding:
- **Primary Color**: `#4945ff` (Strapi blue)
- **Dark Mode**: Automatic based on system preference
- **Fonts**: System fonts for optimal performance

---

## 📊 Build Output

```bash
npm run build
```

Generates static files in `.vitepress/dist/`:
- Optimized HTML files
- Minified CSS & JavaScript
- Pre-rendered Vue components
- Service worker for offline support

---

## 🚀 Deployment

### Netlify

```bash
# Build command
npm run build

# Publish directory
.vitepress/dist
```

### Vercel

```bash
# Build command
npm run build

# Output directory
.vitepress/dist
```

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy docs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .vitepress/dist
```

---

## 🤝 Contributing

### Adding New Pages

1. Create markdown file in appropriate directory
2. Add to `.vitepress/config.js` sidebar
3. Link from relevant pages
4. Test locally with `npm run dev`

### Improving Content

- Keep code examples up-to-date
- Add practical use cases
- Include TypeScript examples
- Provide error handling examples
- Add troubleshooting tips

### Style Guide

- Use present tense
- Keep sentences short
- Include code examples
- Add visual breaks (headings, lists)
- Link to related content
- Test all code examples

---

## 📄 License

MIT License - Same as the plugin

---

## 👥 Credits

**Original Plugin Authors:**
- [@ComfortablyCoding](https://github.com/ComfortablyCoding)
- [@hrdunn](https://github.com/hrdunn)

**Documentation:**
- Updated and enhanced by [@Schero94](https://github.com/Schero94)

**Will be maintained till December 2026** 🚀

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ComfortablyCoding/strapi-plugin-io/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ComfortablyCoding/strapi-plugin-io/discussions)
- **Documentation**: [strapi-plugin-io.netlify.app](https://strapi-plugin-io.netlify.app/)

---

**Last Updated**: November 27, 2025  
**VitePress Version**: 1.6.4  
**Plugin Version**: 3.0.0

