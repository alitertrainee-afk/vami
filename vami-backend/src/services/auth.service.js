// libs imports
import crypto from "crypto";

// local utilities
import { ApiError } from "../utils/ApiError.js";
import { generateToken, generateJti, verifyJWTToken } from "../utils/jwt.utils.js";
import {
    blacklistRefreshToken,
    isRefreshTokenBlacklisted,
    setEmailVerificationToken,
    getEmailVerificationToken,
    deleteEmailVerificationToken,
} from "../utils/cache.js";
import { sendVerificationEmail } from "../utils/email.utils.js";

// local repository
import {
    findUserByEmailOrUsername,
    createUser,
    findUserById,
    verifyUserEmail,
} from "../repository/user.repository.js";


// constants
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 604800 s

/**
 * Generate a token pair where the refresh token carries a unique JTI.
 * The JTI enables one-time-use enforcement and instant revocation.
 */
const generateTokenPair = (userId) => {
    const jti = generateJti();
    return {
        accessToken: generateToken({ id: userId }, ACCESS_TOKEN_EXPIRY),
        refreshToken: generateToken(
            { id: userId, type: "refresh", jti },
            REFRESH_TOKEN_EXPIRY,
        ),
        jti,
    };
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
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

    // Send verification email (fire-and-forget — never block registration)
    const evToken = crypto.randomBytes(32).toString("hex");
    await setEmailVerificationToken(evToken, user._id);
    sendVerificationEmail({ to: user.email, username: user.username, token: evToken }).catch(
        (err) => console.error("Verification email failed:", err.message),
    );

    const tokens = generateTokenPair(user._id);
    return { user, ...tokens };
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginUserService = async ({ email, username, password }) => {
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await findUserByEmailOrUsername({ email, username }, "+password");
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    const tokens = generateTokenPair(safeUser._id);
    return { user: safeUser, ...tokens };
};

// ---------------------------------------------------------------------------
// Token Rotation — one-time use enforce via JTI blacklist
// ---------------------------------------------------------------------------
export const refreshTokenService = async (rawRefreshToken) => {
    if (!rawRefreshToken) {
        throw new ApiError(401, "No refresh token provided");
    }

    const decoded = verifyJWTToken(rawRefreshToken);
    if (!decoded || decoded.type !== "refresh" || !decoded.jti) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // Reject any already-rotated or revoked token (prevents replay attacks)
    const revoked = await isRefreshTokenBlacklisted(decoded.jti);
    if (revoked) {
        throw new ApiError(401, "Refresh token has been revoked");
    }

    const user = await findUserById(decoded.id);
    if (!user) {
        throw new ApiError(401, "User not found");
    }

    // Blacklist the consumed JTI with its remaining lifetime so Redis auto-purges it
    const remainingTtl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
    await blacklistRefreshToken(decoded.jti, remainingTtl);

    const tokens = generateTokenPair(user._id);
    return { user, ...tokens };
};

// ---------------------------------------------------------------------------
// Logout — immediately revoke the refresh token
// ---------------------------------------------------------------------------
export const logoutService = async (rawRefreshToken) => {
    if (!rawRefreshToken) return;

    const decoded = verifyJWTToken(rawRefreshToken);
    if (!decoded?.jti) return;

    const remainingTtl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
    await blacklistRefreshToken(decoded.jti, remainingTtl);
};

// ---------------------------------------------------------------------------
// Email Verification
// ---------------------------------------------------------------------------
export const verifyEmailService = async (token) => {
    if (!token) {
        throw new ApiError(400, "Verification token is required");
    }

    const userId = await getEmailVerificationToken(token);
    if (!userId) {
        throw new ApiError(400, "Invalid or expired verification token");
    }

    const user = await verifyUserEmail(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    await deleteEmailVerificationToken(token);
    return user;
};

export const resendVerificationService = async (userId) => {
    const user = await findUserById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.emailVerified) throw new ApiError(400, "Email is already verified");

    const evToken = crypto.randomBytes(32).toString("hex");
    await setEmailVerificationToken(evToken, userId);

    sendVerificationEmail({ to: user.email, username: user.username, token: evToken }).catch(
        (err) => console.error("Resend verification email failed:", err.message),
    );

    return { message: "Verification email sent" };
};
