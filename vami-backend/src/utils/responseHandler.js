import { ApiResponse } from "./ApiResponse.js";

const sendResponse = (res, statusCode, message, data = null) => {
  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, data, message));
};

export { sendResponse };
