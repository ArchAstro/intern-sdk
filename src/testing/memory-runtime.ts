// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { CurrentUser } from "../plugins/me/types.js";
import { PluginContractError, PluginUnavailableError } from "../errors.js";
import {
  createLegacyPluginFacade,
  createRuntimeHost,
} from "../runtime/global.js";
import type {
  InternHost,
  InternRuntime,
  RuntimeTransport,
} from "../runtime/types.js";
import {
  INTERN_PROTOCOL_VERSION,
  INTERN_TRANSPORT_VERSION,
} from "../runtime/types.js";
import { MemoryMeImplementation } from "./memory-me.js";

export interface MemorySandboxOptions {
  me: CurrentUser;
}

export interface MemorySandbox {
  readonly host: InternHost;
  readonly runtime: InternRuntime;
  readonly transport: MemoryRuntimeTransport;
  readonly me: MemoryMeImplementation;
}

/** Generic in-memory dispatcher for local hosts and plugin tests. */
export class MemoryRuntimeTransport implements RuntimeTransport {
  readonly version = INTERN_TRANSPORT_VERSION;
  readonly #bindings: Readonly<Record<string, object>>;

  constructor(bindings: Readonly<Record<string, object>>) {
    this.#bindings = bindings;
  }

  async invoke(
    binding: string,
    operation: string,
    input: unknown,
  ): Promise<unknown> {
    const implementation = this.#bindings[binding];
    if (implementation === undefined) throw new PluginUnavailableError(binding);
    const handler = (implementation as Record<string, unknown>)[operation];
    if (typeof handler !== "function") {
      throw new PluginContractError(`${binding}.${operation}`);
    }
    return Reflect.apply(handler, implementation, [input]);
  }
}

export function createMemorySandbox(
  options: MemorySandboxOptions,
): MemorySandbox {
  const me = new MemoryMeImplementation(options.me);
  const transport = new MemoryRuntimeTransport({ me });
  const runtime: InternRuntime = {
    protocolVersion: INTERN_PROTOCOL_VERSION,
    transport,
    plugins: createLegacyPluginFacade(transport),
  };
  return {
    me,
    transport,
    runtime,
    host: createRuntimeHost(() => runtime),
  };
}

export function installInjectedHost(host: InternHost): () => void {
  const hadPrevious = Object.hasOwn(globalThis, "intern");
  const previous = globalThis.intern;
  globalThis.intern = host;
  return () => {
    if (hadPrevious) globalThis.intern = previous;
    else Reflect.deleteProperty(globalThis, "intern");
  };
}

export function installInjectedRuntime(runtime: InternRuntime): () => void {
  return installInjectedHost(createRuntimeHost(() => runtime));
}
