import jwt from "jsonwebtoken";

export const generateToken = (payload, time) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: time });
};

export const verifyJWTToken = (token) => {
  try {
    // DEBUG LOG
    console.log("Verifying Token:", token.substring(0, 10) + "...");
    console.log("Using Secret:", process.env.JWT_SECRET);

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return null;
  }
};
