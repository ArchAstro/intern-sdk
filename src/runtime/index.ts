// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

export type { MeImplementation } from "../plugins/me/implementation.js";
export { RuntimeProvider, validateRuntime } from "./provider.js";
export {
  createLegacyPluginFacade,
  createRuntimeHost,
  resolveInjectedRuntime,
  validateHost,
} from "./global.js";
export { INTERN_PROTOCOL_VERSION, INTERN_TRANSPORT_VERSION } from "./types.js";
export type {
  InternHost,
  InternRuntime,
  LegacyPluginFacade,
  RuntimeTransport,
  RuntimeTransportFailure,
  RuntimeTransportFailureCode,
  RuntimeResolver,
} from "./types.js";
export {
  decodeRuntimeWireValue,
  encodeRuntimeWireValue,
  type RuntimeWireValue,
} from "./wire.js";
