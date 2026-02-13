    // local imports
    import { ApiError } from "../utils/ApiError.js";
    import { generateToken } from "../utils/jwt.utils.js";
    import {
    findUserByEmailOrUsername,
    createUser,
    findUserById,
    } from "../repository/user.repository.js";

    export const registerUserService = async ({ username, email, password }) => {
    if ([username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await findUserByEmailOrUsername({
        username,
        email,
    });

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

    return createdUser;
    };

    export const loginUserService = async ({ email, username, password }) => {
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await findUserByEmailOrUsername({
        email,
        username,
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const userWithPassword = await findUserById(user._id, "+password");

    const isPasswordValid = await userWithPassword.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const token = generateToken({ id: user._id }, "7d");

    const safeUser = await findUserById(user._id);

    return {
        user: safeUser,
        token,
    };
    };
