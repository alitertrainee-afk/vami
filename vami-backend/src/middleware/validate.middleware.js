// libs imports
import { ZodError } from "zod";

// local imports
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, res, next) => {
  try {
    req.validatedData = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");

      return next(new ApiError(400, message));
    }

    next(error);
  }
};
