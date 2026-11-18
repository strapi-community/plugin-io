/**
 * Node module customization hooks for the admin StrictMode harness.
 *
 * Runs in the loader thread (`module.register`, Node >= 20.6). It lets `node --test` import the
 * plugin's admin sources the way the Strapi admin bundler (Vite) does:
 *
 * - JSX/TSX/TS under the repository (outside node_modules) is transpiled with esbuild
 *   (`jsx: 'automatic'`) and loaded as ES modules, even in a `"type": "commonjs"` package.
 * - Extensionless and directory specifiers resolve like a bundler (`./Foo` -> `./Foo.tsx`,
 *   `./dir` -> `./dir/index.jsx`), also inside node_modules packages that ship bundler-style ESM.
 * - JSON imports without import attributes become `export default <json>`; CSS and image imports
 *   become empty or string modules.
 * - `aliases` (passed from setup.mjs) swap modules, for example `socket.io-client` for a counting
 *   fake.
 * - CommonJS dependencies imported from ESM get a wrapper with every runtime export, and a bare
 *   package import prefers the package's `module` entry, as Vite does for the Strapi admin.
 *
 * Docs: https://nodejs.org/docs/latest-v22.x/api/module.html#customization-hooks and
 * https://esbuild.github.io/api/#transform (esbuild 0.28).
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';

const CJS_INTEROP = 'strict-harness-cjs';

/** @type {{ root: string, aliases: Record<string, string> }} */
let config = { root: process.cwd(), aliases: {} };

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];
const RESOLVE_EXTENSIONS = [...SOURCE_EXTENSIONS, '.json', '.cjs'];
const ASSET_EXTENSIONS = new Set(['.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2']);

/**
 * Receives the harness configuration from `module.register(..., { data })`.
 * @param {{ root: string, aliases: Record<string, string> }} data - Repository root and aliases.
 */
export function initialize(data) {
  if (data) config = { ...config, ...data };
}

/**
 * Whether a file belongs to the repository sources the harness transpiles.
 * @param {string} filePath - Absolute path.
 * @returns {boolean} True for repository files outside node_modules.
 */
const isRepoSource = (filePath) =>
  filePath.startsWith(config.root + path.sep) && !filePath.includes(`${path.sep}node_modules${path.sep}`);

/**
 * Checks that a path is an existing file.
 * @param {string} candidate - Absolute path.
 * @returns {Promise<boolean>} True for a file.
 */
const isFile = async (candidate) => {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
};

/**
 * Bundler-style lookup: the path itself, the path plus an extension, then `index.*`.
 * @param {string} base - Absolute path without or with extension.
 * @returns {Promise<string | null>} Resolved file or null.
 */
const bundlerLookup = async (base) => {
  if (await isFile(base)) return base;
  // A directory with its own package.json (`@reduxjs/toolkit/query/react`): its ESM entry.
  try {
    const manifest = JSON.parse(await readFile(path.join(base, 'package.json'), 'utf8'));
    const entry = manifest.module || manifest.main;
    if (entry && (await isFile(path.join(base, entry)))) return path.join(base, entry);
  } catch {
    // no nested package.json
  }
  for (const extension of RESOLVE_EXTENSIONS) if (await isFile(base + extension)) return base + extension;
  for (const extension of RESOLVE_EXTENSIONS) {
    const index = path.join(base, `index${extension}`);
    if (await isFile(index)) return index;
  }
  return null;
};

const esmCache = new Map();

/**
 * Whether a file is evaluated as an ES module: `.mjs`, a transpiled repository source, or `.js`
 * with ESM syntax (Node 22 detects module syntax in ambiguous `.js` files, as in
 * `@reduxjs/toolkit/dist/query/rtk-query.esm.js`).
 * @param {string} filePath - Absolute path.
 * @returns {Promise<boolean>} True for ESM.
 */
const isEsmFile = async (filePath) => {
  if (filePath.endsWith('.mjs') || isRepoSource(filePath)) return true;
  if (!filePath.endsWith('.js')) return false;
  if (!esmCache.has(filePath)) {
    const code = await readFile(filePath, 'utf8').catch(() => '');
    esmCache.set(filePath, /^\s*(import\s[\s\S]*?from\s|import\s*['"{*]|export\s)/m.test(code));
  }
  return esmCache.get(filePath);
};

/**
 * Finds the directory of an installed package the way Node does (nearest node_modules upwards).
 * @param {string} packageName - Package name.
 * @param {string} fromPath - Importing file.
 * @returns {Promise<string | null>} Package directory.
 */
const findPackageRoot = async (packageName, fromPath) => {
  let directory = path.dirname(fromPath);
  while (directory !== path.dirname(directory)) {
    const packageRoot = path.join(directory, 'node_modules', packageName);
    if (await isFile(path.join(packageRoot, 'package.json'))) return packageRoot;
    directory = path.dirname(directory);
  }
  return null;
};

/**
 * Vite's `mainFields` (module before main): a bare package import without an `exports` map
 * resolves to the package's `module` (ESM) entry, as in the Strapi admin build.
 * @param {string} specifier - Bare specifier.
 * @param {string} parentPath - Importing file.
 * @returns {Promise<string | null>} ESM entry or null.
 */
const packageModuleEntry = async (specifier, parentPath) => {
  if (specifier.startsWith('.') || specifier.startsWith('node:') || path.isAbsolute(specifier)) return null;
  const parts = specifier.split('/');
  const isScoped = specifier.startsWith('@');
  if (parts.length !== (isScoped ? 2 : 1)) return null;
  const packageRoot = await findPackageRoot(specifier, parentPath);
  if (!packageRoot) return null;
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (manifest.exports || typeof manifest.module !== 'string') return null;
  const entry = path.join(packageRoot, manifest.module);
  if (!(await isFile(entry))) return null;
  if (entry.endsWith('.mjs') || manifest.type === 'module') return entry;
  // A Babel-style `module` build (`.js` with ESM syntax, no `"type"`) loads as ESM too, as in Vite;
  // Node detects module syntax in its other files. Loading the CommonJS `main` instead would
  // require() a second copy of ESM-first dependencies (`@uiw/react-codemirror` ->
  // `@codemirror/state` in the Design System's JSONInput). An explicit `"type": "commonjs"` stays.
  return manifest.type === undefined && (await isEsmFile(entry)) ? entry : null;
};

/**
 * Whether a resolved module is CommonJS: `.cjs`, or `.js` whose nearest package.json is not
 * `"type": "module"`.
 * @param {{ url: string, format?: string | null }} resolved - Result of the next resolver.
 * @returns {Promise<boolean>} True for CommonJS.
 */
const isCommonJs = async (resolved) => {
  if (resolved.format === 'commonjs') return true;
  if (resolved.format || !resolved.url.startsWith('file:')) return false;
  const filePath = fileURLToPath(resolved.url);
  if (filePath.endsWith('.cjs')) return true;
  if (!filePath.endsWith('.js')) return false;
  let directory = path.dirname(filePath);
  while (directory !== path.dirname(directory)) {
    try {
      const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
      return manifest.type !== 'module';
    } catch {
      directory = path.dirname(directory);
    }
  }
  return true;
};

/**
 * Resolve hook: aliases first, then Node's resolver, then bundler-style fallback.
 * @param {string} specifier - Import specifier.
 * @param {object} context - Resolve context.
 * @param {Function} nextResolve - Next hook.
 * @returns {Promise<object>} Resolution.
 */
export async function resolve(specifier, context, nextResolve) {
  const alias = config.aliases[specifier];
  if (alias && context.parentURL !== pathToFileURL(alias).href) {
    return { url: pathToFileURL(alias).href, shortCircuit: true };
  }
  const parentPath = context.parentURL?.startsWith('file:') ? fileURLToPath(context.parentURL) : null;
  if (parentPath && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const found = await bundlerLookup(path.resolve(path.dirname(parentPath), specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  const moduleEntry = parentPath ? await packageModuleEntry(specifier, parentPath) : null;
  if (moduleEntry) return { url: pathToFileURL(moduleEntry).href, format: 'module', shortCircuit: true };
  try {
    const resolved = await nextResolve(specifier, context);
    // Vite pre-bundles CommonJS dependencies so ESM code can use their named exports
    // (`import { assignWith } from 'lodash'` in the Design System). Node's static CJS analysis
    // misses many of them, so ESM importers get a generated wrapper with every runtime key.
    const parentIsEsm = parentPath && (await isEsmFile(parentPath));
    if (parentIsEsm && (await isCommonJs(resolved))) {
      return { ...resolved, url: `${resolved.url}?${CJS_INTEROP}`, format: 'module' };
    }
    return resolved;
  } catch (error) {
    // Bundler-style deep imports inside packages (`lodash/get`, `date-fns/locale`).
    if (
      !['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error?.code) ||
      specifier.startsWith('.') ||
      !parentPath
    )
      throw error;
    const parts = specifier.split('/');
    const packageName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    const rest = parts.slice(specifier.startsWith('@') ? 2 : 1).join('/');
    let directory = path.dirname(parentPath);
    while (directory !== path.dirname(directory)) {
      const packageRoot = path.join(directory, 'node_modules', packageName);
      if (await isFile(path.join(packageRoot, 'package.json'))) {
        const found = await bundlerLookup(path.join(packageRoot, rest));
        if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
        break;
      }
      directory = path.dirname(directory);
    }
    throw error;
  }
}

/**
 * Load hook: transpile repository sources, turn JSON and assets into ES modules.
 * @param {string} url - Module URL.
 * @param {object} context - Load context.
 * @param {Function} nextLoad - Next hook.
 * @returns {Promise<object>} Module source.
 */
export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) return nextLoad(url, context);
  if (url.endsWith(`?${CJS_INTEROP}`)) {
    const filePath = fileURLToPath(url.slice(0, -CJS_INTEROP.length - 1));
    let keys = [];
    try {
      keys = Object.keys(createRequire(filePath)(filePath)).filter((key) => /^[A-Za-z_$][\w$]*$/.test(key));
    } catch {
      // A module that needs the DOM to evaluate: only the default export.
    }
    const named = keys.filter((key) => key !== 'default');
    const source = [
      `import { createRequire } from 'node:module';`,
      `const mod = createRequire(${JSON.stringify(filePath)})(${JSON.stringify(filePath)});`,
      // Like Vite/esbuild interop: a transpiled ES module (`__esModule`) exposes its own default.
      `export default mod && mod.__esModule && 'default' in mod ? mod.default : mod;`,
      ...named.map((key) => `export const ${key} = mod[${JSON.stringify(key)}];`),
    ].join('\n');
    return { format: 'module', source, shortCircuit: true };
  }
  const filePath = fileURLToPath(url);
  const extension = path.extname(filePath);
  if (ASSET_EXTENSIONS.has(extension)) {
    const source = extension === '.css' ? 'export default {};' : `export default ${JSON.stringify(filePath)};`;
    return { format: 'module', source, shortCircuit: true };
  }
  if (extension === '.json' && !context.importAttributes?.type) {
    const json = await readFile(filePath, 'utf8');
    return { format: 'module', source: `export default ${json};`, shortCircuit: true };
  }
  if (isRepoSource(filePath) && SOURCE_EXTENSIONS.includes(extension)) {
    const code = await readFile(filePath, 'utf8');
    const loader = extension === '.ts' ? 'ts' : extension === '.tsx' ? 'tsx' : 'jsx';
    const result = await transform(code, {
      loader,
      format: 'esm',
      jsx: 'automatic',
      target: 'node22',
      sourcefile: filePath,
      sourcemap: 'inline',
    });
    return { format: 'module', source: result.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
