// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  registerUserService,
  loginUserService,
  refreshTokenService,
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
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });

  return sendResponse(res, 200, "Logged out successfully");
});
