import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = new URL("..", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "intern-sdk-package-"));
try {
  const pack = await exec(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", temporary],
    { cwd: root },
  );
  const [{ filename }] = JSON.parse(pack.stdout);
  const consumer = join(temporary, "consumer");
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await exec(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(temporary, filename),
    ],
    {
      cwd: consumer,
    },
  );
  await writeFile(
    join(consumer, "smoke.mjs"),
    `import Client from "@archastro/intern-sdk";
import { INTERN_PROTOCOL_VERSION } from "@archastro/intern-sdk/runtime";
import { createMemorySandbox } from "@archastro/intern-sdk/testing";
const me = { id: "usr_1", email: null, name: "Ada", profilePicture: null, viewer: { userId: "usr_1", appId: null, orgId: null, orgName: null, orgSlug: null, orgRole: null, sandboxId: null } };
const sandbox = createMemorySandbox({ me });
if (sandbox.runtime.protocolVersion !== INTERN_PROTOCOL_VERSION) throw new Error("protocol mismatch");
globalThis.intern = sandbox.host;
const client = new Client();
if ((await client.me.get()).name !== "Ada") throw new Error("default client import failed");
`,
  );
  await exec(process.execPath, [join(consumer, "smoke.mjs")], {
    cwd: consumer,
  });
  await writeFile(
    join(consumer, "smoke.ts"),
    `import Client, { type CurrentUser } from "@archastro/intern-sdk";
import { createRuntimeHost, type InternRuntime, type RuntimeTransport, INTERN_PROTOCOL_VERSION } from "@archastro/intern-sdk/runtime";
declare const transport: RuntimeTransport;
const runtime = { protocolVersion: INTERN_PROTOCOL_VERSION, transport } satisfies InternRuntime;
globalThis.intern = createRuntimeHost(() => runtime);
const client = new Client();
const current: Promise<CurrentUser> = client.me.get();
void current;
`,
  );
  await exec(
    join(root.pathname, "node_modules", ".bin", "tsc"),
    [
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "smoke.ts",
    ],
    { cwd: consumer },
  );

  const packageJSON = JSON.parse(
    await readFile(join(root.pathname, "package.json"), "utf8"),
  );
  process.stdout.write(
    `packed and imported ${packageJSON.name}@${packageJSON.version}\n`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
