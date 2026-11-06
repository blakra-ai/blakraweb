import type { Issue } from "./types";

/** RFC 9457 problem details returned by the backend, as a typed error. */
export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly detail: string | undefined;
  readonly issues: Issue[];
  readonly requestId: string | undefined;

  constructor(init: { status: number; type: string; title: string; detail?: string; issues?: Issue[]; requestId?: string }) {
    super(init.detail ?? init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.type = init.type;
    this.detail = init.detail;
    this.issues = init.issues ?? [];
    this.requestId = init.requestId;
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  static network(): ApiError {
    return new ApiError({ status: 0, type: "network", title: "Network error" });
  }
}
