import { Op } from "sequelize";
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



export const getSignedUrlSer = async (s3Key: string, fileId: number) => {
	try {

		const key = `signedUrl:${"share"}:${fileId}`
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

		const getSignedUrl = await getObject(s3Key)

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





export const validateDeleteFileIds = async (Ids: number[], userId: number) => {
	try {

		if (
			!Array.isArray(Ids) ||
			Ids.length === 0 ||
			!Ids.every(id => typeof id === "number" && !isNaN(id))
		) {
			// errorHandler(res, "Invalid file IDs. Please provide a non-empty array of numbers.", 400, {});
			return {
				error: true,
				message: "Invalid file IDs. Please provide a non-empty array of numbers.",
				statusCode: 400,
				data: []
			}
		}

		const idSet = new Set(Ids)

		console.log(
			idSet + "id set")

		const ids = [...idSet]

		console.log(" ids ", ids)

		const filesBelongto = await FileAttributes.findAll({
			where: {
				userId: userId,
				id: {
					[Op.in]: ids
				}
			},
			attributes: ['id', 'fileUid', 's3Key', 'thumbnailKey'],
			raw:true,
			nest: true
		})

		if (filesBelongto.length === 0) {
			return {
				error: true,
				message: "No files found to delete",
				data: [],
				statusCode: 404
			}
		}


		return {
			error: false,
			message: "",
			data: filesBelongto,
			statusCode: 200
		}


	} catch (error: any) {
		return {
			error: true,
			message: error.message,
			data: [],
			statusCode: 500
		}

	}
}