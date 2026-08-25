// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import { afterEach, describe, expect, test } from "vitest";
import Client, {
  PluginUnavailableError,
  type CurrentUser,
} from "../src/index.js";
import { createMemorySandbox } from "../src/testing/index.js";

const sandboxes: ReturnType<typeof createMemorySandbox>[] = [];

afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.d1?.close();
});

describe("D1 plugin", () => {
  test("an opted-in site uses the same typed D1 API against its local in-memory database", async () => {
    // Create one isolated site runtime with D1 explicitly enabled.
    const sandbox = createMemorySandbox({ me: user(), d1: true });
    sandboxes.push(sandbox);
    const client = new Client({ runtime: sandbox.runtime });

    // Cross the SDK/runtime boundary using the Cloudflare-compatible D1 surface.
    await client.d1.exec(
      "CREATE TABLE messages (id INTEGER PRIMARY KEY, body TEXT, payload BLOB)",
    );
    await client.d1
      .prepare("INSERT INTO messages (body, payload) VALUES (?, ?)")
      .bind("hello", new Uint8Array([0, 255]))
      .run();

    // Observe persisted text and byte values through independent query modes.
    await expect(
      client.d1
        .prepare("SELECT body FROM messages WHERE id = ?")
        .bind(1)
        .first("body"),
    ).resolves.toBe("hello");
    const row = await client.d1
      .prepare("SELECT id, body, payload FROM messages")
      .first<{ id: number; body: string; payload: Uint8Array }>();
    expect(row).toMatchObject({ id: 1, body: "hello" });
    expect([...row!.payload]).toEqual([0, 255]);
  });

  test("D1 remains unavailable when the site did not opt in", async () => {
    const sandbox = createMemorySandbox({ me: user() });
    sandboxes.push(sandbox);

    expect(() =>
      new Client({ runtime: sandbox.runtime }).d1.prepare("SELECT 1"),
    ).not.toThrow();
    await expect(
      new Client({ runtime: sandbox.runtime }).d1.prepare("SELECT 1").all(),
    ).rejects.toBeInstanceOf(PluginUnavailableError);
  });
});

function user(): CurrentUser {
  return {
    id: "usr_ada",
    email: "ada@example.com",
    name: "Ada",
    profilePicture: null,
    viewer: {
      userId: "usr_ada",
      appId: "dap_intern",
      orgId: "org_engine",
      orgName: "Engine",
      orgSlug: "engine",
      orgRole: "admin",
      sandboxId: null,
    },
  };
}
