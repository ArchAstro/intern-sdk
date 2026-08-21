// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

// Version 1 is the deployed host envelope. The generic transport is an
// additive capability so hosts can expose it alongside the legacy facade
// before sites adopt a transport-aware SDK.
export const INTERN_PROTOCOL_VERSION = 1 as const;
export const INTERN_TRANSPORT_VERSION = 1 as const;

export type RuntimeTransportFailureCode =
  | "plugin_unavailable"
  | "plugin_contract_error";

export interface RuntimeTransportFailure {
  readonly code: RuntimeTransportFailureCode;
}

/**
 * The only plugin call surface a host must inject. Bindings and operations are
 * opaque to the runtime protocol; typed plugin clients own their public API.
 */
export interface RuntimeTransport {
  readonly version: typeof INTERN_TRANSPORT_VERSION;
  invoke(binding: string, operation: string, input: unknown): Promise<unknown>;
}

export type LegacyPluginFacade = Readonly<
  Record<
    string,
    Readonly<Record<string, (input?: unknown) => Promise<unknown>>>
  >
>;

export interface InternRuntime {
  readonly protocolVersion: typeof INTERN_PROTOCOL_VERSION;
  readonly transport: RuntimeTransport;
  /** Transitional facade consumed by already-compiled protocol-v1 clients. */
  readonly plugins?: LegacyPluginFacade;
}

export type RuntimeResolver = () => unknown;

export interface InternHost {
  readonly protocolVersion: typeof INTERN_PROTOCOL_VERSION;
  resolveRuntime: RuntimeResolver;
}
