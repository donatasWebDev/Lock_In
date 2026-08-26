declare module "node:sqlite" {
  export type SQLInputValue =
    | null
    | number
    | bigint
    | string
    | Uint8Array
    | ArrayBuffer;

  export interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    get(...params: SQLInputValue[]): unknown;
    all(...params: SQLInputValue[]): unknown[];
    run(...params: SQLInputValue[]): StatementResultingChanges;
  }

  export class DatabaseSync {
    constructor(
      path: string,
      options?: {
        timeout?: number;
        enableForeignKeyConstraints?: boolean;
      }
    );
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
