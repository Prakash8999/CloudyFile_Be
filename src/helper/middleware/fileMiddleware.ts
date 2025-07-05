import { NextFunction, Request, Response } from "express";
import { errorHandler } from "./responseHandler";
import { CustomRequest } from "./authUser";
import { FileAttributes } from "../../models/FilesModel";
import { freeFileSizeLimit } from "../../utils/fileSize";

export const validateFileSize = async (req: CustomRequest, res: Response, next: NextFunction) => {
	try {

		const fileSize = req.body.fileSize

		if (!fileSize || isNaN(fileSize)) {
			errorHandler(res, "Failed to upload file", 400, {});
			return
		}

		const fileSizeMb = fileSize / (1024 * 1024)

		if (fileSizeMb > 100) {
			errorHandler(res, "File size is too large! Maximum allowed size is 100MB", 400, {});
			return
		}

		const userId = req.user?.userId
		const files = await FileAttributes.findAll({
			where: {
				userId: userId
			},
			attributes: ['userId', 'fileSize', 'fileType', 'isFavorite', 'createdAt']
		})

		if (files.length === 0) {
			next()
		}

		const totalUsedSize = files.reduce((total, file) => {
			return total + file.dataValues.fileSize
		}, 0)

		if (totalUsedSize + fileSizeMb > freeFileSizeLimit) {
			errorHandler(res, "File size limit exceeded", 400, {});
			return
		}


		if (totalUsedSize >= freeFileSizeLimit) {
			errorHandler(res, "You have reached your file size limit! Please upgrade your plan to upload more files.", 400, {});
			return
		}


next()

	} catch (error: any) {

		errorHandler(res, "Failed to upload file", 500, error.message);
	}
}