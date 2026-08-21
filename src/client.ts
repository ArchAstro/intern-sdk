// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import { MePluginClient, type MePlugin } from "./plugins/me/plugin.js";
import { resolveInjectedRuntime } from "./runtime/global.js";
import { RuntimeProvider } from "./runtime/provider.js";
import type { InternRuntime, RuntimeResolver } from "./runtime/types.js";

export type ClientOptions =
  | { runtime?: InternRuntime; resolveRuntime?: never }
  | { runtime?: never; resolveRuntime: RuntimeResolver };

export default class Client {
  readonly #runtime: RuntimeProvider;
  #me: MePlugin | undefined;

  constructor(options: ClientOptions = {}) {
    const resolve = options.runtime
      ? () => options.runtime
      : (options.resolveRuntime ?? resolveInjectedRuntime);
    this.#runtime = new RuntimeProvider(resolve);
  }

  get me(): MePlugin {
    return (this.#me ??= new MePluginClient(this.#runtime));
  }
}
