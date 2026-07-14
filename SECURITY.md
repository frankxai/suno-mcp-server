# suno-mcp-server — Security

<!-- STARLIGHT-REPO-CONTRACT:START -->
## Starlight repository contract

Contract: `starlight.repo_profile.v2` · Team: `music-media-release-team` · Priority: `now`
### Data boundary

- Classification: `internal`
- PII allowed in product-owned storage: `false`
- Auth owner: `suno-mcp-server`

Never read or print `.env` values. Keep secrets in approved secret stores, keep PII out of analytics events and receipts, scan untrusted code before execution, and stop on credential or private-memory exposure.
<!-- STARLIGHT-REPO-CONTRACT:END -->
