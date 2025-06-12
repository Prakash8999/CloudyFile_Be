import { CustomRequest } from "../helper/middleware/authUser";
import { Request, Response } from "express";
import { fileAttributesSchema, uploadConfirmSchema } from "../validators/FileAtbValidator";
import { FileAttributes } from "../models/FilesModel";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import { number, z } from "zod";
import { UploadFiles } from "../interfaces/fileInterfaces";
import { getObject, isFileExists, putObject } from "../utils/s3Client";
import { v4 as uuidv4 } from 'uuid';
import { validateContentType } from "../utils/filesMiddleware";
import { Queue } from 'bullmq';
import { deleteFileData } from "../services/FileAtrSer";
import { paginateAndSort } from "../utils/paginationUtils";
import redisClient from "../utils/redis";



// export const insertFileData = async (req: CustomRequest, res: Response) => {
// 	try {
// 		const validatedData = fileAttributesSchema.parse(req.body)
// 		const addData = {
// 			...validatedData,
// 			userId: req.user?.userId,
// 			createdAt: new Date(),
// 			updatedAt: new Date()
// 		}
// 		await FileAttributes.create(addData)
// 		successHandler(res, "File inserted successfully", [], 201)
// 		return
// 	}
// 	catch (error: any) {
// 		console.log("Error during file insertion ", error)
// 		if (error instanceof z.ZodError) {
// 			const erroMessage = error.errors[0]?.message || "Invalid request body"
// 			errorHandler(res, erroMessage, 400, [])
// 			return
// 		}
// 		errorHandler(res, "Internal server error", 500, error?.message)

// 	}
// }

export const uploadFileUrl = async (req: CustomRequest, res: Response) => {
	try {
		const validatedData = fileAttributesSchema.parse(req.body)
		const validateFile = validateContentType(validatedData.contentType, validatedData.fileName)
		if (validateFile.error) {
			const erroMessage = validateFile.message
			errorHandler(res, erroMessage, 400, {})
			return
		}

		const fileUuid = uuidv4()
		console.log(fileUuid)
		const userId = req.user?.userId!
		const fileData: UploadFiles = {
			fileName: validatedData.fileName,
			fileType: validatedData.contentType.split('/')[0],
			userId: userId,
			contentType: validatedData.contentType,
			uuid: fileUuid
		}

		const uploadUrl = await putObject(fileData)
		if (uploadUrl.error) {
			errorHandler(res, "Failed to generate upload URL", 500, uploadUrl.message)
			return
		}

		const addData = {
			...validatedData,
			// userId: req.user?.userId,
			...fileData,
			mimeType: fileData.contentType,
			fileUid: fileUuid,
			s3Key: `uploads/users/${userId}/${fileData.fileName + "_" + fileUuid}`,
			createdAt: new Date(),
			updatedAt: new Date()
		}
		const fileRecord = await FileAttributes.create(addData)
		const incr = await redisClient.incr(`user:fileDataVersion:${userId}`);
		console.log("incr ", incr)
		const sendData = {
			fileId: fileRecord.dataValues.id,
			uploadUrl: uploadUrl.signedUrl,
		}
		successHandler(res, "Upload URL generated successfully", sendData, 200)
		return
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message || "Invalid request body"
			errorHandler(res, message, 400, {})
			return
		}
		console.log("Error during upload url generation ", error)
		errorHandler(res, "Internal server error", 500, error?.message)
	}
}


export const confirmFileUpload = async (req: CustomRequest, res: Response) => {
	try {
		const userId = req.user?.userId
		const validatedData = uploadConfirmSchema.parse(req.body)
		const responseData = await FileAttributes.findOne({
			where: {
				id: validatedData.fileId,
				userId: userId,
			},
			attributes: ['s3Key'],
		});

		if (!validatedData.success) {
			errorHandler(res, "Failed to upload file", 400, {});
			await deleteFileData(validatedData.fileId, userId!);
			return;
		}

		if (!responseData) {
			errorHandler(res, "File not found", 404, {});
			return;
		}
		const checkFileExists = await isFileExists(responseData.dataValues.s3Key);
		if (!checkFileExists) {
			errorHandler(res, "Failed to confirm file upload", 400, {});
			await deleteFileData(validatedData.fileId, userId!);
			return;
		}

		// const thumbnailQueue = new Queue('thumbnail-generation', {
		// 	connection: {
		// 		host: process.env.REDIS_HOST,
		// 		port: 6379,
		// 	},
		// });

		// await thumbnailQueue.add('generate-thumbnail', {
		// 	fileId: validatedData.fileId,
		// 	s3Key: responseData?.dataValues.s3Key,
		// 	userId: userId,
		// });

		// console.log("Thumbnail generation job added to the queue", validatedData.fileId, responseData?.dataValues.s3Key, userId);

		successHandler(res, "File upload confirmed successfully", {}, 200);
		return;

	} catch (error: any) {
		console.log("Error during file upload confirmation ", error);
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message || "Invalid request body";

			errorHandler(res, message, 400, {});
			return;
		}
		errorHandler(res, "Internal server error", 500, error?.message);
		return;
	}
}





export const readFiles = async (req: CustomRequest, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort_by = "id",
			sort_order = "DESC",
			...filters
		} = req.query;
		const pageNum = parseInt(page as string, 10);
		const limitNum = parseInt(limit as string, 10);

		const userId = req?.user?.userId


		const version = await redisClient.get(`user:fileDataVersion:${userId}`) || 1;
		console.log("version ", version);
		const key = `fileData:${userId}:${version}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
		const getData = await redisClient.get(key);
		if (getData) {
			const result = JSON.parse(getData);
			if (!result || result?.data?.length === 0) {
				errorHandler(res, "No data found", 404, []);
				return;
			}
			successHandler(res, "Data read successfully", result.data, 200, result.meta);
			return;
		}

		const readResponse = await paginateAndSort(
			FileAttributes,
			{ ...filters, userId, isArchived: false, isDeleted: false },
			pageNum,
			limitNum,
			[["id", "DESC"]]
		);

		if (readResponse.data.length === 0) {
			errorHandler(res, "No data found", 404, []);
			return;
		}

		await redisClient.set(key, JSON.stringify(readResponse), { EX: 100000 }); // 7 days
		successHandler(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
		return;




	} catch (error: any) {
		console.log("Error during data read ", error);
		errorHandler(res, "Failed to fetch data", 500, error?.message);
	}
}



export const getFileSignedUrl = async (req: CustomRequest, res: Response) => {
	try {

		const userId = req?.user?.userId
		const fileId = req.params.id
		const readResponse = await FileAttributes.findOne({
			where: { id: fileId, userId: userId },
			attributes: ['id', 's3Key', 'fileName']
		})
		if (!readResponse) {
			errorHandler(res, "File not found", 404, {});
			return
		}
		if (!readResponse.dataValues.s3Key) {
			errorHandler(res, "File not found", 404, {});
			return
		}

		const key = `signedUrl:${fileId}:${userId}`
		const signedUrlRedis = await redisClient.get(key)
		console.log
		if (signedUrlRedis) {
         console.log("signedUrlRedis", signedUrlRedis)
		 
		successHandler(res, "File fetched successfully...",signedUrlRedis, 200);
		return		
		
		}

		const getSignedUrl = await getObject(readResponse.dataValues.s3Key)

		if (getSignedUrl.error) {
			errorHandler(res, "Failed to fetch file", 404, getSignedUrl.error);
			return
		}

		await redisClient.set(key, getSignedUrl.signedUrl!, { EX: 300 }); // 7

		successHandler(res, "File fetched successfully...", getSignedUrl.signedUrl, 200);
		return
	} catch (error:any) {
		console.log("Error during file read ", error);
		errorHandler(res, "Failed to fetch file", 500, error?.message);


	}
}