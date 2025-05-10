export const authOtpEmailTemp = (otp: number, isSignup = false) => {
	const action = isSignup ? "signing up" : "signing in";
  
	const body = `
	  <html>
		<body style="font-family: Arial, sans-serif; color: #333;">
		  <h2 style="color: #3b82f6;">Welcome to CloudyFiles!</h2>
		  <p>Thank you for ${action}. Please use the OTP below to securely ${action} to your CloudyFiles account:</p>
		  <p style="font-size: 28px; font-weight: bold; color: #3b82f6;">${otp}</p>
		  <p>This OTP is valid for 10 minutes for your security.</p>
		  <p>If you didn’t initiate this request, you can safely ignore this email.</p>
		  <p style="margin-top: 24px;">Cheers,<br/>The CloudyFiles Team</p>
		</body>
	  </html>
	`;
  
	return body;
  };
  