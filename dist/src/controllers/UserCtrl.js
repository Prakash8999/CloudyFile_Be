"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userExist = exports.logoutUser = exports.readUser = exports.tokenRegen = exports.loginUser = exports.verifyUser = exports.insertUser = exports.googleAuth = void 0;
const UserValidator_1 = require("../validators/UserValidator");
const UserModel_1 = __importDefault(require("../models/UserModel"));
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const responseHandler_1 = require("../helper/middleware/responseHandler");
const bcrypt_1 = __importDefault(require("bcrypt"));
const email_1 = require("../helper/email/email");
const templates_1 = require("../helper/email/templates");
const zod_1 = require("zod");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleAuth = async (req, res) => {
    try {
        const { id_token } = req.body;
        if (!id_token) {
            res.status(400).json({ message: 'ID token is required' });
            return;
        }
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            (0, responseHandler_1.errorHandler)(res, "Invalid token", 400, {});
            return;
        }
        const { email, name, picture } = payload;
        if (!email || !name || !picture) {
            (0, responseHandler_1.errorHandler)(res, "Invalid token payload", 400, {});
            return;
        }
        const findUser = await UserModel_1.default.findOne({ where: { email: email }, attributes: ['email', 'id'] });
        let userDbId = findUser?.dataValues?.id;
        if (!findUser) {
            const addData = {
                fullName: name,
                email: email,
                profileUrl: picture,
                isEmailVerified: true,
                role: 'user',
                provider: 'google',
                createdOn: new Date(),
                updatedOn: new Date(),
                providerId: payload.sub
            };
            const newUser = await UserModel_1.default.create(addData);
            userDbId = newUser.dataValues.id;
        }
        const token = jsonwebtoken_1.default.sign({ userId: userDbId }, process.env.JWT_SECRET, {
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
            expiresIn: '1d'
        });
        // console.log(process.env.FRONTEND_URL)
        const refreshToken = jsonwebtoken_1.default.sign({ userId: userDbId }, process.env.REFRESH_SECRET_KEY, {
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
            expiresIn: '7d'
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, // set to true in production
            sameSite: 'lax', // 'none' requires HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        (0, responseHandler_1.successHandler)(res, "User created successfully", {
            token: token,
            redirectUrl: `/dashboard`,
        }, 201);
        return;
    }
    catch (error) {
        console.error('Google auth error', error);
        (0, responseHandler_1.errorHandler)(res, "Google authentication error", 500, error.message);
        return;
    }
};
exports.googleAuth = googleAuth;
const insertUser = async (req, res) => {
    try {
        const validatedData = UserValidator_1.userValidator.parse(req.body);
        const findUser = await UserModel_1.default.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id'] });
        if (findUser) {
            (0, responseHandler_1.errorHandler)(res, "User already exists! Please login", 400, {});
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(validatedData.password, 10);
        console.log("hashedPassword", hashedPassword);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const addData = {
            ...validatedData,
            otp: otp,
            provider: 'email',
            role: 'user',
            password: hashedPassword,
            isEmailVerified: false,
            createdOn: new Date(),
            updatedOn: new Date(),
        };
        const user = await UserModel_1.default.create(addData);
        if (!user) {
            (0, responseHandler_1.errorHandler)(res, "User not created! Please try again", 400, {});
            return;
        }
        delete user.dataValues.password;
        const sendMailResponse = await (0, email_1.sendMail)(validatedData.email, "CloudyFiles - Verify your email", (0, templates_1.authOtpEmailTemp)(Number(otp), true));
        if (sendMailResponse.error) {
            console.error('Send mail error', sendMailResponse.message);
            (0, responseHandler_1.errorHandler)(res, "Failed to send verification email! Please try again later or use another method", 500, sendMailResponse.message);
            return;
        }
        (0, responseHandler_1.successHandler)(res, "Please verify your email to complete registration", {}, 201);
        return;
    }
    catch (error) {
        console.error('Insert user error', error);
        if (error instanceof zod_1.z.ZodError) {
            const firstErrorMessage = error.errors[0]?.message || "Failed to insert user";
            (0, responseHandler_1.errorHandler)(res, firstErrorMessage, 400, "Failed to insert user");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to insert user. Please try again or use another method", 500, error.message);
    }
};
exports.insertUser = insertUser;
const verifyUser = async (req, res) => {
    try {
        const validatedData = UserValidator_1.verifyUserValidator.parse(req.body);
        const findUser = await UserModel_1.default.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id', 'otp', 'fullName'] });
        if (!findUser) {
            (0, responseHandler_1.errorHandler)(res, "User not found", 400, {});
            return;
        }
        if (findUser.dataValues.otp !== validatedData.otp) {
            (0, responseHandler_1.errorHandler)(res, "Invalid OTP", 400, {});
            return;
        }
        await UserModel_1.default.update({ isEmailVerified: true, otp: null }, { where: { email: validatedData.email } });
        const token = jsonwebtoken_1.default.sign({ userId: findUser.dataValues?.id }, process.env.JWT_SECRET, {
            expiresIn: '1d',
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
        });
        const refreshToken = jsonwebtoken_1.default.sign({ email: findUser.dataValues?.email, name: findUser.dataValues?.fullName, userId: findUser.dataValues?.id }, process.env.REFRESH_SECRET_KEY, {
            expiresIn: '7d',
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, // true in production (https)
            sameSite: 'lax', // or 'Lax' depending on frontend/backend domains
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        (0, responseHandler_1.successHandler)(res, "User verified successfully", {
            token: token,
            redirectUrl: `/dashboard`,
        }, 201);
    }
    catch (error) {
        console.error('Verify user error', error);
        if (error instanceof zod_1.z.ZodError) {
            const firstErrorMessage = error.errors[0]?.message || "Failed to verify user";
            (0, responseHandler_1.errorHandler)(res, firstErrorMessage, 400, "Failed to verify user");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to verify user", 500, error.message);
    }
};
exports.verifyUser = verifyUser;
const loginUser = async (req, res) => {
    try {
        const validatedData = UserValidator_1.loginUserValidator.parse(req.body);
        const findUser = await UserModel_1.default.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id', 'password', 'isEmailVerified', 'twoFa'] });
        if (!findUser) {
            (0, responseHandler_1.errorHandler)(res, "Invalid Credentials.", 400, {});
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(validatedData.password, findUser.dataValues.password);
        if (!isPasswordValid) {
            (0, responseHandler_1.errorHandler)(res, "Invalid Credentials", 400, {});
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        if (!findUser.dataValues.isEmailVerified) {
            await UserModel_1.default.update({ otp: otp }, { where: { email: validatedData.email } });
            const sendMailResponse = await (0, email_1.sendMail)(validatedData.email, "CloudyFiles - Verify your email", (0, templates_1.authOtpEmailTemp)(Number(otp), false));
            if (sendMailResponse.error) {
                console.error('Send mail error', sendMailResponse.message);
                (0, responseHandler_1.errorHandler)(res, "Failed to send verification email! Please try again later or use another method", 500, {});
                return;
            }
            (0, responseHandler_1.errorHandler)(res, "You are not verified. Please verify your email to continue.", 400, { otp: true });
            return;
        }
        // console.log("findUser.dataValues", findUser.dataValues)
        if (findUser.dataValues.twoFa) {
            await UserModel_1.default.update({ otp: otp }, { where: { email: validatedData.email } });
            const sendMailResponse = await (0, email_1.sendMail)(validatedData.email, "CloudyFiles - Verify your email", (0, templates_1.authOtpEmailTemp)(Number(otp), false));
            if (sendMailResponse.error) {
                console.error('Send mail error', sendMailResponse.message);
                (0, responseHandler_1.errorHandler)(res, "Failed to send verification email! Please try again later or use another method", 500, {});
                return;
            }
            (0, responseHandler_1.successHandler)(res, "OTP sent to your registered email for two-factor authentication.", { otp: true }, 200);
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: findUser.dataValues?.id }, process.env.JWT_SECRET, {
            expiresIn: '1d',
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: findUser.dataValues?.id }, process.env.REFRESH_SECRET_KEY, {
            expiresIn: '7d',
            issuer: 'cloudyfile-backend',
            audience: 'cloudyfile-users',
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, // set to true in production
            sameSite: 'lax', // 'none' requires HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        (0, responseHandler_1.successHandler)(res, "User logged in successfully", {
            email: findUser.dataValues?.email,
            token: token,
            redirectUrl: `/dashboard`,
        }, 201);
        return;
    }
    catch (error) {
        console.error('Login user error', error);
        if (error instanceof zod_1.z.ZodError) {
            const firstErrorMessage = error.errors[0]?.message || "Failed to verify user";
            (0, responseHandler_1.errorHandler)(res, firstErrorMessage, 400, "Failed to login user");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to login user", 500, error.message);
    }
};
exports.loginUser = loginUser;
// export const addPassword = async (req: Request, res: Response) => {
// 	try {
// 		const { password } = req.body;
// 		if (!password) {
// 			errorHandler(res, "Password is required", 400, {})
// 			return
// 		}
// 		const hashedPassword = await bcrypt.hash(password, 10)
// 		await UserModel.update({ password: hashedPassword }, { where: { email: req.user.email } })
// 		successHandler(res, "Password added successfully", {}, 201)
// 		return
// 	} catch (error: any) {
// 		console.error('Add password error', error);
// 		errorHandler(res, "Add password error", 500, error.message);
// 	}
// }
const tokenRegen = async (req, res) => {
    try {
        console.log("Inside");
        const refreshToken = req.cookies.refreshToken;
        console.log("refreshToken ", refreshToken);
        if (!refreshToken) {
            (0, responseHandler_1.errorHandler)(res, "Something went wrong", 401, {});
            return;
        }
        // const decodeToken = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY!) as AuthenticatedUser
        // const token = jwt.sign({ userId: decodeToken.userId }, process.env.JWT_SECRET!, {
        // 	expiresIn: '1d',
        // 	issuer: 'cloudyfile-backend',
        // 	audience: 'cloudyfile-users',
        // })
        (0, responseHandler_1.successHandler)(res, "Success", {
        // token: token,
        }, 201);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "An error occurred", 500, error.message);
        return;
    }
};
exports.tokenRegen = tokenRegen;
const readUser = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await UserModel_1.default.findOne({
            where: {
                id: userId,
                block: false
            },
            attributes: ['fullName', 'email', 'timeZone', 'company', 'twoFa', 'profileUrl']
        });
        if (!user) {
            (0, responseHandler_1.errorHandler)(res, "User does not exist", 404, {});
            return;
        }
        (0, responseHandler_1.successHandler)(res, "User data fetched successfully", user, 200);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Failed to fetched user data", 500, error?.message);
    }
};
exports.readUser = readUser;
const logoutUser = async (req, res) => {
    try {
        const clearRefreshTokenCookie = (res) => {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                //   sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
                sameSite: 'lax'
            });
        };
        (0, responseHandler_1.successHandler)(res, "Logged Out Successfully", {}, 200);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Something went wrong", 500, error?.message);
    }
};
exports.logoutUser = logoutUser;
const userExist = async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) {
            (0, responseHandler_1.errorHandler)(res, "Email is required", 400, {});
            return;
        }
        const validatedEmail = zod_1.z.string().email().parse(email);
        if (!validatedEmail) {
            (0, responseHandler_1.errorHandler)(res, "Invalid email", 400, {});
            return;
        }
        const user = await UserModel_1.default.findOne({
            where: {
                email: validatedEmail,
                block: false
            },
            attributes: ['id', 'email', 'fullName', 'profileUrl']
        });
        if (!user) {
            (0, responseHandler_1.errorHandler)(res, "User does not exist", 404, {});
            return;
        }
        if (user.dataValues.id === req.user?.userId) {
            (0, responseHandler_1.errorHandler)(res, "You cannot share file with yourself", 400, {});
            return;
        }
        (0, responseHandler_1.successHandler)(res, "User exists", user.dataValues, 200);
        return;
    }
    catch (error) {
        console.error('User exist error', error);
        if (error instanceof zod_1.z.ZodError) {
            const firstErrorMessage = error.errors[0]?.message || "Invalid email format";
            (0, responseHandler_1.errorHandler)(res, firstErrorMessage, 400, "Invalid email format");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to check user existence", 500, error.message);
    }
};
exports.userExist = userExist;
