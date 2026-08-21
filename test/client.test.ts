// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import { afterEach, describe, expect, test } from "vitest";
import { AsyncLocalStorage } from "node:async_hooks";
import Client, {
  PluginContractError,
  PluginUnavailableError,
  RuntimeContractError,
  RuntimeProtocolError,
  RuntimeUnavailableError,
  type CurrentUser,
} from "../src/index.js";
import {
  INTERN_PROTOCOL_VERSION,
  createRuntimeHost,
  type InternRuntime,
} from "../src/runtime/index.js";
import {
  createMemorySandbox,
  installInjectedHost,
  installInjectedRuntime,
} from "../src/testing/index.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
});

describe("Client", () => {
  test("new Client resolves the injected runtime and exposes client.me", async () => {
    const sandbox = createMemorySandbox({ me: user("Ada") });
    restores.push(installInjectedRuntime(sandbox.runtime));

    const client = new Client();

    await expect(client.me.get()).resolves.toMatchObject({ name: "Ada" });
    await expect(
      client.me.update({ name: "Ada Lovelace" }),
    ).resolves.toMatchObject({
      name: "Ada Lovelace",
    });
    expect(sandbox.me.snapshot().name).toBe("Ada Lovelace");
  });

  test("injected runtime cleanup restores an absent global", () => {
    Reflect.deleteProperty(globalThis, "intern");
    const sandbox = createMemorySandbox({ me: user("Ada") });
    const restore = installInjectedRuntime(sandbox.runtime);

    expect(Object.hasOwn(globalThis, "intern")).toBe(true);
    restore();
    expect(Object.hasOwn(globalThis, "intern")).toBe(false);
  });

  test("an explicit runtime isolates local sandboxes", async () => {
    const ada = createMemorySandbox({ me: user("Ada") });
    const grace = createMemorySandbox({ me: user("Grace") });
    const adaClient = new Client({ runtime: ada.runtime });
    const graceClient = new Client({ runtime: grace.runtime });

    await adaClient.me.update({ name: "Ada Byron" });

    expect((await adaClient.me.get()).name).toBe("Ada Byron");
    expect((await graceClient.me.get()).name).toBe("Grace");
  });

  test("the same client can resolve a different implementation from its runtime context", async () => {
    const first = createMemorySandbox({ me: user("First") });
    const second = createMemorySandbox({ me: user("Second") });
    let active: InternRuntime = first.runtime;
    const client = new Client({ resolveRuntime: () => active });

    expect((await client.me.get()).name).toBe("First");
    active = second.runtime;
    expect((await client.me.get()).name).toBe("Second");
  });

  test("new Client isolates concurrent SSR requests through the host resolver", async () => {
    const contexts = new AsyncLocalStorage<InternRuntime>();
    const ada = createMemorySandbox({ me: user("Ada") });
    const grace = createMemorySandbox({ me: user("Grace") });
    restores.push(
      installInjectedHost(createRuntimeHost(() => contexts.getStore())),
    );
    const client = new Client();

    let releaseRequests = () => {};
    const requestsMayRun = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    const adaRequest = contexts.run(ada.runtime, async () => {
      await requestsMayRun;
      return client.me.get();
    });
    const graceRequest = contexts.run(grace.runtime, async () => {
      await requestsMayRun;
      return client.me.get();
    });
    releaseRequests();

    const [adaResult, graceResult] = await Promise.all([
      adaRequest,
      graceRequest,
    ]);
    expect(adaResult.name).toBe("Ada");
    expect(graceResult.name).toBe("Grace");
    await expect(client.me.get()).rejects.toBeInstanceOf(
      RuntimeUnavailableError,
    );
  });

  test("profile picture mutation stays behind the typed plugin implementation", async () => {
    const sandbox = createMemorySandbox({ me: user("Ada") });
    const client = new Client({ runtime: sandbox.runtime });

    const updated = await client.me.updateProfilePicture({
      bytes: new Uint8Array([0, 255]),
      contentType: "image/png",
      filename: "ada.png",
    });

    expect(updated.profilePicture).toEqual({
      url: "data:image/png;base64,AP8=",
      contentType: "image/png",
      width: null,
      height: null,
    });
    expect(await client.me.updateProfilePicture(null)).toMatchObject({
      profilePicture: null,
    });
    await expect(client.me.update({} as never)).rejects.toThrow(
      "ME update must change at least one field",
    );
  });

  test("runtime and plugin failures are typed and fail loudly", async () => {
    await expect(new Client().me.get()).rejects.toBeInstanceOf(
      RuntimeUnavailableError,
    );

    const wrongVersion = {
      protocolVersion: 2,
      plugins: {},
    } as unknown as InternRuntime;
    await expect(
      new Client({ runtime: wrongVersion }).me.get(),
    ).rejects.toBeInstanceOf(RuntimeProtocolError);

    const malformedRuntime = {
      protocolVersion: INTERN_PROTOCOL_VERSION,
    } as unknown as InternRuntime;
    await expect(
      new Client({ runtime: malformedRuntime }).me.get(),
    ).rejects.toBeInstanceOf(RuntimeContractError);

    const missing: InternRuntime = {
      protocolVersion: INTERN_PROTOCOL_VERSION,
      plugins: {},
    };
    await expect(
      new Client({ runtime: missing }).me.get(),
    ).rejects.toBeInstanceOf(PluginUnavailableError);

    const malformed = {
      protocolVersion: INTERN_PROTOCOL_VERSION,
      plugins: { me: {} },
    } as unknown as InternRuntime;
    await expect(
      new Client({ runtime: malformed }).me.get(),
    ).rejects.toBeInstanceOf(PluginContractError);
  });
});

function user(name: string): CurrentUser {
  return {
    id: `usr_${name.toLowerCase()}`,
    email: `${name.toLowerCase()}@example.com`,
    name,
    profilePicture: null,
    viewer: {
      userId: `usr_${name.toLowerCase()}`,
      appId: "dap_intern",
      orgId: "org_engine",
      orgName: "Engine",
      orgSlug: "engine",
      orgRole: "admin",
      sandboxId: null,
    },
  };
}
