// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type {
  D1ImplementationValue,
  D1StatementRequest,
} from "./implementation.js";
import type { RuntimeProvider } from "../../runtime/provider.js";
import type {
  D1ExecResult,
  D1Plugin,
  D1PreparedStatement,
  D1Result,
  D1Row,
  D1Value,
} from "./types.js";

export type { D1Plugin } from "./types.js";

/** @internal */
export class D1PluginClient implements D1Plugin {
  readonly #runtime: RuntimeProvider;

  /** @internal Client owns plugin construction. */
  constructor(runtime: RuntimeProvider) {
    this.#runtime = runtime;
  }

  prepare(query: string): D1PreparedStatement {
    validateSQL(query);
    return new PreparedStatement(this.#runtime, query, []);
  }

  async batch<T = D1Row>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1Result<T>>> {
    const requests = statements.map((statement) => {
      if (!(statement instanceof PreparedStatement)) {
        throw new TypeError(
          "batch only accepts statements prepared by this D1 database",
        );
      }
      return statement.requestFor(this.#runtime);
    });
    return decodeBlobs(
      await this.#runtime.invoke("d1", "batch", { statements: requests }),
    ) as Array<D1Result<T>>;
  }

  async exec(query: string): Promise<D1ExecResult> {
    validateSQL(query);
    return this.#runtime.invoke("d1", "exec", { sql: query });
  }
}

class PreparedStatement implements D1PreparedStatement {
  readonly #runtime: RuntimeProvider;
  readonly #sql: string;
  readonly #params: readonly D1ImplementationValue[];

  constructor(
    runtime: RuntimeProvider,
    sql: string,
    params: readonly D1ImplementationValue[],
  ) {
    this.#runtime = runtime;
    this.#sql = sql;
    this.#params = params;
  }

  bind(...values: D1Value[]): D1PreparedStatement {
    return new PreparedStatement(
      this.#runtime,
      this.#sql,
      values.map(encodeValue),
    );
  }

  async first<T = D1Row>(columnName?: string): Promise<T | null> {
    const request = {
      ...this.requestFor(this.#runtime),
      mode: "first" as const,
      ...(columnName === undefined ? {} : { columnName }),
    };
    return decodeBlobs(
      await this.#runtime.invoke("d1", "query", request),
    ) as T | null;
  }

  async run<T = D1Row>(): Promise<D1Result<T>> {
    return decodeBlobs(
      await this.#runtime.invoke("d1", "query", {
        ...this.requestFor(this.#runtime),
        mode: "run",
      }),
    ) as D1Result<T>;
  }

  async all<T = D1Row>(): Promise<D1Result<T>> {
    return decodeBlobs(
      await this.#runtime.invoke("d1", "query", {
        ...this.requestFor(this.#runtime),
        mode: "all",
      }),
    ) as D1Result<T>;
  }

  async raw<T = unknown[]>(
    options: { columnNames?: boolean } = {},
  ): Promise<T[]> {
    return decodeBlobs(
      await this.#runtime.invoke("d1", "query", {
        ...this.requestFor(this.#runtime),
        mode: "raw",
        ...options,
      }),
    ) as T[];
  }

  requestFor(runtime: RuntimeProvider): D1StatementRequest {
    if (runtime !== this.#runtime) {
      throw new TypeError(
        "cannot batch statements from different D1 databases",
      );
    }
    return { sql: this.#sql, params: this.#params };
  }
}

function validateSQL(sql: string): void {
  if (typeof sql !== "string" || sql.trim() === "") {
    throw new TypeError("D1 SQL must be a non-empty string");
  }
}

function encodeValue(value: D1Value): D1ImplementationValue {
  if (value instanceof ArrayBuffer) {
    return { $archastroBlob: new Uint8Array(value.slice(0)) };
  }
  if (ArrayBuffer.isView(value)) {
    return {
      $archastroBlob: new Uint8Array(
        value.buffer.slice(
          value.byteOffset,
          value.byteOffset + value.byteLength,
        ),
      ),
    };
  }
  return value;
}

function decodeBlobs(value: unknown): unknown {
  if (value instanceof Uint8Array) return value.slice();
  if (Array.isArray(value)) return value.map(decodeBlobs);
  if (typeof value !== "object" || value === null) return value;
  const object = value as Record<string, unknown>;
  if (
    Object.keys(object).length === 1 &&
    Object.hasOwn(object, "$archastroBlob")
  ) {
    const blob = object.$archastroBlob;
    if (blob instanceof Uint8Array) return blob.slice();
    if (typeof blob === "string") return decodeBase64(blob);
    throw new TypeError("Invalid D1 blob encoding");
  }
  return Object.fromEntries(
    Object.entries(object).map(([key, child]) => [key, decodeBlobs(child)]),
  );
}

function decodeBase64(encoded: string): Uint8Array {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      encoded,
    )
  ) {
    throw new TypeError("Invalid D1 blob encoding");
  }
  const result: number[] = [];
  for (let index = 0; index < encoded.length; index += 4) {
    const first = alphabet.indexOf(encoded[index] ?? "");
    const second = alphabet.indexOf(encoded[index + 1] ?? "");
    const third =
      encoded[index + 2] === "="
        ? 0
        : alphabet.indexOf(encoded[index + 2] ?? "");
    const fourth =
      encoded[index + 3] === "="
        ? 0
        : alphabet.indexOf(encoded[index + 3] ?? "");
    const bits = (first << 18) | (second << 12) | (third << 6) | fourth;
    result.push((bits >> 16) & 255);
    if (encoded[index + 2] !== "=") result.push((bits >> 8) & 255);
    if (encoded[index + 3] !== "=") result.push(bits & 255);
  }
  return Uint8Array.from(result);
}
