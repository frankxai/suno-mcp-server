# Suno package publication

The source package is an offline music brief workbench and prepared-session compiler.
It does not submit generation requests or grant tenant, billing or execution authority.

## Release sequence

1. Merge independently reviewed source and wait for receiving-main CI. All four
   Windows/Linux Node22/24 jobs and the aggregate must succeed.
2. Dispatch `npm-release.yml` on `main`, with that exact CI run ID and `verify`.
   The workflow downloads the original four archives with digest mismatch treated
   as an error, checks actual bytes and installed-consumer receipts, and selects
   the common archive. It does not build or repack the package.
3. Configure the legitimate package-specific npm trusted publisher and the
   `npm-production` GitHub environment. These are owner-controlled permissions;
   the helper only reads their configuration and never calls their creation,
   permission-change or approval APIs. A workflow reference may cause GitHub to
   create an empty environment; that is insufficient and fails publication checks.
4. Dispatch the same workflow with `stage` or `publish`. GitHub environment
   approval and current-source checks occur before the npm submission. The
   publication job rechecks metadata and hashes after the approval wait.
5. For staging, inspect the actual staged archive and approve it with native npm
   maintainer 2FA. For direct publication, verify the registry version, integrity,
   signed provenance and an empty-consumer installation before announcing it.
   Direct publication runs a separate unprivileged `verify-public` job: it downloads
   the public registry archive, compares its hashes, requires provenance/signature
   metadata, runs native `npm audit signatures --include-attestations`, checks the
   verified target's provenance subject/source/workflow/release-run binding, and exercises three newly installed
   protocol clients. A verification failure keeps the release unaccepted even
   when the version is already publicly available.

Verification defaults to `verify` and receives no npm OIDC permission. Fork,
non-main, failed, stale-source, expired, mismatched, incomplete and divergent
artifact sets are rejected. Only the publication job receives `id-token: write`.
It uses npm12.2.0 on Node24.21.0, empty npm configuration, a minimal environment,
the exact archive, and disabled lifecycle scripts. There is no stored-token fallback.

## Owner configuration

The npm mapping must name GitHub owner `frankxai`, repository `suno-mcp-server`,
workflow filename `npm-release.yml` and environment `npm-production`. Enable the
command actually intended: staged submission or direct publication. Existing
identity success does not prove that mapping or its permissions.

The GitHub environment must require user `frankxai`, disallow administrator
bypass, and use custom deployment branch policies with exactly `main` of type
`branch`. Founder self-review may remain enabled for a solo-owner repository;
the workflow itself does not approve environments. Publication requires the
server's named approval record for the current run. That records the GitHub actor,
not independent proof of the person at the keyboard.

[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) documents the
mapping. [npm staged publishing](https://docs.npmjs.com/staged-publishing/)
requires maintainer 2FA for final approval and reserves the staged version.
Do not reject or replace another session's stage, disable 2FA, rotate credentials,
change access permissions, or retry with a different archive after a partial result.

## Recovery and evidence

Artifacts expire after seven days. Expiry requires a new verified CI run; an old
approval is not a licence to reconstruct bytes. A source advance requires its own
reviewed receiving CI. The selected archive and `release.json` are retained; native
npm stdout/stderr and exit status are captured in `publication.json` when submission
is attempted. A failed or interrupted submission needs registry/stage inspection
before retry, since the version may already be reserved or published.

Source acceptance, verification, staging and public/customer acceptance are separate
states. A successful submission is not proof of published-registry behavior, audio
quality, user demand or managed subscription readiness. Retain prior failed evidence.
