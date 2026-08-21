# Intern SDK

This repository owns the public `@archastro/intern-sdk` package. The SDK is a
thin, strongly typed client over runtime-injected plugin implementations.

## Architecture

- Application code uses the default-exported `Client` and typed properties
  such as `client.me`.
- Runtime hosts implement contracts exported from `@archastro/intern-sdk/runtime`.
- Local tools use isolated adapters from `@archastro/intern-sdk/testing`.
- Keep transport, credentials, persistence, and host detection out of public
  plugin facades.
- Resolve implementations through the runtime provider so browser, local MCP,
  and future request-scoped server contexts can substitute them.

## Verification

Run `npm run check` for source, API, packaging, or runtime changes.

## Git

Do not commit or push unless the user explicitly asks.
