import { ApiError } from "../utils/ApiError.js";
import { sendResponse } from "../utils/responseHandler.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error isn't an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error ? 400 : 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || [], error.stack);
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return sendResponse(res, error.statusCode, error.message, response);
};

export { errorHandler };
