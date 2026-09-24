/** An error carrying the HTTP status the client should see. */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string) {
    return new AppError(400, message);
  }
  static notFound(message: string) {
    return new AppError(404, message);
  }
  /** The request is valid but conflicts with current state (e.g. table taken). */
  static conflict(message: string) {
    return new AppError(409, message);
  }
}
