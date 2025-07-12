import { CustomRequest } from "../helper/middleware/authUser";
import { Request, Response } from "express";
import { fileAttributesSchema, fileStatus, shareLinkValidator, uploadConfirmSchema } from "../validators/FileAtbValidator";
import { FileAttributes, SharedLink } from "../models/FilesModel";
import { errorHandler, successHandler } from "../helper/middleware/responseHandler";
import { number, z } from "zod";
import { UploadFiles } from "../interfaces/fileInterfaces";
import { deleteObject, getObject, isFileExists, putObject } from "../utils/s3Client";
import { v4 as uuidv4 } from 'uuid';
import { validateContentType } from "../utils/filesMiddleware";
import { Queue } from 'bullmq';
import { deleteFileData, getFileAttributes, getSignedUrlSer, validateDeleteFileIds } from "../services/FileAtrSer";
import { paginateAndSort } from "../utils/paginationUtils";
import redisClient from "../utils/redis";
import { literal, Op } from "sequelize";
import { FolderFileMap, FolderModel } from "../models/FolderModel";
import { sanitizeToYMD } from "../utils/generic";
import crypto from "crypto";



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
			return;
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
			await deleteFileData(validatedData.fileId, userId!);
			errorHandler(res, "Failed to upload file", 400, {});
			return;
		}

		if (!responseData) {
			errorHandler(res, "File not found", 404, {});
			return;
		}
		const checkFileExists = await isFileExists(responseData.dataValues.s3Key);
		if (!checkFileExists) {
			await deleteFileData(validatedData.fileId, userId!);
			errorHandler(res, "Failed to confirm file upload", 400, {});
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

		console.log("validatedData .folderUuid outside", validatedData.folderUuid);
		// console.log("Thumbnail generation job added to the queue", validatedData.fileId, responseData?.dataValues.s3Key, userId);
		if (validatedData.folderUuid?.length === 36) {
			console.log("validatedData .folderUuid inside", validatedData.folderUuid);
			const folder = await FolderModel.count({
				where: {
					uuid: validatedData.folderUuid,
				}
			})
			if (folder === 0) {
				errorHandler(res, "Folder not found", 404, "Folder not found");

				return

			}
			await FolderFileMap.create({

				folderUuid: validatedData.folderUuid,
				fileId: validatedData.fileId,
				addedBy: userId,
				createdAt: new Date(),

			})
			// await redisClient.get(`user:fileDataVersion:${userId}`) || 1;
			await redisClient.get(`user:folderDataVersion:${userId}`) || 1;

		}
		await redisClient.incr(`user:fileDataVersion:${userId}`)

		successHandler(res, "File upload confirmed successfully", {}, 200);

	} catch (error: any) {
		console.log("Error during file upload confirmation ", error);
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message || "Invalid request body";

			errorHandler(res, message, 400, {});
			return;
		}
		errorHandler(res, "Internal server error", 500, error?.message);
	}
}





export const readFiles = async (req: CustomRequest, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort_by = "id",
			fileIds = "",
			sort_order = "DESC",
			matchMode = "and",
			...filters
		} = req.query;
		const pageNum = parseInt(page as string, 10);
		const limitNum = parseInt(limit as string, 10);

		const userId = req?.user?.userId


		const version = await redisClient.get(`user:fileDataVersion:${userId}`) || 1;
		const deleteVersion = await redisClient.get(`user:fileDeleteVersion:${userId}`) || 1
		console.log("delete version ", deleteVersion)
		const key = `fileData:${userId}:${version}:${deleteVersion}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
		const getData = await redisClient.get(key);
		console.log(" get data ", getData);
		if (getData) {
			const result = JSON.parse(getData);
			if (!result || result?.data?.length === 0) {
				errorHandler(res, "No data found", 404, []);
				return;
			}
			successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
			return;
		}


		const baseConditions: any = {
			userId,
			isDeleted: true

		};

		if (!("isArchived" in filters)) {
			baseConditions.isArchived = false;
		}
		// if (!("isDeleted" in filters)) {
		// 	baseConditions.isDeleted = false;
		// }

		const normalizeFilters = (filters: Record<string, any>) => {
			const result: Record<string, any> = {};

			for (const [key, value] of Object.entries(filters)) {
				if (value === "true") {
					result[key] = true;
				} else if (value === "false") {
					result[key] = false;
				} else if (!isNaN(Number(value))) {
					result[key] = Number(value);
				} else {
					result[key] = value;
				}
			}

			return result;
		};




		// 		// const normalizedFilters: any = {};
		// 		const normalizedFilters = normalizeFilters(filters);

		// 		// for (const [key, value] of Object.entries(filters)) {
		// 		// 	normalizedFilters[key] = isNaN(Number(value)) ? value : Number(value);
		// 		// }
		// console.log(" filters ", filters, normalizedFilters);
		// 		let whereClause;
		// 		console.log(matchMode === "or");

		// 		if (matchMode === "or") {
		// 			const orConditions = Object.entries(normalizedFilters).map(([key, value]) => ({
		// 				[key]: value,
		// 			}));
		// 			console.log("new matchMode", matchMode);
		// 			console.log(" orConditions ", orConditions);


		// 			whereClause = {
		// 				...baseConditions,
		// 				[Op.or]: orConditions,
		// 			};
		// 			console.log(" whereClause ", whereClause);
		// 		} else {
		// 			console.log("matchMode and", matchMode);
		// 			// AND mode
		// 			whereClause = {
		// 				...baseConditions,
		// 				...normalizedFilters,
		// 			};
		// 		}

		// const fileIdsArr = fileIds.toString().split(",")
		// const selectedIds = Array.isArray(fileIdsArr) ? fileIdsArr.map(id => parseInt(String(id), 10)) :  [];
		let selectedIds: number[] = [];

		if (fileIds) {
			const rawIds = Array.isArray(fileIds)
				? fileIds
				: fileIds.toString().split(",");

			selectedIds = rawIds
				.map(id => parseInt(String(id), 10))
				.filter(id => !isNaN(id));
		}

		if (filters.isArchived === 'true' || filters.isArchived === 'false') {
			!!filters.isArchived
		}
		const newFilters = {
			...filters,
			userId: userId,
			isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
		}

		console.log(" selectedIds ", selectedIds);
		const orderClause: [string | any, string][] = selectedIds.length > 0
			? [
				[
					literal(`
					CASE	
					  ${selectedIds.map((id, index) => `WHEN id = ${id} THEN ${index}`).join(' ')}
					  ELSE ${selectedIds.length}
					END
				  `),
					'ASC'
				]
			]
			: [
				[typeof sort_by === "string" ? sort_by : "id", typeof sort_order === "string" ? sort_order : "DESC"]
			];
		const readResponse = await paginateAndSort(
			FileAttributes,
			newFilters,
			pageNum,
			limitNum,
			orderClause
		);

		if (readResponse.data.length === 0) {
			errorHandler(res, "No data found", 404, []);
			return;
		}

		await redisClient.set(key, JSON.stringify(readResponse), { EX: 600 });
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

			successHandler(res, "File fetched successfully...", signedUrlRedis, 200);
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
	} catch (error: any) {
		console.log("Error during file read ", error);
		errorHandler(res, "Failed to fetch file", 500, error?.message);


	}
}




export const updateFavouriteStatus = async (req: CustomRequest, res: Response) => {
	try {
		const userId = req.user?.userId
		if (!userId) {
			errorHandler(res, "Unauthorized", 401, {});
			return
		}
		const fileId = req.params.fileId
		const ifExistResult = await getFileAttributes(+fileId, userId)
		if (!ifExistResult.success) {
			errorHandler(res, ifExistResult.message, ifExistResult.status, {})
			return
		}

		const validatedStatus = fileStatus.parse(req.body)
		let updateData = {}
		if ((validatedStatus.isArchived === false || validatedStatus.isArchived === true) || (validatedStatus.isFavorite === false || validatedStatus.isFavorite === true) || (validatedStatus.isDeleted === false || validatedStatus.isDeleted === true)) {
			updateData = { ...validatedStatus, updatedAt: new Date(), deletedAt: validatedStatus.isDeleted ? new Date() : null }

		}

		console.log(fileId);

		const updateResponse = await FileAttributes.update(updateData, {
			where: {
				id: parseInt(fileId)
			}
		})
		await redisClient.incr(`user:fileDataVersion:${userId}`);

		successHandler(res, "Updated file status", updateResponse, 200)


	} catch (error: any) {
		if (error instanceof z.ZodError) {
			const errMessage = error.errors[0].message
			errorHandler(res, errMessage, 400, "Invalid data")
			return
		}
		errorHandler(res, "Failed to update favourite status0", 500, error.message)

	}
}







export const readFilesByDates = async (req: CustomRequest, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort_by = "id",
			sort_order = "DESC",
			rawStart,
			rawEnd,
			matchMode = "and",
			...filters
		} = req.query;
		const pageNum = parseInt(page as string, 10);
		const limitNum = parseInt(limit as string, 10);

		console.log(" req , query ", req.url)

		const userId = req?.user?.userId
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(new Date().getDate() - 7);

		const startDate = sanitizeToYMD(rawStart?.toString() || sevenDaysAgo);
		const defaultEndDate = new Date();
		defaultEndDate.setDate(defaultEndDate.getDate() + 1);
		const endDate = sanitizeToYMD(rawEnd?.toString() || defaultEndDate);

		const deleteVersion = await redisClient.get(`user:fileDeleteVersion:${userId}`) || 1
		const version = await redisClient.get(`user:fileDataVersion:${userId}`) || 1;

		const key = `fileData:${userId}:${version}:${deleteVersion}:${startDate}:${endDate}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
		const getData = await redisClient.get(key);

		if (getData) {
			const result = JSON.parse(getData);
			if (!result || result?.data?.length === 0) {
				errorHandler(res, "No latest file data found", 404, []);
				return;
			}
			successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
			return;
		}


		const baseConditions: any = {
			userId,
			isDeleted: true

		};

		if (!("isArchived" in filters)) {
			baseConditions.isArchived = false;
		}

		if (filters.isArchived === 'true' || filters.isArchived === 'false') {
			!!filters.isArchived
		}


		const newFilters = {
			...filters,
			userId: userId,
			isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
			createdAt: { [Op.between]: [startDate, endDate] }

		}

		const readResponse = await paginateAndSort(
			FileAttributes,
			newFilters,
			pageNum,
			limitNum,
			[["id", "DESC"]]
		);

		if (readResponse.data.length === 0) {
			errorHandler(res, "No data found", 404, []);
			return;
		}

		await redisClient.set(key, JSON.stringify(readResponse), { EX: 600 });
		successHandler(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
		return;




	} catch (error: any) {
		console.log("Error during data read ", error);
		if (error.message.includes("Invalid date input")) {
			errorHandler(res, "Failed to fetch data", 400, error?.message);
			return
		}
		errorHandler(res, "Failed to fetch data", 500, error?.message);
	}
}





export const shareLinkPublic = async (req: CustomRequest, res: Response) => {
	try {
		console.log("req.body ", req.body)
		const validateData = shareLinkValidator.parse(req.body)
		const userId = req.user?.userId
		const ifFileExist = await FileAttributes.count({
			where: {
				id: validateData.fileId,
				userId: userId,
				isDeleted: false,
				isArchived: false
			},
		})
		console.log("ifFileExist", ifFileExist)

		if (ifFileExist === 0) {
			errorHandler(res, "File not found", 404, {});
			return;
		}

		const token = crypto.randomBytes(32).toString("hex");
		const addData = {
			fileId: validateData.fileId,
			ownerId: userId,
			token: token,
			createdAt: new Date(),
			expireAt: validateData.expireAt,

		}
		await SharedLink.create(addData)
		successHandler(res, "Link created successfully...", token, 201)
		return;
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			const message = error.errors[0].message
			errorHandler(res, message || "Invalid request body", 400, message);
			return
		}
		errorHandler(res, "Failed to create share link", 500, error.message);
	}
}



export const readShareLink = async (req: Request, res: Response) => {
	try {
		const fileId = req.params.fileId
		const token = req.query.token

		if (!fileId) {
			errorHandler(res, "File ID is required", 400, "File ID is required");
			return
		}
		if (!token) {
			errorHandler(res, "Token is required", 400, "Token is required");
			return
		}
		const shareResponse = await SharedLink.findOne({ where: { fileId: fileId, token: token } })
		if (!shareResponse) {
			errorHandler(res, "Invalid share link", 400, "Invalid share link");
			return
		}
		if (shareResponse.dataValues.expireAt && shareResponse.dataValues.expireAt < new Date()) {
			errorHandler(res, "Link has expired", 400, "Link has expired");
			return
		}
		const fileResponse = await FileAttributes.findOne({
			where: {
				id: fileId,
				isArchived: false,
				isDeleted: false
			},
			attributes: ['id', 'fileName', 'thumbnailUrl', 's3Key', 'fileType']

		})

		if (!fileResponse) {
			errorHandler(res, "File not found", 404, "File not found");
			return
		}
		const signedUrl = await getSignedUrlSer(fileResponse.dataValues.s3Key, parseInt(fileId))

		if (signedUrl.error) {
			errorHandler(res, signedUrl.message, 500, signedUrl.data || "");
			return
		}

		const sendData = {
			fileName: fileResponse.dataValues.fileName,
			fileType: fileResponse.dataValues.fileType,
			thumbnailUrl: fileResponse.dataValues.thumbnailUrl,
			signedUrl: signedUrl.data
		}

		successHandler(res, "File read successfully", sendData, 200);
		return

	} catch (error: any) {
		errorHandler(res, "Failed to fetch file", 500, error.message);
	}
}




export const deleteFilePermanently = async (req: CustomRequest, res: Response) => {
	try {

		const fileIds = req.body.ids
		const userId = req.user?.userId
		const validateFiles = await validateDeleteFileIds(fileIds, userId!)
		if (validateFiles.error) {
			errorHandler(res, validateFiles.message, validateFiles.statusCode, {})
			return
		}

		// 		if (fileIds.length > 10) {
		//   // Add job to queue here (assumed to be done already)

		//   return successHandler(
		//     res,
		//     "We're deleting your files in the background. You can leave the page — we'll notify you once it's done.",
		//     {},
		//     202 // 202 Accepted = request accepted for processing but not yet completed
		//   );
		// }



		const filesIds = validateFiles.data.map((file: any) => file.id)
		if (validateFiles.data.length > 10) {

			const deleteFilesQueue = new Queue('delete-files-permanently', {
				connection: {
					url: process.env.REDIS_URI,
				},
			});

			await deleteFilesQueue.add('delete-files-permanently', {
				fileIds: filesIds,
				userId: userId,
			}, {
				removeOnComplete: {
					age: 300, 
				},
				removeOnFail: {
					age: 1200, 
				},
			});

			successHandler(res, "Files are being deleted in the background! You will be notified once it's done", {}, 202);
			await redisClient.del(`user:fileDataVersion:${userId}`);

			return
		}


		console.log("file data ", validateFiles)

		const ogFilesKey = validateFiles.data.map((file: any) => file.s3Key)
		const thumbnailKeys = validateFiles.data
			.map((file: any) => file.thumbnailKey)
			.filter((key: any) => key != null);

		const deleteFile = await deleteObject(ogFilesKey, process.env.BucketName!)
		console.log("delete File", deleteFile)

		if (deleteFile.error) {
			errorHandler(res, deleteFile.message, deleteFile.status, {});
			return
		}

		// const delete
		if (thumbnailKeys.length > 0) {
			const deleteThumbnail = await deleteObject(thumbnailKeys, process.env.PublicBucketName!)
			console.log("deleteThumbnail ", deleteThumbnail)

		}

		await FileAttributes.destroy({
			where: {
				id: {
					[Op.in]: filesIds
				}
			}
		})



		const ifFileExistInFolder = await FolderFileMap.count({
			where: {
				fileId: {
					[Op.in]: filesIds
				}
			}
		})

		if (ifFileExistInFolder > 0) {
			await FolderFileMap.destroy({
				where: {
					fileId: {
						[Op.in]: filesIds
					}
				}
			})
		}



		await redisClient.incr(`user:fileDataVersion:${userId}`);
		await redisClient.incr(`user:fileDeleteVersion:${userId}`);

		successHandler(res, "File deleted successfully", {}, 200);


	} catch (error: any) {
		console.log("error ", error)
		errorHandler(res, "Failed to delete file", 500, error.message);

	}
}



// const worker = async () => {
// 	const version = await redisClient.get(`user:fileDeleteVersion:${3}`);
// 	console.log("version ", version)

// 	// const deleteFilesQueue = new Queue('delete-files-permanently', {
// 	// 	connection: {
// 	// 		url: process.env.REDIS_URI,
// 	// 	},
// 	// });

// 	// await deleteFilesQueue.add('delete-files-permanently', {
// 	// 	fileIds: [12,13,14],
// 	// 	userId: 3,
// 	// 	// version:version
// 	// });
// }

// worker()