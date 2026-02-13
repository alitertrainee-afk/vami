// local imports
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";
import {
  registerUserService,
  loginUserService,
} from "../services/auth.service.js";

export const registerUser = asyncHandler(async (req, res) => {
  const user = await registerUserService(req.body);

  return sendResponse(res, 201, "User registered successfully", user);
});

export const loginUser = asyncHandler(async (req, res) => {
  const result = await loginUserService(req.body);

  return sendResponse(res, 200, "Login successful", result);
});
