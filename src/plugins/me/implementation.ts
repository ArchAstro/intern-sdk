// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { CurrentUser, MeUpdate } from "./types.js";

export interface MeImplementation {
  get(): Promise<CurrentUser>;
  update(input: MeUpdate): Promise<CurrentUser>;
}

export function isMeImplementation(value: unknown): value is MeImplementation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MeImplementation>;
  return (
    typeof candidate.get === "function" &&
    typeof candidate.update === "function"
  );
}
