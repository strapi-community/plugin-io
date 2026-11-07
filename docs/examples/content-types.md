---
description: Choose which Strapi content types and actions send Socket.IO events, populate relations, and handle publish, unpublish, delete, drafts and locales on the client.
---

# Content types

A watched content type sends an event after every matching Document Service
action. The event goes to each Users & Permissions role and content API token
that may read the type, sanitized with that audience's permissions.

## Watch everything

```js
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article', 'api::category.category'],
    },
  },
};
```

A string watches all six actions.

| Action         | Event                  | When                                          | Payload                                  |
| -------------- | ---------------------- | --------------------------------------------- | ---------------------------------------- |
| `create`       | `article:create`       | A document is created                         | `{ data: { id, attributes }, meta: {} }` |
| `update`       | `article:update`       | A document is updated                         | `{ data: { id, attributes }, meta: {} }` |
| `publish`      | `article:publish`      | A draft is published                          | `{ data: { id, attributes }, meta: {} }` |
| `discardDraft` | `article:discardDraft` | A draft is reset to the published version     | `{ data: { id, attributes }, meta: {} }` |
| `unpublish`    | `article:unpublish`    | A document is unpublished                     | `{ data: { documentId, locale? } }`      |
| `delete`       | `article:delete`       | A document, or one of its locales, is deleted | `{ data: { documentId, locale? } }`      |

The event name uses the content type's `singularName`.

## Pick actions

```js
contentTypes: [
  { uid: 'api::article.article', actions: ['publish', 'unpublish', 'delete'] },
  { uid: 'api::order.order', actions: ['create'] },
],
```

Editors can also watch API content types and toggle actions in
_Settings > Socket.IO > Settings > Content events_. Types set in the config
show there as read-only rows.

## Populate relations

```js
contentTypes: [
  { uid: 'api::article.article', populate: ['author', 'cover'] },
  { uid: 'api::page.page', populate: { seo: { fields: ['metaTitle'] } } },
  { uid: 'api::product.product', populate: '*' },
],
```

Before the event is sent, the entry is fetched again with the same locale and
status and the given `populate`. Relations arrive in the v4-style shape
`{ data: { id, attributes } }`:

```js
socket.on('article:publish', ({ data }) => {
  const author = data.attributes.author?.data?.attributes;
  console.log(data.attributes.title, 'by', author?.username);
});
```

A role that may not read the related type receives the entry without that
relation. Populate only what clients need: every relation costs a query per
event.

## Drafts

With Draft & Publish, draft versions are not sent while
_Only published content_ is on (the default). Listen to `:publish` for new
content. Turn the setting off to send `create` and `update` for drafts to the
roles that may read them.

## Locales

Each locale is its own event. Delete and unpublish payloads include `locale`
for localized content:

```js
socket.on('article:delete', ({ data }) => removeFromList(data.documentId, data.locale));
```

## Keep a list in sync

```js
const articles = new Map(); // documentId -> attributes

const upsert = ({ data }) => articles.set(data.attributes.documentId, data.attributes);
const remove = ({ data }) => articles.delete(data.documentId);

socket.on('article:publish', upsert);
socket.on('article:update', upsert);
socket.on('article:unpublish', remove);
socket.on('article:delete', remove);
```

Load the initial list through the REST API, then apply events. After a
reconnect, reload the list, since events sent while a client was offline are
not replayed.

## What is never sent

- Fields marked `private` and password fields (Strapi's Content API sanitizer).
- Fields the audience may not read.
- Built-in secret names (`password`, `resetPasswordToken`, `apiKey`, `secret`, ...), `config.sensitiveFields` and the _Excluded fields_ setting.

If sanitizing fails for an audience, that audience gets nothing. The plugin
never falls back to the raw entry.

## Events from your own code

Events come from the Document Service, so `strapi.documents(uid).update(...)`
in your services emits them too. `strapi.db.query()` writes do not. To send
something yourself:

```js
// sanitized per audience, like the automatic events
await strapi.$io.emit({ event: 'update', schema: 'api::article.article', data: entry });

// a custom event, sensitive keys removed
await strapi.$io.raw({ event: 'stock:low', data: { sku: 'A-1', left: 3 }, rooms: ['io-role-authenticated'] });
```

## Troubleshooting

| Symptom                           | Check                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| No events at all                  | The role or token has `find` or `findOne` on the type. The type is watched. |
| `create` arrives but not drafts   | _Only published content_ is on (default). Listen to `:publish`.             |
| Relation missing                  | It is not in `populate`, or the audience may not read the related type.     |
| Writes from a script send nothing | The script uses `strapi.db.query()`. Use `strapi.documents()`.              |

## See also

- [Plugin configuration](/api/plugin-config)
- [IO class](/api/io-class)
- [Strapi Document Service](https://docs.strapi.io/cms/api/document-service)
