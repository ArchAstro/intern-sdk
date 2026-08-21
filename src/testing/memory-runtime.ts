// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { CurrentUser } from "../plugins/me/types.js";
import { createRuntimeHost } from "../runtime/global.js";
import type { InternHost, InternRuntime } from "../runtime/types.js";
import { INTERN_PROTOCOL_VERSION } from "../runtime/types.js";
import { MemoryMeImplementation } from "./memory-me.js";

export interface MemorySandboxOptions {
  me: CurrentUser;
}

export interface MemorySandbox {
  readonly host: InternHost;
  readonly runtime: InternRuntime;
  readonly me: MemoryMeImplementation;
}

export function createMemorySandbox(
  options: MemorySandboxOptions,
): MemorySandbox {
  const me = new MemoryMeImplementation(options.me);
  const runtime: InternRuntime = {
    protocolVersion: INTERN_PROTOCOL_VERSION,
    plugins: { me },
  };
  return {
    me,
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
