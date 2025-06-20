import { Request, Response } from "express"
import { folderFileMapSchema, folderSchema, folderUpdateSchema } from "../validators/FolderValidator"
import { z } from "zod"
import { errorHandler, successHandler } from "../helper/middleware/responseHandler"
import { CustomRequest } from "../helper/middleware/authUser"
import { FolderFileMap, FolderModel } from "../models/ModelRelation"
import { paginateAndSort } from "../utils/paginationUtils"
import { FileAttributes } from "../models/ModelRelation"
import redisClient from "../utils/redis"
import { Op, literal } from "sequelize"
import sequelize from "../db/Connection"

export const insertFolder = async (req: CustomRequest, res: Response) => {
	try {
		const validatedData = folderSchema.parse(req.body)
		const userId = req.user?.userId
		const addData = {
			...validatedData,
			createdAt: new Date(),
			updatedAt: new Date(),
			ownerId: userId
		}

		const insertResponse = await FolderModel.create(addData)
		if (validatedData.fileIds && validatedData.fileIds.length > 0 && insertResponse) {

			const linkFile = validatedData.fileIds.map((fileId) => ({
				folderUuid: insertResponse.dataValues.uuid,
				fileId,
				addedBy: userId,
				createdAt: new Date(),
			}));

			await FolderFileMap.bulkCreate(linkFile)
		}
		await redisClient.incr(`user:folderDataVersion:${userId}`);


		successHandler(
			res,
			`Folder created successfully${validatedData.fileIds?.length ? " and files were added to it." : "."}`,
			{},
			201
		);

	}
	catch (error: any) {
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message
			errorHandler(res, message, 400, "Invalid data")
			return
		}
		errorHandler(res, "Failed to create folder", 500, error.message)
	}
}

export const readFolders = async (req: CustomRequest, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort_by = "id",
			sort_order = "DESC",
			matchMode = "and",
			...filters
		} = req.query;
		const pageNum = parseInt(page as string, 10);
		const limitNum = parseInt(limit as string, 10);
		const userId = req?.user?.userId






		const version = await redisClient.get(`user:folderDataVersion:${userId}`) || 1;
		const key = `folderData:${userId}:${version}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;

		const getData = await redisClient.get(key);


		if (getData) {
			const result = JSON.parse(getData);

			if (!result || result?.data?.length === 0) {
				errorHandler(res, "No data found", 404, []);
				return;
			}
			successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
			return;
		}


		const newFilters = {
			...filters,
			ownerId: userId,
			isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,

		}
		const readResponse = await paginateAndSort(FolderModel, newFilters, pageNum, limitNum, [["createdAt", "DESC"]],
			[{
				model: FileAttributes,
				as: "files",
				attributes: ['id'], // exclude actual file fields
				through: { attributes: [] }, // exclude pivot table fields
				duplicating: false, // avoid incorrect row counts,
			}]

		)
		if (readResponse.data.length === 0) {
			successHandler(res, "Folder data fetched successfully", [], 200)
			return
		}
		const sendData = readResponse.data.map((folder: any) => {
			// const folderData = folder.get ? folder.get({ plain: true }) : folder;
			return {
				...folder,
				filesCount: folder.files?.length || 0,
			};
		});


		await redisClient.set(key, JSON.stringify({ data: sendData, meta: readResponse.meta }), { EX: 600 });
		successHandler(res, "Folder data fetched successfully", sendData, 200, readResponse.meta)
		return
	} catch (error: any) {
		errorHandler(res, "Failed to fetch folders", 500, error.message)
	}
}



export const readOwnFolder = async (req: CustomRequest, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) {
			errorHandler(res, "Invalid folder id", 400, "Invalid folder id");
			return
		}
		const userId = req.user?.userId;
		const uuid = id
		const versionFolder = await redisClient.get(`user:folderDataVersion:${userId}`) || 1;
		const versionFile = await redisClient.get(`user:fileDataVersion:${userId}`) || 1;



		const key = `ownFolder:${uuid}:userId:${userId}:folderVersion:${versionFolder}:fileVersion:${versionFile}`;

		const getFolderData = await redisClient.get(key)
		if (getFolderData) {
			successHandler(res, "Data fetched successfully...", JSON.parse(getFolderData), 200);
			return
		}

		const readResponse = await FolderModel.findOne({
			where: {
				uuid: uuid,
				ownerId: userId
			},
			include: [{
				model: FileAttributes,
				as: "files",
				through: { attributes: [] },
				required: false,
				where: {
					isDeleted: false,
					isArchived: false
				}
			}]
		})



		if (!readResponse) {
			errorHandler(res, "Folder not found", 404, "Folder not found");
			return
		}

		await redisClient.set(key, JSON.stringify(readResponse))

		successHandler(res, "Folder data fetched successfully", readResponse, 200)
		return

	} catch (error: any) {
		errorHandler(res, "Failed to fetch folder", 500, error.message)

	}
}



export const updateFolder = async (req: CustomRequest, res: Response) => {
	const transaction = await sequelize.transaction();
	try {
		const validatedData = folderUpdateSchema.parse(req.body);
		const userId = req.user?.userId;

		const folder = await FolderModel.findOne({
			where: {
				uuid: validatedData.uuid,
				ownerId: userId
			},
			transaction
		});

		if (!folder) {
			await transaction.rollback();
			errorHandler(res, "Folder not found", 404, "Folder not found");
			return
		}

		await folder.update({
			...validatedData,
			updatedAt: new Date()
		}, { transaction });

		if (validatedData.fileIds && validatedData.fileIds.length > 0) {
			const existingMaps = await FolderFileMap.findAll({
				where: {
					folderUuid: validatedData.uuid,
					addedBy: userId
				},
				raw: true,
				attributes: ['fileId'],
				transaction
			});

			const existingFileIds = existingMaps.map((map: any) => map.fileId).sort();
			const incomingFileIds = [...validatedData.fileIds].sort();

			const areSame =
				existingFileIds.length === incomingFileIds.length &&
				existingFileIds.every((id, i) => id === incomingFileIds[i]);

			if (!areSame) {
				await FolderFileMap.destroy({
					where: {
						folderUuid: validatedData.uuid,
						addedBy: userId
					},
					transaction
				});

				const newMappings = validatedData.fileIds.map(fileId => ({
					fileId,
					folderUuid: validatedData.uuid,
					addedBy: userId,
					createdAt: new Date()
				}));

				await FolderFileMap.bulkCreate(newMappings, { transaction });
			}
		}
		await redisClient.incr(`user:folderDataVersion:${userId}`);


		await transaction.commit();
		successHandler(res, "Folder updated successfully", folder, 200);

	} catch (error: any) {
		await transaction.rollback();

		if (error instanceof z.ZodError) {
			const message = error.errors[0].message;
			errorHandler(res, message || "Invalid data", 400, message || "Invalid data");
			return
		}

		errorHandler(res, "Failed to update folder", 500, error.message);
	}
};





// export const readFilesOfFolder = async (req: CustomRequest, res: Response) => {
// 	try {
// 		const {
// 			page = 1,
// 			limit = 20,
// 			fileIds = [],
// 			sort_by = "id",
// 			sort_order = "DESC",
// 			matchMode = "and",
// 			...filters
// 		} = req.query;
// 		const pageNum = parseInt(page as string, 10);
// 		const limitNum = parseInt(limit as string, 10);

// 		const userId = req?.user?.userId
// 		console.log(" fileIds ", fileIds)
// 		const selectedIds = Array.isArray(fileIds) ? fileIds.map(id => parseInt(String(id), 10)) : [];
// 		console.log("selectedIds ", selectedIds)

// 		const version = await redisClient.get(`user:fileDataVersion:${userId}`) || 1;
// 		console.log("version ", version);
// 		const key = `fileData:${userId}:${version}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
// 		const getData = await redisClient.get(key);
// 		if (getData) {
// 			const result = JSON.parse(getData);
// 			if (!result || result?.data?.length === 0) {
// 				errorHandler(res, "No data found", 404, []);
// 				return;
// 			}
// 			successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
// 			return;
// 		}


// 		const baseConditions: any = {
// 			userId,
// 			isDeleted: true

// 		};

// 		if (!("isArchived" in filters)) {
// 			baseConditions.isArchived = false;
// 		}

// 		if (filters.isArchived === 'true' || filters.isArchived === 'false') {
// 			!!filters.isArchived
// 		}
// 		const newFilters = {
// 			...filters,
// 			userId: userId,
// 			isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
// 		}


// 		const orderClause: [string | any, string][] = selectedIds.length > 0
// 			? [
// 				[
// 					literal(`
// 			CASE
// 			  ${selectedIds.map((id, index) => `WHEN id = ${id} THEN ${index}`).join(' ')}
// 			  ELSE ${selectedIds.length}
// 			END
// 		  `),
// 					'ASC'
// 				]
// 			]
// 			: [
// 				[typeof sort_by === "string" ? sort_by : "id", typeof sort_order === "string" ? sort_order : "DESC"]
// 			];
// 		const readResponse = await paginateAndSort(
// 			FileAttributes,
// 			newFilters,
// 			pageNum,
// 			limitNum,
// 			orderClause
// 		);

// 		if (readResponse.data.length === 0) {
// 			errorHandler(res, "No data found", 404, []);
// 			return;
// 		}

// 		await redisClient.set(key, JSON.stringify(readResponse), { EX: 600 });
// 		successHandler(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
// 		return;
// 	} catch (error: any) {
// 		console.log("Error during data read ", error);
// 		errorHandler(res, "Failed to fetch data", 500, error?.message);
// 	}
// }
