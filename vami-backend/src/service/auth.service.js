// local imports
import { ApiError } from "../utils/ApiError.js";
import { generateToken, verifyJWTToken } from "../utils/jwt.utils.js";
import {
    findUserByEmailOrUsername,
    createUser,
    findUserById,
} from "../repository/user.repository.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Generate both access and refresh tokens for a user.
 */
const generateTokenPair = (userId) => ({
    accessToken: generateToken({ id: userId }, ACCESS_TOKEN_EXPIRY),
    refreshToken: generateToken({ id: userId, type: "refresh" }, REFRESH_TOKEN_EXPIRY),
});

export const registerUserService = async ({ username, email, password }) => {
    if ([username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await findUserByEmailOrUsername({ username, email });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const user = await createUser({
        username: username.toLowerCase(),
        email,
        password,
    });

    const createdUser = await findUserById(user._id);

    if (!createdUser) {
        throw new ApiError(500, "Failed to register user");
    }

    const tokens = generateTokenPair(createdUser._id);

    return {
        user: createdUser,
        ...tokens,
    };
};

export const loginUserService = async ({ email, username, password }) => {
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Single query with password included (reduces 3 DB queries to 1)
    const user = await findUserByEmailOrUsername({ email, username });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const userWithPassword = await findUserById(user._id, "+password");
    const isPasswordValid = await userWithPassword.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const safeUser = await findUserById(user._id);
    const tokens = generateTokenPair(safeUser._id);

    return {
        user: safeUser,
        ...tokens,
    };
};

export const refreshTokenService = async (refreshToken) => {
    if (!refreshToken) {
        throw new ApiError(401, "No refresh token provided");
    }

    const decoded = verifyJWTToken(refreshToken);

    if (!decoded || decoded.type !== "refresh") {
        throw new ApiError(401, "Invalid refresh token");
    }

    const user = await findUserById(decoded.id);

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    const tokens = generateTokenPair(user._id);

    return {
        user,
        ...tokens,
    };
};
