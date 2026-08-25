// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

export type D1Value = null | number | string | ArrayBuffer | ArrayBufferView;
export type D1Row = Record<string, unknown>;

export interface D1Meta {
  duration?: number;
  changes?: number;
  last_row_id?: number;
  rows_read?: number;
  rows_written?: number;
  size_after?: number;
  changed_db?: boolean;
  served_by?: string;
  [key: string]: unknown;
}

export interface D1Result<T = D1Row> {
  success: boolean;
  results: T[];
  meta: D1Meta;
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = D1Row>(columnName?: string): Promise<T | null>;
  run<T = D1Row>(): Promise<D1Result<T>>;
  all<T = D1Row>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

export interface D1Plugin {
  prepare(query: string): D1PreparedStatement;
  batch<T = D1Row>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1Result<T>>>;
  exec(query: string): Promise<D1ExecResult>;
}

declare module "../../client.js" {
  interface Client {
    readonly d1: D1Plugin;
  }
}
