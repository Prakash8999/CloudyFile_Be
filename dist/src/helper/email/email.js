"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.NODEMAILER_EMAIL_FROM,
        pass: process.env.NODEMAILER_EMAIL_PASSWORD
    }
});
const sendMail = async (email, subject, html) => {
    const mailOptions = {
        from: "CloudyFiles<" + process.env.NODEMAILER_EMAIL_FROM + ">",
        to: email,
        subject: subject,
        html: html
    };
    try {
        await transporter.sendMail(mailOptions);
        return {
            error: false,
            message: "Mail sent successfully",
            statusCode: 200
        };
    }
    catch (error) {
        return {
            error: true,
            message: error.message,
            statusCode: 500
        };
    }
};
exports.sendMail = sendMail;
