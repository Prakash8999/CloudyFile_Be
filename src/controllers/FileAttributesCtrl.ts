import { CustomRequest } from "../helper/middleware/authUser";
import { Response } from "express";
import { fileAttributesSchema } from "../validators/FileAtbValidator";
import { FileAttributes } from "../models/FilesModel";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import { number, z } from "zod";
import { UploadFiles } from "../interfaces/fileInterfaces";
import { putObject } from "../utils/s3Client";
import { v4 as uuidv4 } from 'uuid';
import { validateContentType } from "../utils/filesMiddleware";

const fileUuid = uuidv4()

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
		const validateFile = validateContentType(validatedData.contentType)
		if (validateFile.error) {
			const erroMessage = validateFile.message
			errorHandler(res, erroMessage, 400, {})
			return
		}
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
			fileUid: fileUuid,
			s3Key: `uploads/users/${userId}/${fileUuid + "_" + fileData.fileName}`,
			createdAt: new Date(),
			updatedAt: new Date()
		}
		await FileAttributes.create(addData)
		successHandler(res, "Upload URL generated successfully", uploadUrl.signedUrl, 200)
		return
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message || "Invalid request body"
			errorHandler(res, message, 500, {})
			return
		}
		console.log("Error during upload url generation ", error)
		errorHandler(res, "Internal server error", 500, error?.message)
	}
}


// export const 
