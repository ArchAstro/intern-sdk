// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import {
  PluginContractError,
  PluginUnavailableError,
  RuntimeContractError,
  RuntimeProtocolError,
  RuntimeUnavailableError,
} from "../errors.js";
import type {
  InternPluginImplementations,
  InternRuntime,
  RuntimeResolver,
} from "./types.js";
import { INTERN_PROTOCOL_VERSION } from "./types.js";

type ImplementationGuard<K extends keyof InternPluginImplementations> = (
  value: unknown,
) => value is InternPluginImplementations[K];

export class RuntimeProvider {
  readonly #resolve: RuntimeResolver;

  constructor(resolve: RuntimeResolver) {
    this.#resolve = resolve;
  }

  require<K extends keyof InternPluginImplementations>(
    name: K,
    guard: ImplementationGuard<K>,
  ): InternPluginImplementations[K] {
    const runtime = validateRuntime(this.#resolve());
    const implementation = runtime.plugins[name];
    if (implementation === undefined) throw new PluginUnavailableError(name);
    if (!guard(implementation)) throw new PluginContractError(name);
    return implementation;
  }
}

export function validateRuntime(value: unknown): InternRuntime {
  if (typeof value !== "object" || value === null)
    throw new RuntimeUnavailableError();
  const candidate = value as Partial<InternRuntime>;
  if (candidate.protocolVersion !== INTERN_PROTOCOL_VERSION) {
    throw new RuntimeProtocolError(candidate.protocolVersion);
  }
  if (typeof candidate.plugins !== "object" || candidate.plugins === null) {
    throw new RuntimeContractError("plugins must be an object");
  }
  return candidate as InternRuntime;
}
