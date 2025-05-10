import { Request, Response } from "express";
import { loginUserValidator, userValidator, verifyUserValidator } from "../validators/UserValidator";
import UserModel from "../models/UserModel";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import bcrypt from "bcrypt";
import { sendMail } from "../helper/email/email";
import { authOtpEmailTemp } from "../helper/email/templates";
import { z } from "zod";
import { AuthenticatedUser, CustomRequest } from "../helper/middleware/authUser";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
	try {
		const { id_token } = req.body;
		if (!id_token) {
			res.status(400).json({ message: 'ID token is required' });
			return
		}
		const ticket = await client.verifyIdToken({
			idToken: id_token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		if (!payload) {
			errorHandler(res, "Invalid token", 400, {})
			return
		}

		const { email, name, picture } = payload;
		if (!email || !name || !picture) {
			errorHandler(res, "Invalid token payload", 400, {})
			return
		}

		const findUser = await UserModel.findOne({ where: { email: email }, attributes: ['email', 'id'] });

		let userDbId = findUser?.dataValues?.id

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
			}
			const newUser = await UserModel.create(addData);
			userDbId = newUser.dataValues.id;
		}
		const token = jwt.sign({ userId: userDbId }, process.env.JWT_SECRET!, {
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
			expiresIn: '1d'
		})
		// console.log(process.env.FRONTEND_URL)
		const refreshToken = jwt.sign({ userId: userDbId }, process.env.REFRESH_SECRET_KEY!, {
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
			expiresIn: '7d'
		})


		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: false, // set to true in production
			sameSite: 'lax', // 'none' requires HTTPS
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		successHandler(res, "User created successfully", {
			token: token,
			redirectUrl: `/dashboard`,
		}, 201)
		return

	} catch (error: any) {
		console.error('Google auth error', error);
		errorHandler(res, "Google authentication error", 500, error.message)
		return
	}
};




export const insertUser = async (req: Request, res: Response) => {
	try {
		const validatedData = userValidator.parse(req.body);
		const findUser = await UserModel.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id'] });
		if (findUser) {
			errorHandler(res, "User already exists! Please login", 400, {})
			return
		}
		const hashedPassword = await bcrypt.hash(validatedData.password, 10)
		console.log("hashedPassword", hashedPassword)
		const otp = Math.floor(100000 + Math.random() * 900000).toString()
		const addData = {
			...validatedData,
			otp: otp,
			provider: 'email',
			role: 'user',
			password: hashedPassword,
			isEmailVerified: false,
			createdOn: new Date(),
			updatedOn: new Date(),
		}
		const user = await UserModel.create(addData);
		if (!user) {
			errorHandler(res, "User not created! Please try again", 400, {})
			return
		}
		delete user.dataValues.password
		const sendMailResponse = await sendMail(validatedData.email, "CloudyFiles - Verify your email", authOtpEmailTemp(Number(otp), true))
		if (sendMailResponse.error) {
			console.error('Send mail error', sendMailResponse.message);
			errorHandler(res, "Failed to send verification email! Please try again later or use another method", 500, sendMailResponse.message);
			return;
		}
		successHandler(res, "Please verify your email to complete registration", {}, 201);

		return
	} catch (error: any) {
		console.error('Insert user error', error);
		if (error instanceof z.ZodError) {
			const firstErrorMessage = error.errors[0]?.message || "Failed to insert user";
			errorHandler(res, firstErrorMessage, 400, "Failed to insert user");
			return;
		}
		errorHandler(res, "Failed to insert user. Please try again or use another method", 500, error.message);
	}
}



export const verifyUser = async (req: Request, res: Response) => {
	try {

		const validatedData = verifyUserValidator.parse(req.body);
		const findUser = await UserModel.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id', 'otp', 'fullName'] });
		if (!findUser) {
			errorHandler(res, "User not found", 400, {})
			return
		}
		if (findUser.dataValues.otp !== validatedData.otp) {
			errorHandler(res, "Invalid OTP", 400, {})
			return
		}
		await UserModel.update({ isEmailVerified: true, otp: null }, { where: { email: validatedData.email } })
		const token = jwt.sign({ userId: findUser.dataValues?.id }, process.env.JWT_SECRET!, {
			expiresIn: '1d',
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
		})
		const refreshToken = jwt.sign({ email: findUser.dataValues?.email, name: findUser.dataValues?.fullName, userId: findUser.dataValues?.id }, process.env.REFRESH_SECRET_KEY!, {
			expiresIn: '7d',
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
		})

		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: false, // true in production (https)
			sameSite: 'lax', // or 'Lax' depending on frontend/backend domains
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		successHandler(res, "User verified successfully", {
			token: token,
			redirectUrl: `/dashboard`,
		}, 201)

	} catch (error: any) {
		console.error('Verify user error', error);
		if (error instanceof z.ZodError) {
			const firstErrorMessage = error.errors[0]?.message || "Failed to verify user";
			errorHandler(res, firstErrorMessage, 400, "Failed to verify user");
			return;
		}
		errorHandler(res, "Failed to verify user", 500, error.message);
	}
}


export const loginUser = async (req: Request, res: Response) => {
	try {
		const validatedData = loginUserValidator.parse(req.body);
		const findUser = await UserModel.findOne({ where: { email: validatedData.email }, attributes: ['email', 'id', 'password', 'isEmailVerified', 'twoFa'] });
		if (!findUser) {
			errorHandler(res, "Invalid Credentials.", 400, {})
			return
		}
		const isPasswordValid = await bcrypt.compare(validatedData.password, findUser.dataValues.password);
		if (!isPasswordValid) {
			errorHandler(res, "Invalid Credentials", 400, {})
			return
		}
		const otp = Math.floor(100000 + Math.random() * 900000).toString()
		if (!findUser.dataValues.isEmailVerified) {
			await UserModel.update({ otp: otp }, { where: { email: validatedData.email } })
			const sendMailResponse = await sendMail(validatedData.email, "CloudyFiles - Verify your email", authOtpEmailTemp(Number(otp), false))
			if (sendMailResponse.error) {
				console.error('Send mail error', sendMailResponse.message);
				errorHandler(res, "Failed to send verification email! Please try again later or use another method", 500, {});
				return;
			}
			errorHandler(res, "You are not verified. Please verify your email to continue.", 400, { otp: true });
			return
		}
		// console.log("findUser.dataValues", findUser.dataValues)
		if (findUser.dataValues.twoFa) {
			await UserModel.update({ otp: otp }, { where: { email: validatedData.email } })
			const sendMailResponse = await sendMail(validatedData.email, "CloudyFiles - Verify your email", authOtpEmailTemp(Number(otp), false))
			if (sendMailResponse.error) {
				console.error('Send mail error', sendMailResponse.message);
				errorHandler(res, "Failed to send verification email! Please try again later or use another method", 500, {});
				return;
			}
			successHandler(res, "OTP sent to your registered email for two-factor authentication.", { otp: true }, 200)
			return
		}
		const token = jwt.sign({ userId: findUser.dataValues?.id }, process.env.JWT_SECRET!, {
			expiresIn: '1d',
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
		})
		const refreshToken = jwt.sign({ userId: findUser.dataValues?.id }, process.env.REFRESH_SECRET_KEY!, {
			expiresIn: '7d',
			issuer: 'cloudyfile-backend',
			audience: 'cloudyfile-users',
		})
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: false, // set to true in production
			sameSite: 'lax', // 'none' requires HTTPS
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});
		successHandler(res, "User logged in successfully", {
			email: findUser.dataValues?.email,
			token: token,
			redirectUrl: `/dashboard`,
		}, 201)
		return

	} catch (error: any) {

		console.error('Login user error', error);
		if (error instanceof z.ZodError) {
			const firstErrorMessage = error.errors[0]?.message || "Failed to verify user";
			errorHandler(res, firstErrorMessage, 400, "Failed to login user");
			return;
		}
		errorHandler(res, "Failed to login user", 500, error.message);
	}
}




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


export const tokenRegen = async (req: CustomRequest, res: Response) => {
	try {
		console.log("Inside")
		const refreshToken = req.cookies.refreshToken
		console.log("refreshToken ", refreshToken)
		if (!refreshToken) {
			errorHandler(res, "Something went wrong", 401, {})
			return
		}

		// const decodeToken = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY!) as AuthenticatedUser
		// const token = jwt.sign({ userId: decodeToken.userId }, process.env.JWT_SECRET!, {
		// 	expiresIn: '1d',
		// 	issuer: 'cloudyfile-backend',
		// 	audience: 'cloudyfile-users',
		// })
		successHandler(res, "Success", {
			// token: token,
		}, 201)
		return
	} catch (error: any) {
		errorHandler(res, "An error occurred", 500, error.message);
		return

	}
}


export const readUser = async (req: CustomRequest, res: Response) => {
	try {
		const userId = req.user?.userId
		const user = await UserModel.findOne({
			where: {
				id: userId,
				block: false
			},
			attributes: ['fullName', 'email', 'timeZone', 'company', 'twoFa', 'profileUrl']
		})
		if (!user) {
			errorHandler(res, "User does not exist", 404, {})
			return
		}
		successHandler(res, "User data fetched successfully", user, 200)
		return
	} catch (error: any) {
		errorHandler(res, "Failed to fetched user data", 500, error?.message)
	}
}



export const logoutUser = async (req: CustomRequest, res: Response) => {
	try {
		const clearRefreshTokenCookie = (res: Response) => {
			res.clearCookie('refreshToken', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				//   sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
				sameSite: 'lax'
			});
		};

		successHandler(res, "Logged Out Successfully", {}, 200)
		return;

	} catch (error: any) {
		errorHandler(res, "Something went wrong", 500, error?.message)
	}
}