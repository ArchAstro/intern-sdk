// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { D1ExecResult, D1Result, D1Row } from "./types.js";

export interface D1BlobValue {
  readonly $archastroBlob: Uint8Array;
}

export type D1ImplementationValue = null | number | string | D1BlobValue;

export interface D1StatementRequest {
  readonly sql: string;
  readonly params: readonly D1ImplementationValue[];
}

export interface D1QueryRequest extends D1StatementRequest {
  readonly mode: "first" | "run" | "all" | "raw";
  readonly columnName?: string;
  readonly columnNames?: boolean;
}

export interface D1Implementation {
  query(request: D1QueryRequest): Promise<unknown>;
  batch(request: {
    statements: readonly D1StatementRequest[];
  }): Promise<Array<D1Result<D1Row>>>;
  exec(request: { sql: string }): Promise<D1ExecResult>;
}

export function isD1Implementation(value: unknown): value is D1Implementation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<D1Implementation>;
  return (
    typeof candidate.query === "function" &&
    typeof candidate.batch === "function" &&
    typeof candidate.exec === "function"
  );
}
