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

    // user.create returns the document without password (select: false in schema)
    const tokens = generateTokenPair(user._id);

    return {
        user,
        ...tokens,
    };
};

export const loginUserService = async ({ email, username, password }) => {
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Single DB query: find user with password field included
    const user = await findUserByEmailOrUsername({ email, username }, "+password");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Strip password from the user object before returning
    const safeUser = user.toObject();
    delete safeUser.password;

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
