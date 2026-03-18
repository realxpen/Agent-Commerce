export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function createHttpError(statusCode: number, message: string) {
  return new AppError(statusCode, message);
}
