
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.NODEMAILER_EMAIL_FROM,
		pass: process.env.NODEMAILER_EMAIL_PASSWORD
	}
});


export const sendMail = async (email: string, subject: string, html: string) => {


	const mailOptions = {
		from: "CloudyFiles<" + process.env.NODEMAILER_EMAIL_FROM + ">",
		to: email,
		subject: subject,
		html: html
	}

	try {
		await transporter.sendMail(mailOptions);
		return {
			error: false,
			message: "Mail sent successfully",
			statusCode: 200
		}
	} catch (error: any) {
		return {
			error: true,
			message: error.message,
			statusCode: 500
		}
	}
}