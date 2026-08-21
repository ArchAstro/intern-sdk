// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import {
  InternSDKError,
  PluginContractError,
  PluginUnavailableError,
  RuntimeContractError,
  RuntimeProtocolError,
  RuntimeUnavailableError,
} from "../errors.js";
import type { InternRuntime, RuntimeResolver } from "./types.js";
import { INTERN_PROTOCOL_VERSION, INTERN_TRANSPORT_VERSION } from "./types.js";

export class RuntimeProvider {
  readonly #resolve: RuntimeResolver;

  constructor(resolve: RuntimeResolver) {
    this.#resolve = resolve;
  }

  async invoke<Output>(
    binding: string,
    operation: string,
    input: unknown,
  ): Promise<Output> {
    const runtime = validateRuntime(this.#resolve());
    try {
      return (await runtime.transport.invoke(
        binding,
        operation,
        input,
      )) as Output;
    } catch (error) {
      if (error instanceof InternSDKError) throw error;
      if (isTransportFailure(error, "plugin_unavailable")) {
        throw new PluginUnavailableError(binding);
      }
      if (isTransportFailure(error, "plugin_contract_error")) {
        throw new PluginContractError(`${binding}.${operation}`);
      }
      throw error;
    }
  }
}

export function validateRuntime(value: unknown): InternRuntime {
  if (typeof value !== "object" || value === null)
    throw new RuntimeUnavailableError();
  const candidate = value as Partial<InternRuntime>;
  if (candidate.protocolVersion !== INTERN_PROTOCOL_VERSION) {
    throw new RuntimeProtocolError(candidate.protocolVersion);
  }
  if (
    typeof candidate.transport !== "object" ||
    candidate.transport === null ||
    candidate.transport.version !== INTERN_TRANSPORT_VERSION ||
    typeof candidate.transport.invoke !== "function"
  ) {
    throw new RuntimeContractError(
      `transport version ${INTERN_TRANSPORT_VERSION} with invoke must be available`,
    );
  }
  return candidate as InternRuntime;
}

function isTransportFailure(value: unknown, code: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    value.code === code
  );
}
