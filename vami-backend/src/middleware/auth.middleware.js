// local imports
import { verifyJWTToken } from "../utils/jwt.utils.js";
import { findUserById } from "../repository/user.repository.js";
import { sendResponse } from "../utils/responseHandler.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // get bearer token from header
      token = req.headers.authorization.split(" ")[1];

      // decode the bearer token
      const decoded = verifyJWTToken(token);

      // get user from the token and attach to req object
      req.user = await findUserById(decoded?.id);

      return next();
    } catch (error) {
      console.error(error);
      return sendResponse(res, 401, "Not authorized, token failed", {
        error: error.message,
      });
    }
  }

  if (!token) {
    return sendResponse(res, 401, "Not authorized, no token");
  }
};
