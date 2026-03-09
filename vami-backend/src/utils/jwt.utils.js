// libs imports
import jwt from "jsonwebtoken";
import crypto from "crypto";

/** Cryptographically random JWT ID — used to uniquely identify refresh tokens. */
export const generateJti = () => crypto.randomUUID();

/**
 * @param {object} payload  - Claims to embed.
 * @param {string} time     - Expiry string accepted by jsonwebtoken (e.g. "15m", "7d").
 * @returns {string} Signed JWT
 */
export const generateToken = (payload, time) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: time });
};

export const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};
