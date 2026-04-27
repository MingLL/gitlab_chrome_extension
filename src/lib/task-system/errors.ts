export class TaskSystemRequestError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string) {
    super(`任务系统请求失败：${path} (${status})`);
    this.name = 'TaskSystemRequestError';
    this.status = status;
    this.path = path;
  }
}

export class TaskSystemTransportError extends Error {
  readonly path: string;
  readonly phase: 'request' | 'parse';
  readonly cause: unknown;

  constructor(path: string, phase: 'request' | 'parse', cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);

    super(`任务系统传输失败：${path} (${phase}: ${detail})`);
    this.name = 'TaskSystemTransportError';
    this.path = path;
    this.phase = phase;
    this.cause = cause;
  }
}

export class TaskSystemResponseError extends Error {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`任务系统响应无效：${path} (${reason})`);
    this.name = 'TaskSystemResponseError';
    this.path = path;
  }
}
