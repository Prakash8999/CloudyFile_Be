import { Response } from "express";
import { CustomRequest } from "../helper/middleware/authUser";
import { FileAttributes } from "../models/FilesModel";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";

export const getFilesStats = async (req: CustomRequest, res: Response) => {
	try {
		const userId = req.user?.userId
		const files = await FileAttributes.findAll({
			where: {
				userId: userId
			},
			attributes: ['userId', 'fileSize', 'fileType', 'isFavorite']
		})

		if (files.length === 0) {
			successHandler(res, "", {}, 200)
			return
		}

		const totalSize = files.reduce((total, file) => {
			return total + file.dataValues.fileSize
		}, 0)
		const totalFiles = files.length
		const favoriteFiles = files.filter(file => file.dataValues.isFavorite).length
		const response = {
			totalSize,
			totalFiles,
			favoriteFiles,
			files
		}

		successHandler(res, "", files, 200)


	} catch (error:any) {
		console.error(error)
		errorHandler(res, "Failed to fetch storage stats", 500, error.message)

	}
}