export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  correlationId: string;
  details?: unknown[];
};

export function problemDetails(input: {
  title: string;
  status: number;
  detail: string;
  code: string;
  correlationId: string;
  details?: unknown[];
}): ProblemDetails {
  const problem: ProblemDetails = {
    type: `https://labellens.app/errors/${input.code}`,
    title: input.title,
    status: input.status,
    detail: input.detail,
    code: input.code,
    correlationId: input.correlationId
  };

  if (input.details !== undefined) {
    problem.details = input.details;
  }

  return problem;
}
