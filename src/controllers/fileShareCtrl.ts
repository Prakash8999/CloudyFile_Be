import { Request, Response } from "express";
import { CustomRequest } from "../helper/middleware/authUser";
import { shareFilesWithUsersValidator, updateSharedCollaboratorsValidator } from "../validators/ShareFilesValidator";
import { filterValidUsers } from "../utils/filterValidUsers";
import { SharedFiles, FileAttributes, UserModel } from "../models/ModelRelation";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import { z } from "zod";
import redisClient from "../utils/redis";
import { sanitizeToYMD } from "../utils/generic";
import { Op } from "sequelize";
import { paginateAndSort } from "../utils/paginationUtils";
import sequelize from "../db/Connection";
import { getObject } from "../utils/s3Client";

export const shareFileWithUsers = async (req: CustomRequest, res: Response) => {
	try {
		const validateBody = shareFilesWithUsersValidator.parse(req.body);
		const userId = req.user?.userId

		const validateUsers = await filterValidUsers(validateBody.collaborators);

		const inserData = validateUsers.map((data) => ({
			ownerId: userId,
			fileId: validateBody.fileId,
			sharedWithUserId: data.sharedWithUserId,
			sharedWithUserEmail: data.sharedWithUserEmail,
			role: data.role,
			createdAt: new Date(),
			updatedAt: new Date()
		}))

		const insertResponse = await SharedFiles.bulkCreate(inserData)
		validateUsers.forEach(async (user) => {
		await redisClient.incr(`user:SharedFiles:${user.sharedWithUserId}`);
		})


		if (insertResponse) {
			successHandler(res, "Files shared successfully", {}, 201)
			return;
		}
		errorHandler(res, "Failed to share files", 400, "Failed to share files with selected users");


	} catch (error: any) {
		if (error instanceof z.ZodError) {
			console.log("Zod Error:", error.errors);
			errorHandler(res, error.errors[0].message || "Invalid request data", 400, "Invalid request data");
			return
		}
		console.log(error)
		errorHandler(res, "An unexpected error occurred", 500, error.message || "Failed to share files");
		return;
	}
}




export const getSharedFiles = async (req: CustomRequest, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort_by = "id",
			sort_order = "DESC",
			rawStart,
			rawEnd,
			...filters
		} = req.query;
		const pageNum = parseInt(page as string, 10);
		const limitNum = parseInt(limit as string, 10);
		const loggedInUser = req.user?.userId;
		if (!loggedInUser) {
			errorHandler(res, "User ID is required", 400, "User ID is required");
			return;
		}
		const version = await redisClient.get(`user:SharedFiles:${loggedInUser}`) || 1;
		// const key = `SharedfileData:${loggedInUser}:${version}:${rawStart}: ${rawEnd}: ${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
		// const getData = await redisClient.get(key);
		// if (getData) {
		// 	const result = JSON.parse(getData);
		// 	successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
		// 	return;
		// }


		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(new Date().getDate() - 7);

		const startDate = sanitizeToYMD(rawStart?.toString() || sevenDaysAgo);
		const endDate = sanitizeToYMD(rawEnd?.toString() || new Date());

		const newFilters = {
			...filters,
			sharedWithUserId: loggedInUser,
			// createdAt: { [Op.between]: [startDate, endDate] }

		}

		const readResponse = await paginateAndSort(
			SharedFiles,
			newFilters,
			pageNum,
			limitNum,
			[["id", "DESC"]], 
			[{
				model: FileAttributes,
				where: { isArchived: false, isDeleted: false },
				attributes: ['id', 'fileName', 'fileType', 'fileSize', 'createdAt', 'updatedAt', 'thumbnailUrl', 'fileUid', 's3Key'],
				required: true,


			},
			{
				model: UserModel,
				as: "owner",
				attributes: ['id', 'fullName', 'email', 'profileUrl'],
			}


		]
		);

		console.log("readResponse", readResponse);

		// await redisClient.set(key, JSON.stringify(readResponse), { EX: 600 });
		successHandler(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
		return;

	} catch (error:any) {
		console.error("Error in getSharedFiles:", error);
		errorHandler(res, "An unexpected error occurred", 500, error.message || "Failed to fetch shared files");
	}
}

export const getCollaborators = async (req: CustomRequest, res: Response) => {
	try {
		const fileId = parseInt(req.params.fileId, 10);
		if (isNaN(fileId)) {
			errorHandler(res, "Invalid file ID", 400, "Invalid file ID");
			return;
		}
		const ownerId = req.user?.userId;

		const collaborators = await SharedFiles.findAll({
			where: { ownerId: ownerId, fileId: fileId },
			attributes: ["id", "sharedWithUserId", "role"],
			include: [
				{
					model: UserModel,
					as: "sharedWithUser",
					attributes: ['id', 'fullName', 'email', 'profileUrl', 'block'],
					required: true,
				}
			]

		});
		successHandler(res, "Collaborators retrieved successfully", collaborators, 200);
	} catch (error) {
		errorHandler(res, "An unexpected error occurred", 500, "Failed to retrieve collaborators");
	}
}



export const updateSharedFileCollaborators = async (req: CustomRequest, res: Response) => {
	try {
		const ownerId = req.user?.userId; // type it better if you have a custom RequestUser type
		const { fileId, collaborators } = updateSharedCollaboratorsValidator.parse(req.body);

		// const existing: {
		//   id: number;
		//   sharedWithUserId: number;
		//   role: 'Reader' | 'Editor';
		// }[] = await SharedFiles.findAll({
		//   where: { fileId, ownerId },
		//   raw: true
		// });

		const existing = await SharedFiles.findAll({
			where: { fileId, ownerId },
			attributes: ["id", "sharedWithUserId", "role"],
			raw: true,
		}) as any;




		const incomingMap = new Map<number, {
			sharedWithUserId: number;
			sharedWithUserEmail: string;
			role: 'Reader' | 'Editor';
		}>();

		for (const collab of collaborators) {
			incomingMap.set(collab.sharedWithUserId, collab);
		}

		const toInsert: any[] = [];
		const toUpdate: { id: number; role: 'Reader' | 'Editor' }[] = [];
		const toDelete: number[] = [];

		for (const existingEntry of existing) {
			const incoming = incomingMap.get(existingEntry.sharedWithUserId);
			if (incoming) {
				if (incoming.role !== existingEntry.role) {
					toUpdate.push({
						id: existingEntry.id,
						role: incoming.role
					});
				}
				incomingMap.delete(existingEntry.sharedWithUserId); // handled
			} else {
				toDelete.push(existingEntry.id);
			}
		}

		for (const collab of incomingMap.values()) {
			toInsert.push({
				fileId,
				ownerId,
				sharedWithUserId: collab.sharedWithUserId,
				sharedWithUserEmail: collab.sharedWithUserEmail,
				role: collab.role,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}

		await sequelize.transaction(async (t) => {
			if (toInsert.length) {
				await SharedFiles.bulkCreate(toInsert, { transaction: t });
			}

			for (const update of toUpdate) {
				await SharedFiles.update(
					{ role: update.role, updatedAt: new Date() },
					{ where: { id: update.id }, transaction: t }
				);
			}

			if (toDelete.length) {
				await SharedFiles.destroy({
					where: { id: toDelete },
					transaction: t
				});
			}
		});

		// return res.status(200).json({
		//   message: "Collaborators updated successfully"
		// });

		successHandler(res, "Collaborators updated successfully", {}, 200);
		return

	} catch (error: any) {
		console.error("Error updating collaborators:", error);
		// return res.status(500).json({
		//   message: "Something went wrong",
		//   error: error.message
		// });
		if (error instanceof z.ZodError) {
			errorHandler(res, error.errors[0].message || "Invalid request data", 400, "Invalid request data");
			return;
		}
		errorHandler(res, error.message || "Something went wrong", 500, "Internal Server Error");
	}
};




export const getFileSignedUrl = async (req: CustomRequest, res: Response) => {
	try {

		const userId = req?.user?.userId
		const fileId = req.params.id


		const readResponse = await SharedFiles.findOne({
			where: { fileId: fileId, sharedWithUserId: userId },
			attributes: ['id', 'fileId', 'sharedWithUserId', 'role'],
			// raw: true,
			include: [{
				model: FileAttributes,
				attributes: ['id', 's3Key', 'fileName'],
				required: true,
				
			}]
		});


		// const readResponse = await FileAttributes.findOne({
		// 	where: { id: fileId, userId: ownerId },
		// 	attributes: ['id', '	`s3Key', 'fileName']
		// })
		
		if (!readResponse) {
			errorHandler(res, "File not found", 404, {});
			return
		}
		
		// console.log( "readResponse", readResponse?.dataValues);
		// console.log( "readResponse", readResponse.dataValues.FileAttribute.s3Key);
		if (!readResponse.dataValues.FileAttribute.s3Key) {
			errorHandler(res, "File not found", 404, {});
			return
		}

		const key = `signedUrlShared:${fileId}:${userId}`
		const signedUrlRedis = await redisClient.get(key)
		console.log
		if (signedUrlRedis) {
			console.log("signedUrlRedis", signedUrlRedis)

			successHandler(res, "File fetched successfully...", signedUrlRedis, 200);
			return

		}

		const getSignedUrl = await getObject(readResponse.dataValues.FileAttribute.s3Key)

		if (getSignedUrl.error) {
			errorHandler(res, "Failed to fetch file", 404, getSignedUrl.error);
			return
		}

		await redisClient.set(key, getSignedUrl.signedUrl!, { EX: 300 }); // 7

		successHandler(res, "File fetched successfully...", getSignedUrl.signedUrl, 200);
		return
	} catch (error: any) {
		console.log("Error during file read ", error);
		errorHandler(res, "Failed to fetch file", 500, error?.message);


	}
}
