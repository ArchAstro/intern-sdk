// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { RuntimeProvider } from "../runtime/provider.js";
import { D1PluginClient } from "./d1/plugin.js";
import { MePluginClient } from "./me/plugin.js";

export interface ClientPluginDescriptor {
  readonly key: string;
  create(runtime: RuntimeProvider): unknown;
}

// New built-ins register at this composition edge. Client and generic runtime
// resolution do not branch on plugin names.
export const builtInClientPlugins: readonly ClientPluginDescriptor[] = [
  {
    key: "d1",
    create: (runtime) => new D1PluginClient(runtime),
  },
  {
    key: "me",
    create: (runtime) => new MePluginClient(runtime),
  },
];
