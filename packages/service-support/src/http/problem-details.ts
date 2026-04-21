export type ProblemDetailsInput = {
  title: string;
  status: number;
  detail: string;
  code: string;
  correlationId: string;
  details?: unknown;
};

export function problemDetails(input: ProblemDetailsInput) {
  const base = {
    type: "about:blank",
    title: input.title,
    status: input.status,
    detail: input.detail,
    code: input.code,
    correlationId: input.correlationId,
  };

  if (input.details === undefined) {
    return base;
  }

  return {
    ...base,
    details: input.details,
  };
}
