export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly remediation: string;

  constructor(
    message: string,
    statusCode = 400,
    errorCode = 'BAD_REQUEST',
    remediation = 'Verify the request parameters and try again.',
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.remediation = remediation;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

