import { errorHandler } from "../helper/middleware/responseHandler";
import { FileAttributes } from "../models/FilesModel";
import redisClient from "../utils/redis";
import { getObject } from "../utils/s3Client";

export const deleteFileData = async (fileId: number, userId: number) => {
	await FileAttributes.destroy({

		where: {
			id: fileId,
			userId: userId,
		}
	});
	return { success: true, message: "File deleted successfully" };

}




export const getFileAttributes = async (fileId: number, userId: number) => {
	const ifFileExist = await FileAttributes.findOne({
		where: {
			id: fileId,
			userId: userId
		}
	})
	if (!ifFileExist) {
		return { success: false, message: "File not found", data: null, status: 404 };
	}

	return {
		success: true,
		data: ifFileExist,
		message: "File found successfully",
		status: 200
	}

}



export const getSignedUrlSer = async (fileId: number, userId: number) => {
	try {


		const readResponse = await FileAttributes.findOne({
			where: { id: fileId, userId: userId },
			attributes: ['id', 's3Key', 'fileName']
		})
		if (!readResponse) {
			// errorHandler(res, "File not found", 404, {});

			return {
				error: true,
				message: "File not found",
				data: null,
				status: 404
			}
		}
		if (!readResponse.dataValues.s3Key) {
			// errorHandler(res, "File not found", 404, {});

			return {
				error: true,
				message: "File not found",
				data: null,
				status: 404
			}
		}

		const key = `signedUrl:${fileId}:${userId}`
		const signedUrlRedis = await redisClient.get(key)
		console.log
		if (signedUrlRedis) {
			console.log("signedUrlRedis", signedUrlRedis)

			// successHandler(res, "File fetched successfully...", signedUrlRedis, 200);
			return {
				error: false,
				data: signedUrlRedis,
				message: "File fetched successfully",
				status: 200
			}


		}

		const getSignedUrl = await getObject(readResponse.dataValues.s3Key)

		if (getSignedUrl.error) {
			// errorHandler(res, "Failed to fetch file", 404, getSignedUrl.error);

			return {
				error: true,
				message: getSignedUrl.message,
				data: null,
				status: 404
			}
		}

		await redisClient.set(key, getSignedUrl.signedUrl!, { EX: 300 });
		return {
			error: false,
			data: getSignedUrl.signedUrl,
			message: "File fetched successfully",
			status: 200
		}
	} catch (error: any) {
		console.log("Error during file read ", error);
		return {
			error: true,
			message: "Error during file read",
			data: error.message,
			status: 500
		}

	}
}