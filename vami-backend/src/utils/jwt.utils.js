// libs imports
import jwt from "jsonwebtoken";

export const generateToken = (payload, time) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: time });
};

export const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};
