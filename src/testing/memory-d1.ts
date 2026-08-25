// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type {
  D1Implementation,
  D1ImplementationValue,
  D1QueryRequest,
  D1StatementRequest,
} from "../plugins/d1/implementation.js";
import type { D1ExecResult, D1Result, D1Row } from "../plugins/d1/types.js";

export class MemoryD1Implementation implements D1Implementation {
  readonly #database: DatabaseSync;

  constructor() {
    this.#database = new DatabaseSync(":memory:");
  }

  async query(request: D1QueryRequest): Promise<unknown> {
    const statement = this.#database.prepare(request.sql);
    const params = request.params.map(decodeValue);
    const started = performance.now();
    if (request.mode === "run") {
      const result = statement.run(...params);
      return d1Result(
        [],
        performance.now() - started,
        result.changes,
        result.lastInsertRowid,
      );
    }

    const rows = statement.all(...params).map(normalizeRow);
    if (request.mode === "all") {
      return d1Result(rows, performance.now() - started, 0, 0);
    }
    if (request.mode === "first") {
      const row = rows[0];
      if (row === undefined) return null;
      if (request.columnName === undefined) return row;
      if (!Object.hasOwn(row, request.columnName)) {
        throw new Error(`D1 column not found: ${request.columnName}`);
      }
      return row[request.columnName];
    }
    const columns = statement.columns().map((column) => column.name);
    const rawRows = rows.map((row) => columns.map((column) => row[column]));
    return request.columnNames ? [columns, ...rawRows] : rawRows;
  }

  async batch(request: {
    statements: readonly D1StatementRequest[];
  }): Promise<Array<D1Result<D1Row>>> {
    this.#database.exec("BEGIN");
    try {
      const results = request.statements.map((item) => {
        const statement = this.#database.prepare(item.sql);
        const params = item.params.map(decodeValue);
        const started = performance.now();
        if (statement.columns().length === 0) {
          const result = statement.run(...params);
          return d1Result(
            [],
            performance.now() - started,
            result.changes,
            result.lastInsertRowid,
          );
        }
        return d1Result(
          statement.all(...params).map(normalizeRow),
          performance.now() - started,
          0,
          0,
        );
      });
      this.#database.exec("COMMIT");
      return results;
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(request: { sql: string }): Promise<D1ExecResult> {
    const started = performance.now();
    this.#database.exec(request.sql);
    return {
      count: request.sql.split(";").filter((part) => part.trim() !== "").length,
      duration: performance.now() - started,
    };
  }

  close(): void {
    this.#database.close();
  }
}

function decodeValue(value: D1ImplementationValue): SQLInputValue {
  if (typeof value === "object" && value !== null) {
    return value.$archastroBlob;
  }
  return value;
}

function normalizeRow(row: Record<string, SQLInputValue>): D1Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Uint8Array ? value.slice() : value,
    ]),
  );
}

function d1Result(
  rows: D1Row[],
  duration: number,
  changes: number | bigint,
  lastInsertRowid: number | bigint,
): D1Result<D1Row> {
  return {
    success: true,
    results: rows,
    meta: {
      duration,
      changes: Number(changes),
      last_row_id: Number(lastInsertRowid),
      rows_read: rows.length,
      rows_written: Number(changes),
    },
  };
}
