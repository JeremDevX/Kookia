export class WorkspaceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly duplicates?: Array<{ id: string; version: string; date: string }>) { super(message); }
}
