# Security Guidelines

- Always require explicit user action before capture (SDK default).
- Keep feature flags off for capabilities you do not need.
- Use short presigned URL expirations.
- Restrict upload/report endpoints with authentication and rate limits.
- Use `privacy.maskSelectors` to blur sensitive DOM regions.
- Mark sensitive nodes with `data-bug-reporter-mask="true"`.
- Avoid sending secrets in diagnostics or hooks.
