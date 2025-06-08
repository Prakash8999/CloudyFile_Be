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