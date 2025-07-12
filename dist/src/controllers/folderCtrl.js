"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFolder = exports.readOwnFolder = exports.readFolders = exports.insertFolder = void 0;
const FolderValidator_1 = require("../validators/FolderValidator");
const zod_1 = require("zod");
const responseHandler_1 = require("../helper/middleware/responseHandler");
const ModelRelation_1 = require("../models/ModelRelation");
const paginationUtils_1 = require("../utils/paginationUtils");
const ModelRelation_2 = require("../models/ModelRelation");
const redis_1 = __importDefault(require("../utils/redis"));
const Connection_1 = __importDefault(require("../db/Connection"));
const insertFolder = async (req, res) => {
    try {
        const validatedData = FolderValidator_1.folderSchema.parse(req.body);
        const userId = req.user?.userId;
        const addData = {
            ...validatedData,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerId: userId
        };
        const insertResponse = await ModelRelation_1.FolderModel.create(addData);
        if (validatedData.fileIds && validatedData.fileIds.length > 0 && insertResponse) {
            const linkFile = validatedData.fileIds.map((fileId) => ({
                folderUuid: insertResponse.dataValues.uuid,
                fileId,
                addedBy: userId,
                createdAt: new Date(),
            }));
            await ModelRelation_1.FolderFileMap.bulkCreate(linkFile);
        }
        await redis_1.default.incr(`user:folderDataVersion:${userId}`);
        (0, responseHandler_1.successHandler)(res, `Folder created successfully${validatedData.fileIds?.length ? " and files were added to it." : "."}`, {}, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const message = error.errors[0].message;
            (0, responseHandler_1.errorHandler)(res, message, 400, "Invalid data");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to create folder", 500, error.message);
    }
};
exports.insertFolder = insertFolder;
const readFolders = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort_by = "id", sort_order = "DESC", matchMode = "and", ...filters } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const userId = req?.user?.userId;
        const version = await redis_1.default.get(`user:folderDataVersion:${userId}`) || 1;
        const key = `folderData:${userId}:${version}:${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
        const getData = await redis_1.default.get(key);
        if (getData) {
            const result = JSON.parse(getData);
            if (!result || result?.data?.length === 0) {
                (0, responseHandler_1.errorHandler)(res, "No data found", 404, []);
                return;
            }
            (0, responseHandler_1.successHandler)(res, "Data fetched successfully", result.data, 200, result.meta);
            return;
        }
        const newFilters = {
            ...filters,
            ownerId: userId,
            isDeleted: filters?.isDeleted === 'true' ? !!filters.isDeleted : false,
        };
        const readResponse = await (0, paginationUtils_1.paginateAndSort)(ModelRelation_1.FolderModel, newFilters, pageNum, limitNum, [["createdAt", "DESC"]], [{
                model: ModelRelation_2.FileAttributes,
                as: "files",
                attributes: ['id'], // exclude actual file fields
                through: { attributes: [] }, // exclude pivot table fields
                duplicating: false, // avoid incorrect row counts,
            }]);
        if (readResponse.data.length === 0) {
            (0, responseHandler_1.successHandler)(res, "Folder data fetched successfully", [], 200);
            return;
        }
        const sendData = readResponse.data.map((folder) => {
            // const folderData = folder.get ? folder.get({ plain: true }) : folder;
            return {
                ...folder,
                filesCount: folder.files?.length || 0,
            };
        });
        await redis_1.default.set(key, JSON.stringify({ data: sendData, meta: readResponse.meta }), { EX: 600 });
        (0, responseHandler_1.successHandler)(res, "Folder data fetched successfully", sendData, 200, readResponse.meta);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch folders", 500, error.message);
    }
};
exports.readFolders = readFolders;
const readOwnFolder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            (0, responseHandler_1.errorHandler)(res, "Invalid folder id", 400, "Invalid folder id");
            return;
        }
        const userId = req.user?.userId;
        const uuid = id;
        const versionFolder = await redis_1.default.get(`user:folderDataVersion:${userId}`) || 1;
        const versionFile = await redis_1.default.get(`user:fileDataVersion:${userId}`) || 1;
        const key = `ownFolder:${uuid}:userId:${userId}:folderVersion:${versionFolder}:fileVersion:${versionFile}`;
        const getFolderData = await redis_1.default.get(key);
        if (getFolderData) {
            (0, responseHandler_1.successHandler)(res, "Data fetched successfully...", JSON.parse(getFolderData), 200);
            return;
        }
        const readResponse = await ModelRelation_1.FolderModel.findOne({
            where: {
                uuid: uuid,
                ownerId: userId
            },
            include: [{
                    model: ModelRelation_2.FileAttributes,
                    as: "files",
                    through: { attributes: [] },
                    required: false,
                    where: {
                        isDeleted: false,
                        isArchived: false
                    }
                }]
        });
        if (!readResponse) {
            (0, responseHandler_1.errorHandler)(res, "Folder not found", 404, "Folder not found");
            return;
        }
        await redis_1.default.set(key, JSON.stringify(readResponse));
        (0, responseHandler_1.successHandler)(res, "Folder data fetched successfully", readResponse, 200);
        return;
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch folder", 500, error.message);
    }
};
exports.readOwnFolder = readOwnFolder;
const updateFolder = async (req, res) => {
    const transaction = await Connection_1.default.transaction();
    try {
        const validatedData = FolderValidator_1.folderUpdateSchema.parse(req.body);
        const userId = req.user?.userId;
        const folder = await ModelRelation_1.FolderModel.findOne({
            where: {
                uuid: validatedData.uuid,
                ownerId: userId
            },
            transaction
        });
        if (!folder) {
            await transaction.rollback();
            (0, responseHandler_1.errorHandler)(res, "Folder not found", 404, "Folder not found");
            return;
        }
        await folder.update({
            ...validatedData,
            updatedAt: new Date()
        }, { transaction });
        if (validatedData.fileIds && validatedData.fileIds.length > 0) {
            const existingMaps = await ModelRelation_1.FolderFileMap.findAll({
                where: {
                    folderUuid: validatedData.uuid,
                    addedBy: userId
                },
                raw: true,
                attributes: ['fileId'],
                transaction
            });
            const existingFileIds = existingMaps.map((map) => map.fileId).sort();
            const incomingFileIds = [...validatedData.fileIds].sort();
            const areSame = existingFileIds.length === incomingFileIds.length &&
                existingFileIds.every((id, i) => id === incomingFileIds[i]);
            if (!areSame) {
                await ModelRelation_1.FolderFileMap.destroy({
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
                await ModelRelation_1.FolderFileMap.bulkCreate(newMappings, { transaction });
            }
        }
        await redis_1.default.incr(`user:folderDataVersion:${userId}`);
        await transaction.commit();
        (0, responseHandler_1.successHandler)(res, "Folder updated successfully", folder, 200);
    }
    catch (error) {
        await transaction.rollback();
        if (error instanceof zod_1.z.ZodError) {
            const message = error.errors[0].message;
            (0, responseHandler_1.errorHandler)(res, message || "Invalid data", 400, message || "Invalid data");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to update folder", 500, error.message);
    }
};
exports.updateFolder = updateFolder;
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
