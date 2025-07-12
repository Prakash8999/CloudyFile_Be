"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUserValidator = exports.verifyUserValidator = exports.userValidator = void 0;
const zod_1 = require("zod");
exports.userValidator = zod_1.z.object({
    fullName: zod_1.z.string({ required_error: "Name is required" }).trim().min(3, { message: "Name must be at least 3 characters long" }),
    email: zod_1.z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
    password: zod_1.z.string().min(8, { message: "Password must be at least 8 characters long" }),
    profileUrl: zod_1.z.string().url({ message: "Invalid URL" }).optional(),
    otp: zod_1.z.string().optional(),
}).strict();
exports.verifyUserValidator = zod_1.z.object({
    email: zod_1.z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
    otp: zod_1.z.string({ required_error: "OTP is required" }).length(6, { message: "OTP must be 6 digits long" }),
    // type:z.enum(['login', 'signup'], { required_error: "Type is required" }),
}).strict();
exports.loginUserValidator = zod_1.z.object({
    email: zod_1.z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
    password: zod_1.z.string({ required_error: "Password is required" }).min(8, { message: "Password must be at least 8 characters long" }),
}).strict();
