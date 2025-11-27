# Sitemap Configuration

This file helps search engines discover all pages of the documentation.

## Automatic Generation

VitePress automatically generates a sitemap at build time when configured in `config.js`:

```javascript
sitemap: {
  hostname: 'https://strapi-plugin-io.netlify.app'
}
```

## Manual Priority (Optional)

If you want to manually set priorities, create a `sitemap.xml` in the public folder.

## Pages Included

- Homepage (/)
- Getting Started (/guide/getting-started)
- IO Class API (/api/io-class)
- Plugin Configuration (/api/plugin-config)
- Examples Overview (/examples/)
- Content Types (/examples/content-types)
- Events (/examples/events)
- Hooks (/examples/hooks)
- Ecosystem (/ecosystem)

## Submission

Submit the sitemap to:
- Google Search Console: https://search.google.com/search-console
- Bing Webmaster Tools: https://www.bing.com/webmasters

