import { errorHandler } from "../helper/middleware/responseHandler";
import { FileAttributes } from "../models/FilesModel";

export const deleteFileData = async (fileId: number, userId: number) => {
	await FileAttributes.destroy({

		where: {
			id: fileId,
			userId: userId,
		}
	});
	return { success: true, message: "File deleted successfully" };

}




export const getFileAttributes = async (fileId: number, userId: number ) => {
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