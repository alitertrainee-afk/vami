// local utilities
import { verifyJWTToken } from "../utils/jwt.utils.js";
import { ApiError } from "../utils/ApiError.js";

// local repository
import { findUserById } from "../repository/user.repository.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return next(new ApiError(401, "Not authorized, no token"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = verifyJWTToken(token);

    if (!decoded) {
      return next(new ApiError(401, "Not authorized, invalid token"));
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      return next(new ApiError(401, "Not authorized, user no longer exists"));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new ApiError(401, "Not authorized, token failed"));
  }
};
