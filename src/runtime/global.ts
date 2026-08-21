// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import {
  RuntimeContractError,
  RuntimeProtocolError,
  RuntimeUnavailableError,
} from "../errors.js";
import {
  INTERN_PROTOCOL_VERSION,
  type InternHost,
  type RuntimeResolver,
} from "./types.js";

declare global {
  // Intern hosts inject this protocol before client operations execute.
  // eslint-disable-next-line no-var
  var intern: InternHost | undefined;
}

export function resolveInjectedRuntime(): unknown {
  return validateHost(globalThis.intern).resolveRuntime();
}

export function createRuntimeHost(resolveRuntime: RuntimeResolver): InternHost {
  return {
    protocolVersion: INTERN_PROTOCOL_VERSION,
    resolveRuntime,
  };
}

export function validateHost(value: unknown): InternHost {
  if (typeof value !== "object" || value === null)
    throw new RuntimeUnavailableError();
  const candidate = value as Partial<InternHost>;
  if (candidate.protocolVersion !== INTERN_PROTOCOL_VERSION) {
    throw new RuntimeProtocolError(candidate.protocolVersion);
  }
  if (typeof candidate.resolveRuntime !== "function") {
    throw new RuntimeContractError("resolveRuntime must be a function");
  }
  return candidate as InternHost;
}
