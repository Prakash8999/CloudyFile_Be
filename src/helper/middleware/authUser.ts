import { NextFunction, Request, Response } from "express";
import { errorHandler } from "./responseHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import UserModel from "../../models/UserModel";

export interface AuthenticatedUser extends JwtPayload {
	userId: number;
	email?: string;
	role?: string;
	isEmailVerified?: boolean;
	provider?: string;
}

export interface CustomRequest extends Request {
	user?: AuthenticatedUser;
}

export const authUser = async (req: CustomRequest, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.header('x-auth-token') || req.header('Authorization');
		if (!authHeader) {
			errorHandler(res, "Authentication token not found", 401, {});
			return;
		}
		const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
		let decoded: AuthenticatedUser;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET!, {
				issuer: 'cloudyfile-backend',
				audience: 'cloudyfile-users',
			}) as AuthenticatedUser;
		} catch (error: any) {
			if (error.name === 'TokenExpiredError') {
				errorHandler(res, "Token expired", 401, {});
			} else if (error.name === 'JsonWebTokenError') {
				errorHandler(res, "Invalid token", 401, {});
			} else {
				errorHandler(res, "Token verification failed", 500, {});
			}
			return;
		}

		const findUser = await UserModel.findOne({
			where: {
				id: decoded.userId,
				block: false,
			},
			attributes: ['id', 'email', 'role', 'isEmailVerified', 'provider'],
		});

		if (!findUser) {
			errorHandler(res, "User not found", 401, {});
			return;
		}

		req.user = {
			...decoded,
			isEmailVerified: findUser.dataValues.isEmailVerified,
			provider: findUser.dataValues.provider,
		};
		next();
	} catch (error) {
		errorHandler(res, "Internal Server Error", 500, {});
		return;
	}
};
