import { CustomRequest } from "../helper/middleware/authUser";
import { Response } from "express";
import { fileAttributesSchema, uploadConfirmSchema } from "../validators/FileAtbValidator";
import { FileAttributes } from "../models/FilesModel";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import { number, z } from "zod";
import { UploadFiles } from "../interfaces/fileInterfaces";
import { isFileExists, putObject } from "../utils/s3Client";
import { v4 as uuidv4 } from 'uuid';
import { validateContentType } from "../utils/filesMiddleware";
import { Queue } from 'bullmq';
import {  deleteFileData } from "../services/FileAtrSer";



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
				s3Key: `uploads/users/${userId}/${fileData.fileName+"_"+fileUuid}`,
				createdAt: new Date(),
				updatedAt: new Date()
			}
			const fileRecord = await FileAttributes.create(addData)
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

	} catch (error:any) {
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