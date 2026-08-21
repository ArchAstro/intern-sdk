// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { MeImplementation } from "../plugins/me/implementation.js";

export const INTERN_PROTOCOL_VERSION = 1 as const;

export interface InternPluginImplementations {
  me: MeImplementation;
}

export interface InternRuntime {
  readonly protocolVersion: typeof INTERN_PROTOCOL_VERSION;
  readonly plugins: Partial<InternPluginImplementations>;
}

export type RuntimeResolver = () => unknown;

export interface InternHost {
  readonly protocolVersion: typeof INTERN_PROTOCOL_VERSION;
  resolveRuntime: RuntimeResolver;
}
