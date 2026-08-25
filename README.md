# Intern SDK

`@archastro/intern-sdk` is the typed application API for Intern sites. The
client is a thin wrapper around plugin implementations supplied by the active
runtime.

```ts
import Client from "@archastro/intern-sdk";

const client = new Client();
const current = await client.me.get();

await client.me.update({ name: "Ada Lovelace" });

await client.d1.exec(
  "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY)",
);
const visits = await client.d1.prepare("SELECT * FROM visits").all();
```

The site commits only this client code. Local MCP previews and production hosts
serve the same bundle and inject their runtime resolver outside the checkout.
Install the SDK as a development dependency so the site build bundles it into
the committed browser output:

```sh
npm install --save-dev @archastro/intern-sdk
```

## Runtime implementations

The host injects a stable runtime resolver as `globalThis.intern`. Browser
hosts resolve one runtime; SSR hosts resolve request-scoped runtimes. The
application continues to use `new Client()` in both places.

```ts
import {
  createRuntimeHost,
  INTERN_PROTOCOL_VERSION,
  INTERN_TRANSPORT_VERSION,
  type InternRuntime,
} from "@archastro/intern-sdk/runtime";

const currentRuntime: InternRuntime = {
  protocolVersion: INTERN_PROTOCOL_VERSION,
  transport: {
    version: INTERN_TRANSPORT_VERSION,
    async invoke(binding, operation, input) {
      return hostCall({ binding, operation, input });
    },
  },
};

globalThis.intern = createRuntimeHost(() => currentRuntime);
```

Tests and local tools can also supply a runtime explicitly:

```ts
import Client from "@archastro/intern-sdk";
import { createMemorySandbox } from "@archastro/intern-sdk/testing";

const sandbox = createMemorySandbox({ me: seededUser, d1: true });
const client = new Client({ runtime: sandbox.runtime });
```

The injected protocol is plugin-agnostic: hosts implement only
`RuntimeTransport.invoke(binding, operation, input)`. Typed plugin wrappers map
their public methods onto that transport, so adding a plugin does not add
plugin-specific methods or dispatch branches to the injected host. Local tools
may still use implementation contracts and the in-memory dispatcher from
`@archastro/intern-sdk/testing`.

Plugins are opt-in. A host that does not provide `d1` leaves `client.d1`
unavailable; it does not silently create or connect a database.

Application code imports only the client and public plugin types from the
package root.

The transport is an additive capability within the deployed protocol-v1 host
envelope. Hosts roll out `transport` first while retaining a generic legacy
plugin facade for already-compiled sites; transport-aware SDKs can ship after
that. The transport has its own version, so future wire changes do not silently
reinterpret calls made through the stable host envelope.

Use `encodeRuntimeWireValue` and `decodeRuntimeWireValue` at JSON boundaries.
The codec preserves `Uint8Array` profile-picture bytes and rejects unsupported
or cyclic values rather than relying on JSON's lossy typed-array encoding.

## Releases

The initial `0.1.0` publication is a one-time authenticated seed because npm
requires the package to exist before a trusted publisher can be registered.
After that seed, configure the package's GitHub Actions publisher:

```sh
npm trust github @archastro/intern-sdk \
  --repo ArchAstro/intern-sdk \
  --file publish.yml \
  --env npm-release \
  --allow-publish
```

Subsequent releases use the manual `release` workflow on `main`. It runs the
full package gate, opens and rebase-merges a version-only PR, tags the exact
merged commit, and dispatches `publish.yml`. The publish job uses npm OIDC,
verifies the tag and package version agree, refuses an existing version,
publishes publicly with automatic provenance, and creates the GitHub Release.

The npm trusted publisher must match these values exactly:

- Package: `@archastro/intern-sdk`
- GitHub organization: `ArchAstro`
- Repository: `intern-sdk`
- Workflow: `publish.yml`
- Environment: `npm-release`
- Allowed action: `npm publish`
