# Windows SWC Repair Report

## Result

`BLOCKED` — the current Windows pnpm installation did not restore the optional
SWC package payload, so a Web production build was not attempted or reported as
successful.

## Environment

- Node: `v24.14.0`
- pnpm: `11.9.0`
- Platform / architecture: `win32` / `x64`
- Next.js resolved version: `16.2.11`

## Diagnosis and changes

- No repository `.npmrc` was present to disable optional dependencies.
- `apps/web/package.json` had incorrectly declared
  `@next/swc-win32-x64-msvc` as a direct optional dependency. That declaration
  was removed; platform-specific Next binaries must remain transitive optional
  dependencies of Next.js.
- `pnpm-workspace.yaml` now declares Windows/Linux x64 supported architectures.
- A forced pnpm reinstall still left
  `node_modules/.pnpm/@next+swc-win32-x64-msvc@16.2.11/node_modules` empty;
  `require.resolve('@next/swc-win32-x64-msvc/package.json')` from `apps/web`
  therefore failed.
- The documented `nodeLinker: hoisted` fallback was enabled and retried. The
  SWC package was still not projected.

## Installation evidence

- `pnpm store prune` completed.
- Frozen installation first correctly reported lockfile drift caused by removing
  the direct SWC declaration and adding `@types/react-dom`; a normal install was
  started to synchronize the lockfile.
- The normal/forced installation processes repeatedly exceeded the tool window,
  left the SWC package payload empty, and produced no terminal error output.
  The final stale pnpm process was stopped after confirming it had not produced
  the binary.

## Validation

- Pre-repair root test run: 33 test files / 159 tests passed.
- SWC native validation: failed before binary loading because the package could
  not be resolved from `apps/web`.
- Next.js `next info`, Web typecheck, Web lint, production build, E2E and Vercel
  Preview were not claimed or completed.

## Required follow-up

1. In a clean Windows Node 24 shell, run `pnpm install --force` to completion
   without terminating it, then `pnpm install --frozen-lockfile`.
2. Re-run the SWC native validation command from the repair task.
3. If the optional package remains absent, retry in a short ASCII-only Git
   worktree such as `C:\dev\liuyao-system`; do not add the Windows SWC package
   as a direct dependency.
4. Only after `SWC_NATIVE_BINARY_OK` may Web build, E2E and Vercel Preview run.
