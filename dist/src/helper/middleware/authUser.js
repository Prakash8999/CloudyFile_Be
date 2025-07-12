"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUser = void 0;
const responseHandler_1 = require("./responseHandler");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const authUser = async (req, res, next) => {
    try {
        const authHeader = req.header('x-auth-token') || req.header('Authorization');
        if (!authHeader) {
            (0, responseHandler_1.errorHandler)(res, "Authentication token not found", 401, {});
            return;
        }
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
                issuer: 'cloudyfile-backend',
                audience: 'cloudyfile-users',
            });
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                (0, responseHandler_1.errorHandler)(res, "Token expired", 401, {});
            }
            else if (error.name === 'JsonWebTokenError') {
                (0, responseHandler_1.errorHandler)(res, "Invalid token", 401, {});
            }
            else {
                (0, responseHandler_1.errorHandler)(res, "Token verification failed", 500, {});
            }
            return;
        }
        const findUser = await UserModel_1.default.findOne({
            where: {
                id: decoded.userId,
                block: false,
            },
            attributes: ['id', 'email', 'role', 'isEmailVerified', 'provider'],
        });
        if (!findUser) {
            (0, responseHandler_1.errorHandler)(res, "User not found", 401, {});
            return;
        }
        req.user = {
            ...decoded,
            isEmailVerified: findUser.dataValues.isEmailVerified,
            provider: findUser.dataValues.provider,
        };
        next();
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Internal Server Error", 500, {});
        return;
    }
};
exports.authUser = authUser;
