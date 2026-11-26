# Contributing

Bug reports and pull requests are welcome. Please open an [issue](https://github.com/strapi-community/plugin-io/issues) first for larger changes and add a test for every fix. Commits follow [Conventional Commits](https://www.conventionalcommits.org/); semantic-release publishes from `main`.

## Checks before you push

```bash
npm ci
npm run lint
npm run format:check
npm run build
npm test              # set IO_TEST_PG_URL to include the PostgreSQL suites
npm run test:types
npm run test:admin    # admin entry points in React StrictMode (jsdom, fake network)
npm run verify
npm run docs:build
npm pack --dry-run
```

`IO_TEST_PG_URL` points at an empty PostgreSQL database, for example `postgres://io:io@127.0.0.1:5432/io_test`. Without it the multi-process suites run on SQLite only. CI runs all of these on Node 22 and 24, plus the end-to-end suites (`npm run test:e2e:app`, see the README section "Development").

## Cluster acceptance run

`scripts/cluster-acceptance.mjs` runs the packed plugin as 8 processes: two "replicas", each its own pm2 daemon in cluster mode with 4 workers, on one PostgreSQL database, behind a non-sticky round-robin balancer that passes WebSocket upgrades through and overwrites `X-Real-IP` (like two Railway replicas running `pm2 -i 4`). It is not part of CI because it needs a PostgreSQL server and about two minutes per run.

```bash
npm run build
npm run test:cluster -- --pg postgres://user@127.0.0.1:5432/postgres
# repeat on fresh databases, reusing the installed app:
npm run test:cluster -- --pg postgres://user@127.0.0.1:5432/postgres --reuse --runs 5
```

The role in `--pg` (or `IO_CLUSTER_PG_URL`) must be allowed to create databases: each run drops and recreates `--db` (default `io_cluster_acceptance`). The app is scaffolded outside the repository (`--dir`, default in the OS temp folder) from `tests/e2e/app` and `tests/cluster/app`, installs from the committed e2e lockfile with lifecycle scripts off and adds `pg`, `@socket.io/postgres-adapter` and `pm2` at fixed versions. Ports default to 1391 and 1392 for the replicas and 1393 for the balancer (`--ports`, `--lb`); the script stops before starting anything when one of them is already in use. Secrets and admin passwords are random per run and never printed; the app can only reach loopback addresses; all data is synthetic.

What it checks: presence tokens issued on one replica and used on the other exactly once, content events and admin test events reaching clients on all 8 processes, monitoring totals, reconnects after an edge drop and a `pm2 reload`, settings applied everywhere and the `409` on concurrent saves, revocation of users and API tokens on every process, the `maxConnections` total, the shared failed-handshake lockout, exact socket ids in `joinRoom()`/`disconnectSocket()`, and recovery after PostgreSQL terminates the adapter connections. It ends with a scan of the 8 process logs for plugin errors. Logs stay in `<dir>/logs`.

The connection cap check waits until every process has written a heartbeat after the last connection change and then one more poll interval, so each process has re-read the others' counts. The precise bound is in `docs/guide/multiple-instances.md` (Limits).

## Updating the CI PostgreSQL image

The PostgreSQL service in `.github/workflows/ci.yml` is pinned by the digest of its multi-arch index. Dependabot does not update service images in workflows, so refresh it by hand when a new 16.x release is out:

```bash
docker buildx imagetools inspect postgres:16-alpine   # "Digest:" line of the index
```

Use the version tag and the index digest (`postgres:16.x-alpine@sha256:...`) and update the comment above it.

## Dependency updates and the auto-merge gate

Dependabot proposes updates weekly, after a cooldown (7 days, 14 for majors). `.github/workflows/dependency-auto-merge.yml` handles its pull requests with the rules in `.github/scripts/dependency-gate.mjs`. The script is the same in every Magic plugin repository; its unit tests run with `node --test .github/scripts/dependency-gate.test.mjs` and in CI.

- **Merged automatically** (squash merge by `github-actions`): an explicit patch or minor update, after the repository's own checks pass, the gate finds nothing below, and every other check on the PR head commit has finished green: every CI job and matrix entry (for example Node versions, peer floor, React 19 StrictMode) and CodeQL where present. The merge is bound to that exact commit (`--match-head-commit`).
- **Held for review** (label `needs-review` plus a comment with the reasons, never merged automatically) when:
  - a changed package's `engines.node` no longer covers a Node version this plugin supports, or its `peerDependencies` no longer match the installed tree or this plugin's peer floor;
  - the PR body or release notes mention a breaking change;
  - the published surface changes: the `npm pack` file list (content hashes ignored), `exports`, `peerDependencies`, `engines`, or the exports of the built entry files;
  - a runtime dependency on 0.x gets a minor bump;
  - dependency review reports a vulnerability of moderate or higher, or a license outside the allowlist (MIT, MIT-0, ISC, BSD, Apache-2.0, 0BSD, BlueOak-1.0.0, CC0-1.0, Unlicense, Python-2.0, Zlib; MPL-2.0 and CC-BY for development dependencies only);
  - `npm audit signatures` reports a missing or invalid registry signature or provenance attestation;
  - the lockfile adds a package with an install script, more than 15 packages that are new to the tree, or a package that does not resolve from `registry.npmjs.org`;
  - a check fails, or the CI does not finish within 75 minutes.
- **Major updates** get the `major-update` label and a comment; a person reads the changelog and merges by hand.

The gate script runs from the default branch and reads lockfiles and reports as data; it never runs code from the pull request. Only the surface job installs (without lifecycle scripts) and builds the pull request, with a read-only token. Merges made with `GITHUB_TOKEN` do not start `release.yml`, so a dependency update ships with the next regular release.

## Compatibility canary

`.github/workflows/canary.yml` tests the plugin every Monday against the newest Strapi 5.x and the current Node.js lines and reports through one `compat` issue; the README section "Compatibility canary" describes what it runs. To check a coming version by hand, run the workflow from the Actions tab with `strapi` (and `node`) set and `dry-run` on. When you change `.github/scripts/compat-canary.mjs`, change it in every plugin repository and the workbench (it is byte-identical) and run `node --test .github/scripts/compat-canary.test.mjs`.

## Admin UI conventions

The admin follows native Strapi screens 1:1 with the Strapi Design System 2. On/off settings use the native boolean input of Settings > Users & Permissions > Advanced settings (`Field` with a `Toggle` labelled TRUE/FALSE, one per grid row); permission grants in tables use a `Checkbox` per row, like the native role permission matrices. `tests/admin-source-contract.test.mjs` enforces these patterns, and every text exists in all five admin languages (`tests/admin-i18n.test.mjs`).
