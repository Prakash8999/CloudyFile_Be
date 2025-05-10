import { z } from 'zod';

export const userValidator = z.object({
	fullName: z.string({ required_error: "Name is required" }).trim().min(3, { message: "Name must be at least 3 characters long" }),
	email: z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
	password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
	profileUrl: z.string().url({ message: "Invalid URL" }).optional(),
	otp: z.string().optional(),
}).strict();


export const verifyUserValidator = z.object({
	email: z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
	otp: z.string({ required_error: "OTP is required" }).length(6, { message: "OTP must be 6 digits long" }),
	// type:z.enum(['login', 'signup'], { required_error: "Type is required" }),
}).strict();


export const loginUserValidator = z.object({
	email: z.string({ required_error: "Email is required" }).trim().email({ message: "Invalid email address" }),
	password: z.string({ required_error: "Password is required" }).min(8, { message: "Password must be at least 8 characters long" }),
}).strict();
