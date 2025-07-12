"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFilePermanently = exports.readShareLink = exports.shareLinkPublic = exports.readFilesByDates = exports.updateFavouriteStatus = exports.getFileSignedUrl = exports.readFiles = exports.confirmFileUpload = exports.uploadFileUrl = void 0;
const FileAtbValidator_1 = require("../validators/FileAtbValidator");
const FilesModel_1 = require("../models/FilesModel");
const responseHandler_1 = require("../helper/middleware/responseHandler");
const zod_1 = require("zod");
const s3Client_1 = require("../utils/s3Client");
const uuid_1 = require("uuid");
const filesMiddleware_1 = require("../utils/filesMiddleware");
const bullmq_1 = require("bullmq");
const FileAtrSer_1 = require("../services/FileAtrSer");
const paginationUtils_1 = require("../utils/paginationUtils");
const redis_1 = __importDefault(require("../utils/redis"));
const sequelize_1 = require("sequelize");
const FolderModel_1 = require("../models/FolderModel");
const generic_1 = require("../utils/generic");
const crypto_1 = __importDefault(require("crypto"));
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
const uploadFileUrl = async (req, res) => {
    try {
        const validatedData = FileAtbValidator_1.fileAttributesSchema.parse(req.body);
        const validateFile = (0, filesMiddleware_1.validateContentType)(validatedData.contentType, validatedData.fileName);
        if (validateFile.error) {
            const erroMessage = validateFile.message;
            (0, responseHandler_1.errorHandler)(res, erroMessage, 400, {});
            return;
        }
        const fileUuid = (0, uuid_1.v4)();
        console.log(fileUuid);
        const userId = req.user?.userId;
        const fileData = {
            fileName: validatedData.fileName,
            fileType: validatedData.contentType.split('/')[0],
            userId: userId,
            contentType: validatedData.contentType,
            uuid: fileUuid
        };
        const uploadUrl = await (0, s3Client_1.putObject)(fileData);
        if (uploadUrl.error) {
            (0, responseHandler_1.errorHandler)(res, "Failed to generate upload URL", 500, uploadUrl.message);
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
        };
        const fileRecord = await FilesModel_1.FileAttributes.create(addData);
        const incr = await redis_1.default.incr(`user:fileDataVersion:${userId}`);
        console.log("incr ", incr);
        const sendData = {
            fileId: fileRecord.dataValues.id,
            uploadUrl: uploadUrl.signedUrl,
        };
        (0, responseHandler_1.successHandler)(res, "Upload URL generated successfully", sendData, 200);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const message = error.errors[0].message || "Invalid request body";
            (0, responseHandler_1.errorHandler)(res, message, 400, {});
            return;
        }
        console.log("Error during upload url generation ", error);
        (0, responseHandler_1.errorHandler)(res, "Internal server error", 500, error?.message);
    }
};
exports.uploadFileUrl = uploadFileUrl;
const confirmFileUpload = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const validatedData = FileAtbValidator_1.uploadConfirmSchema.parse(req.body);
        const responseData = await FilesModel_1.FileAttributes.findOne({
            where: {
                id: validatedData.fileId,
                userId: userId,
            },
            attributes: ['s3Key'],
        });
        if (!validatedData.success) {
            await (0, FileAtrSer_1.deleteFileData)(validatedData.fileId, userId);
            (0, responseHandler_1.errorHandler)(res, "Failed to upload file", 400, {});
            return;
        }
        if (!responseData) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        const checkFileExists = await (0, s3Client_1.isFileExists)(responseData.dataValues.s3Key);
        if (!checkFileExists) {
            await (0, FileAtrSer_1.deleteFileData)(validatedData.fileId, userId);
            (0, responseHandler_1.errorHandler)(res, "Failed to confirm file upload", 400, {});
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
            const folder = await FolderModel_1.FolderModel.count({
                where: {
                    uuid: validatedData.folderUuid,
                }
            });
            if (folder === 0) {
                (0, responseHandler_1.errorHandler)(res, "Folder not found", 404, "Folder not found");
                return;
            }
            await FolderModel_1.FolderFileMap.create({
                folderUuid: validatedData.folderUuid,
                fileId: validatedData.fileId,
                addedBy: userId,
                createdAt: new Date(),
            });
            // await redisClient.get(`user:fileDataVersion:${userId}`) || 1;
            await redis_1.default.get(`user:folderDataVersion:${userId}`) || 1;
        }
        await redis_1.default.incr(`user:fileDataVersion:${userId}`);
        (0, responseHandler_1.successHandler)(res, "File upload confirmed successfully", {}, 200);
    }
    catch (error) {
        console.log("Error during file upload confirmation ", error);
        if (error instanceof zod_1.z.ZodError) {
            const message = error.errors[0].message || "Invalid request body";
            (0, responseHandler_1.errorHandler)(res, message, 400, {});
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Internal server error", 500, error?.message);
    }
};
exports.confirmFileUpload = confirmFileUpload;
const readFiles = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort_by = "id", fileIds = "", sort_order = "DESC", matchMode = "and", ...filters } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const userId = req?.user?.userId;
        const version = await redis_1.default.get(`user:fileDataVersion:${userId}`) || 1;
        const deleteVersion = await redis_1.default.get(`user:fileDeleteVersion:${userId}`) || 1;
        console.log("delete version ", deleteVersion);
        const key = `fileData:${userId}:${version}:${deleteVersion}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
        const getData = await redis_1.default.get(key);
        console.log(" get data ", getData);
        if (getData) {
            const result = JSON.parse(getData);
            if (!result || result?.data?.length === 0) {
                (0, responseHandler_1.errorHandler)(res, "No data found", 404, []);
                return;
            }
            (0, responseHandler_1.successHandler)(res, "Data fetched successfully", result.data, 200, result.meta);
            return;
        }
        const baseConditions = {
            userId,
            isDeleted: true
        };
        if (!("isArchived" in filters)) {
            baseConditions.isArchived = false;
        }
        // if (!("isDeleted" in filters)) {
        // 	baseConditions.isDeleted = false;
        // }
        const normalizeFilters = (filters) => {
            const result = {};
            for (const [key, value] of Object.entries(filters)) {
                if (value === "true") {
                    result[key] = true;
                }
                else if (value === "false") {
                    result[key] = false;
                }
                else if (!isNaN(Number(value))) {
                    result[key] = Number(value);
                }
                else {
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
        let selectedIds = [];
        if (fileIds) {
            const rawIds = Array.isArray(fileIds)
                ? fileIds
                : fileIds.toString().split(",");
            selectedIds = rawIds
                .map(id => parseInt(String(id), 10))
                .filter(id => !isNaN(id));
        }
        if (filters.isArchived === 'true' || filters.isArchived === 'false') {
            !!filters.isArchived;
        }
        const newFilters = {
            ...filters,
            userId: userId,
            isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
        };
        console.log(" selectedIds ", selectedIds);
        const orderClause = selectedIds.length > 0
            ? [
                [
                    (0, sequelize_1.literal)(`
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
        const readResponse = await (0, paginationUtils_1.paginateAndSort)(FilesModel_1.FileAttributes, newFilters, pageNum, limitNum, orderClause);
        if (readResponse.data.length === 0) {
            (0, responseHandler_1.errorHandler)(res, "No data found", 404, []);
            return;
        }
        await redis_1.default.set(key, JSON.stringify(readResponse), { EX: 600 });
        (0, responseHandler_1.successHandler)(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
        return;
    }
    catch (error) {
        console.log("Error during data read ", error);
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch data", 500, error?.message);
    }
};
exports.readFiles = readFiles;
const getFileSignedUrl = async (req, res) => {
    try {
        const userId = req?.user?.userId;
        const fileId = req.params.id;
        const readResponse = await FilesModel_1.FileAttributes.findOne({
            where: { id: fileId, userId: userId },
            attributes: ['id', 's3Key', 'fileName']
        });
        if (!readResponse) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        if (!readResponse.dataValues.s3Key) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        const key = `signedUrl:${fileId}:${userId}`;
        const signedUrlRedis = await redis_1.default.get(key);
        console.log;
        if (signedUrlRedis) {
            console.log("signedUrlRedis", signedUrlRedis);
            (0, responseHandler_1.successHandler)(res, "File fetched successfully...", signedUrlRedis, 200);
            return;
        }
        const getSignedUrl = await (0, s3Client_1.getObject)(readResponse.dataValues.s3Key);
        if (getSignedUrl.error) {
            (0, responseHandler_1.errorHandler)(res, "Failed to fetch file", 404, getSignedUrl.error);
            return;
        }
        await redis_1.default.set(key, getSignedUrl.signedUrl, { EX: 300 }); // 7
        (0, responseHandler_1.successHandler)(res, "File fetched successfully...", getSignedUrl.signedUrl, 200);
        return;
    }
    catch (error) {
        console.log("Error during file read ", error);
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch file", 500, error?.message);
    }
};
exports.getFileSignedUrl = getFileSignedUrl;
const updateFavouriteStatus = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            (0, responseHandler_1.errorHandler)(res, "Unauthorized", 401, {});
            return;
        }
        const fileId = req.params.fileId;
        const ifExistResult = await (0, FileAtrSer_1.getFileAttributes)(+fileId, userId);
        if (!ifExistResult.success) {
            (0, responseHandler_1.errorHandler)(res, ifExistResult.message, ifExistResult.status, {});
            return;
        }
        const validatedStatus = FileAtbValidator_1.fileStatus.parse(req.body);
        let updateData = {};
        if ((validatedStatus.isArchived === false || validatedStatus.isArchived === true) || (validatedStatus.isFavorite === false || validatedStatus.isFavorite === true) || (validatedStatus.isDeleted === false || validatedStatus.isDeleted === true)) {
            updateData = { ...validatedStatus, updatedAt: new Date(), deletedAt: validatedStatus.isDeleted ? new Date() : null };
        }
        console.log(fileId);
        const updateResponse = await FilesModel_1.FileAttributes.update(updateData, {
            where: {
                id: parseInt(fileId)
            }
        });
        await redis_1.default.incr(`user:fileDataVersion:${userId}`);
        (0, responseHandler_1.successHandler)(res, "Updated file status", updateResponse, 200);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errMessage = error.errors[0].message;
            (0, responseHandler_1.errorHandler)(res, errMessage, 400, "Invalid data");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to update favourite status0", 500, error.message);
    }
};
exports.updateFavouriteStatus = updateFavouriteStatus;
const readFilesByDates = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort_by = "id", sort_order = "DESC", rawStart, rawEnd, matchMode = "and", ...filters } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        console.log(" req , query ", req.url);
        const userId = req?.user?.userId;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(new Date().getDate() - 7);
        const startDate = (0, generic_1.sanitizeToYMD)(rawStart?.toString() || sevenDaysAgo);
        const defaultEndDate = new Date();
        defaultEndDate.setDate(defaultEndDate.getDate() + 1);
        const endDate = (0, generic_1.sanitizeToYMD)(rawEnd?.toString() || defaultEndDate);
        const deleteVersion = await redis_1.default.get(`user:fileDeleteVersion:${userId}`) || 1;
        const version = await redis_1.default.get(`user:fileDataVersion:${userId}`) || 1;
        const key = `fileData:${userId}:${version}:${deleteVersion}:${startDate}:${endDate}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
        const getData = await redis_1.default.get(key);
        if (getData) {
            const result = JSON.parse(getData);
            if (!result || result?.data?.length === 0) {
                (0, responseHandler_1.errorHandler)(res, "No latest file data found", 404, []);
                return;
            }
            (0, responseHandler_1.successHandler)(res, "Data fetched successfully", result.data, 200, result.meta);
            return;
        }
        const baseConditions = {
            userId,
            isDeleted: true
        };
        if (!("isArchived" in filters)) {
            baseConditions.isArchived = false;
        }
        if (filters.isArchived === 'true' || filters.isArchived === 'false') {
            !!filters.isArchived;
        }
        const newFilters = {
            ...filters,
            userId: userId,
            isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
            createdAt: { [sequelize_1.Op.between]: [startDate, endDate] }
        };
        const readResponse = await (0, paginationUtils_1.paginateAndSort)(FilesModel_1.FileAttributes, newFilters, pageNum, limitNum, [["id", "DESC"]]);
        if (readResponse.data.length === 0) {
            (0, responseHandler_1.errorHandler)(res, "No data found", 404, []);
            return;
        }
        await redis_1.default.set(key, JSON.stringify(readResponse), { EX: 600 });
        (0, responseHandler_1.successHandler)(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
        return;
    }
    catch (error) {
        console.log("Error during data read ", error);
        if (error.message.includes("Invalid date input")) {
            (0, responseHandler_1.errorHandler)(res, "Failed to fetch data", 400, error?.message);
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch data", 500, error?.message);
    }
};
exports.readFilesByDates = readFilesByDates;
const shareLinkPublic = async (req, res) => {
    try {
        console.log("req.body ", req.body);
        const validateData = FileAtbValidator_1.shareLinkValidator.parse(req.body);
        const userId = req.user?.userId;
        const ifFileExist = await FilesModel_1.FileAttributes.count({
            where: {
                id: validateData.fileId,
                userId: userId,
                isDeleted: false,
                isArchived: false
            },
        });
        console.log("ifFileExist", ifFileExist);
        if (ifFileExist === 0) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const addData = {
            fileId: validateData.fileId,
            ownerId: userId,
            token: token,
            createdAt: new Date(),
            expireAt: validateData.expireAt,
        };
        await FilesModel_1.SharedLink.create(addData);
        (0, responseHandler_1.successHandler)(res, "Link created successfully...", token, 201);
        return;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const message = error.errors[0].message;
            (0, responseHandler_1.errorHandler)(res, message || "Invalid request body", 400, message);
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to create share link", 500, error.message);
    }
};
exports.shareLinkPublic = shareLinkPublic;
const readShareLink = async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const token = req.query.token;
        if (!fileId) {
            (0, responseHandler_1.errorHandler)(res, "File ID is required", 400, "File ID is required");
            return;
        }
        if (!token) {
            (0, responseHandler_1.errorHandler)(res, "Token is required", 400, "Token is required");
            return;
        }
        const shareResponse = await FilesModel_1.SharedLink.findOne({ where: { fileId: fileId, token: token } });
        if (!shareResponse) {
            (0, responseHandler_1.errorHandler)(res, "Invalid share link", 400, "Invalid share link");
            return;
        }
        if (shareResponse.dataValues.expireAt && shareResponse.dataValues.expireAt < new Date()) {
            (0, responseHandler_1.errorHandler)(res, "Link has expired", 400, "Link has expired");
            return;
        }
        const fileResponse = await FilesModel_1.FileAttributes.findOne({
            where: {
                id: fileId,
                isArchived: false,
                isDeleted: false
            },
            attributes: ['id', 'fileName', 'thumbnailUrl', 's3Key', 'fileType']
        });
        if (!fileResponse) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, "File not found");
            return;
        }
        const signedUrl = await (0, FileAtrSer_1.getSignedUrlSer)(fileResponse.dataValues.s3Key, parseInt(fileId));
        if (signedUrl.error) {
            (0, responseHandler_1.errorHandler)(res, signedUrl.message, 500, signedUrl.data || "");
            return;
        }
        const sendData = {
            fileName: fileResponse.dataValues.fileName,
            fileType: fileResponse.dataValues.fileType,
            thumbnailUrl: fileResponse.dataValues.thumbnailUrl,
            signedUrl: signedUrl.data
        };
        (0, responseHandler_1.successHandler)(res, "File read successfully", sendData, 200);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch file", 500, error.message);
    }
};
exports.readShareLink = readShareLink;
const deleteFilePermanently = async (req, res) => {
    try {
        const fileIds = req.body.ids;
        const userId = req.user?.userId;
        const validateFiles = await (0, FileAtrSer_1.validateDeleteFileIds)(fileIds, userId);
        if (validateFiles.error) {
            (0, responseHandler_1.errorHandler)(res, validateFiles.message, validateFiles.statusCode, {});
            return;
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
        const filesIds = validateFiles.data.map((file) => file.id);
        if (validateFiles.data.length > 10) {
            const deleteFilesQueue = new bullmq_1.Queue('delete-files-permanently', {
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
            (0, responseHandler_1.successHandler)(res, "Files are being deleted in the background! You will be notified once it's done", {}, 202);
            await redis_1.default.del(`user:fileDataVersion:${userId}`);
            return;
        }
        console.log("file data ", validateFiles);
        const ogFilesKey = validateFiles.data.map((file) => file.s3Key);
        const thumbnailKeys = validateFiles.data
            .map((file) => file.thumbnailKey)
            .filter((key) => key != null);
        const deleteFile = await (0, s3Client_1.deleteObject)(ogFilesKey, process.env.BucketName);
        console.log("delete File", deleteFile);
        if (deleteFile.error) {
            (0, responseHandler_1.errorHandler)(res, deleteFile.message, deleteFile.status, {});
            return;
        }
        // const delete
        if (thumbnailKeys.length > 0) {
            const deleteThumbnail = await (0, s3Client_1.deleteObject)(thumbnailKeys, process.env.PublicBucketName);
            console.log("deleteThumbnail ", deleteThumbnail);
        }
        await FilesModel_1.FileAttributes.destroy({
            where: {
                id: {
                    [sequelize_1.Op.in]: filesIds
                }
            }
        });
        const ifFileExistInFolder = await FolderModel_1.FolderFileMap.count({
            where: {
                fileId: {
                    [sequelize_1.Op.in]: filesIds
                }
            }
        });
        if (ifFileExistInFolder > 0) {
            await FolderModel_1.FolderFileMap.destroy({
                where: {
                    fileId: {
                        [sequelize_1.Op.in]: filesIds
                    }
                }
            });
        }
        await redis_1.default.incr(`user:fileDataVersion:${userId}`);
        await redis_1.default.incr(`user:fileDeleteVersion:${userId}`);
        (0, responseHandler_1.successHandler)(res, "File deleted successfully", {}, 200);
    }
    catch (error) {
        console.log("error ", error);
        (0, responseHandler_1.errorHandler)(res, "Failed to delete file", 500, error.message);
    }
};
exports.deleteFilePermanently = deleteFilePermanently;
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
