export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation error") {
    super(message, 422);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(message, 500);
  }
}

export const errorHandler = (err, req, res, _next) => {
  // Mongoose CastError = a path/query value that cannot be cast to the expected
  // type, e.g. /api/collections/undefined or /api/collections/not-an-id. That is
  // a client error; without this it surfaced as a 500 "Something went wrong",
  // which both hides the real cause and lets anyone generate error noise.
  if (err.name === "CastError") {
    err.statusCode = 400;
    err.status = "fail";
    err.isOperational = true;
    err.message = `Invalid ${err.path || "identifier"}`;
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production mode
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming or unknown errors
      console.error("ERROR 💥", err);
      res.status(500).json({
        status: "error",
        message: "Something went wrong",
      });
    }
  }
};
