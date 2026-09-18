# Public Web V1 Completion Report

## Scope

The public site is an anonymous, browser-session-only three-coin casting tool.
It shows verified trigram and hexagram structure only. Interpretation, AI, and
professional Liuyao rules are explicitly unavailable; no Supabase, account,
cloud history, or server-side casting data was added.

## Implemented controls

- `apps/web` uses the shared `@liuyao/domain` calculation functions and a Web
  Crypto `RandomSource`; it does not duplicate the casting algorithm.
- Versioned `sessionStorage` snapshots are Zod-checked, restored through the
  domain validator, and removed when corrupt or incompatible. Locked-result
  facts are recalculated from coins and the immutable ruleset before display.
- The Web package is pinned to Next `16.2.11`; `.node-version` specifies Node
  22 and `pnpm-lock.yaml` is synchronized for pnpm `11.9.0`.
- GitHub Actions `Public Web V1` runs frozen Linux installation, root quality
  gates, Expo Doctor, Next production build, and Playwright Chromium E2E.

## Local evidence

Run on 2026-07-25 in the existing Windows workspace:

| Check                                    | Result                      |
| ---------------------------------------- | --------------------------- |
| Web and mobile TypeScript                | passed                      |
| ESLint and Prettier check                | passed                      |
| Vitest                                   | 34 files / 162 tests passed |
| Content Schema drift                     | 26 schema files verified    |
| Approved catalog source drift            | passed                      |
| Production and candidate data validation | passed                      |

`pnpm run check` itself was started but stalled before it spawned its first
subcommand in this Windows runtime. Its constituent checks above were run
directly and passed. Linux CI is the release gate for the root pnpm command.

## Content-boundary update (2026-07-26)

The supplied module-four and module-five acceptance material was reviewed for
the public Web. Its traditional text and professional-rule records explicitly
remain `production_candidate` until fixed-source evidence, authorization,
content hashes, and two independent human signoffs are recorded. The project
owner has stated that they completed a review, but no second reviewer identity
or signed promotion record was added by this change.

The Web therefore adds a data-driven **Methods and Evidence** page rather than
promoting candidate content. It documents the independent three-coin method,
bottom-to-top line ordering, recomputable facts, session-only storage, the
published/not-published content layers, and the exact review gate. It also
expands knowledge and safety pages without introducing professional fields,
classical prose, AI interpretation, cloud storage, or a database migration.

Local evidence run on 2026-07-26:

| Check                                     | Result                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Web TypeScript                            | passed                                                                       |
| Mobile TypeScript                         | passed                                                                       |
| ESLint and targeted Prettier check        | passed                                                                       |
| Vitest                                    | 35 files / 164 tests passed                                                  |
| Schema/source/data/candidate drift checks | passed                                                                       |
| Windows `next build`                      | timed out after 64 seconds without a result; not accepted as a release build |

The content-boundary update was committed and pushed to `agent/hexagram-core`.
The public branch Preview now serves the update, including `/methodology` and
the related knowledge, casting, result, disclaimer, sitemap, and robots
changes. Candidate professional material remains unpublished.

## Deployment status

- `WINDOWS_SWC_BLOCKED`: Windows local Next build remains unsuitable as a
  release gate; the current direct build attempt timed out after 64 seconds.
- `LINUX_CI_OK`: [Public Web V1 run 30190013885](https://github.com/wanfeng1025/liuyao-app/actions/runs/30190013885)
  passed frozen installation, root `pnpm run check`, Expo Doctor, Next
  production build, Playwright Chromium installation, and anonymous-flow E2E.
- `VERCEL_PREVIEW_OK`: deployment `dpl_7uY6YaUSdeHoEALG8YHNet5zmf2k` is `Ready`
  at [liuyao-app-git-agent-hexagram-core-wanan3.vercel.app](https://liuyao-app-git-agent-hexagram-core-wanan3.vercel.app/).
  It is a Preview deployment for `agent/hexagram-core`, with `Next.js`, Node
  22, repository-root build commands, `apps/web/.next` Output Directory, and
  `pnpm install --frozen-lockfile --force`. Its SSO deployment protection was
  explicitly disabled so an unauthenticated visitor can use the URL. No
  Production deployment, custom domain, environment variable, or secret was
  added.

## Authorized quotation update (2026-07-26, local workspace)

The project owner subsequently confirmed permission to publicly release the
supplied `六爻大概.txt` as an authorized dataset. The local workspace now fixes
that exact file as `liuyao-overview-authorized-v1`, with a raw-file SHA-256,
64 judgment quotations, 384 ordinary line-text quotations, per-record source
locators, per-record SHA-256 values, reviewer role, and an immutable content
version. The public Web shows only the primary-hexagram judgment, actually
moving line texts, and changed-hexagram judgment; it does not turn them into a
prediction, a professional Liuyao chart, or AI-generated advice.

This is a local uncommitted update at the time of this report. It has not been
pushed or deployed. The existing Preview URL above therefore remains a Web V1
structural-content preview until the project owner separately authorizes a
commit and push.

| Check                                 | Result                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (root and Web)             | passed                                                                                                                                      |
| Full ESLint and Prettier              | passed                                                                                                                                      |
| Vitest                                | 36 files / 165 tests passed                                                                                                                 |
| Authorized quote generation and drift | 64 judgments / 384 line texts passed                                                                                                        |
| Source/data/schema validation         | passed; 27 generated schemas verified                                                                                                       |
| In-app browser anonymous flow         | passed: six clicks, lock, primary/moving/changed quotes, hexagram page                                                                      |
| Windows Next production build         | blocked after compile/typecheck: Next 16.2.11 `workStore` invariant while prerendering internal error/not-found route under bundled Node 24 |

The last build failure is not presented as a successful production build. The
repository requires Node 22 for Linux CI/Vercel; this local desktop runtime
only exposed bundled Node 24, while `node` was absent from `PATH`.
