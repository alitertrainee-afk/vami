// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  registerUserService,
  loginUserService,
  refreshTokenService,
  logoutService,
  verifyEmailService,
  resendVerificationService,
} from "../services/auth.service.js";


// constants for auth
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
};

export const registerUser = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUserService(req.body);

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendResponse(res, 201, "User registered successfully", {
    user,
    token: accessToken,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUserService(req.body);

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendResponse(res, 200, "Login successful", {
    user,
    token: accessToken,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  const { user, accessToken, refreshToken: newRefreshToken } =
    await refreshTokenService(token);

  // Rotate the refresh token cookie
  res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

  return sendResponse(res, 200, "Token refreshed", {
    user,
    token: accessToken,
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  // Blacklist the refresh token JTI so it cannot be reused after logout
  await logoutService(token);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });

  return sendResponse(res, 200, "Logged out successfully");
});

/**
 * GET /auth/verify-email?token=<token>
 * Verifies the user's email address using the signed token from the email link.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const user = await verifyEmailService(token);
  return sendResponse(res, 200, "Email verified successfully", { user });
});

/**
 * POST /auth/resend-verification
 * Protected — requires a valid access token. Re-sends the verification email.
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const result = await resendVerificationService(req.user._id);
  return sendResponse(res, 200, result.message);
});
