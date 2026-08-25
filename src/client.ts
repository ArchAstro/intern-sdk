// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import { builtInClientPlugins } from "./plugins/builtins.js";
import { resolveInjectedRuntime } from "./runtime/global.js";
import { RuntimeProvider } from "./runtime/provider.js";
import type { InternRuntime, RuntimeResolver } from "./runtime/types.js";

export type ClientOptions =
  | { runtime?: InternRuntime; resolveRuntime?: never }
  | { runtime?: never; resolveRuntime: RuntimeResolver };

export class Client {
  readonly #runtime: RuntimeProvider;

  constructor(options: ClientOptions = {}) {
    const resolve = options.runtime
      ? () => options.runtime
      : (options.resolveRuntime ?? resolveInjectedRuntime);
    this.#runtime = new RuntimeProvider(resolve);

    for (const descriptor of builtInClientPlugins) {
      let plugin: unknown;
      Object.defineProperty(this, descriptor.key, {
        enumerable: true,
        configurable: false,
        get: () => (plugin ??= descriptor.create(this.#runtime)),
      });
    }
  }
}

export default Client;
