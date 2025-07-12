"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileSignedUrl = exports.updateSharedFileCollaborators = exports.getCollaborators = exports.getSharedFiles = exports.shareFileWithUsers = void 0;
const ShareFilesValidator_1 = require("../validators/ShareFilesValidator");
const filterValidUsers_1 = require("../utils/filterValidUsers");
const ModelRelation_1 = require("../models/ModelRelation");
const responseHandler_1 = require("../helper/middleware/responseHandler");
const zod_1 = require("zod");
const redis_1 = __importDefault(require("../utils/redis"));
const generic_1 = require("../utils/generic");
const paginationUtils_1 = require("../utils/paginationUtils");
const Connection_1 = __importDefault(require("../db/Connection"));
const s3Client_1 = require("../utils/s3Client");
const shareFileWithUsers = async (req, res) => {
    try {
        const validateBody = ShareFilesValidator_1.shareFilesWithUsersValidator.parse(req.body);
        const userId = req.user?.userId;
        const validateUsers = await (0, filterValidUsers_1.filterValidUsers)(validateBody.collaborators);
        const inserData = validateUsers.map((data) => ({
            ownerId: userId,
            fileId: validateBody.fileId,
            sharedWithUserId: data.sharedWithUserId,
            sharedWithUserEmail: data.sharedWithUserEmail,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const insertResponse = await ModelRelation_1.SharedFiles.bulkCreate(inserData);
        validateUsers.forEach(async (user) => {
            await redis_1.default.incr(`user:SharedFiles:${user.sharedWithUserId}`);
        });
        if (insertResponse) {
            (0, responseHandler_1.successHandler)(res, "Files shared successfully", {}, 201);
            return;
        }
        (0, responseHandler_1.errorHandler)(res, "Failed to share files", 400, "Failed to share files with selected users");
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.log("Zod Error:", error.errors);
            (0, responseHandler_1.errorHandler)(res, error.errors[0].message || "Invalid request data", 400, "Invalid request data");
            return;
        }
        console.log(error);
        (0, responseHandler_1.errorHandler)(res, "An unexpected error occurred", 500, error.message || "Failed to share files");
        return;
    }
};
exports.shareFileWithUsers = shareFileWithUsers;
const getSharedFiles = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort_by = "id", sort_order = "DESC", rawStart, rawEnd, ...filters } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const loggedInUser = req.user?.userId;
        if (!loggedInUser) {
            (0, responseHandler_1.errorHandler)(res, "User ID is required", 400, "User ID is required");
            return;
        }
        const version = await redis_1.default.get(`user:SharedFiles:${loggedInUser}`) || 1;
        // const key = `SharedfileData:${loggedInUser}:${version}:${rawStart}: ${rawEnd}: ${pageNum}:${limitNum}:${sort_by}:${sort_order}:${JSON.stringify(filters)}`;
        // const getData = await redisClient.get(key);
        // if (getData) {
        // 	const result = JSON.parse(getData);
        // 	successHandler(res, "Data fetched successfully", result.data, 200, result.meta);
        // 	return;
        // }
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(new Date().getDate() - 7);
        const startDate = (0, generic_1.sanitizeToYMD)(rawStart?.toString() || sevenDaysAgo);
        const endDate = (0, generic_1.sanitizeToYMD)(rawEnd?.toString() || new Date());
        const newFilters = {
            ...filters,
            sharedWithUserId: loggedInUser,
            // createdAt: { [Op.between]: [startDate, endDate] }
        };
        const readResponse = await (0, paginationUtils_1.paginateAndSort)(ModelRelation_1.SharedFiles, newFilters, pageNum, limitNum, [["id", "DESC"]], [{
                model: ModelRelation_1.FileAttributes,
                where: { isArchived: false, isDeleted: false },
                attributes: ['id', 'fileName', 'fileType', 'fileSize', 'createdAt', 'updatedAt', 'thumbnailUrl', 'fileUid', 's3Key'],
                required: true,
            },
            {
                model: ModelRelation_1.UserModel,
                as: "owner",
                attributes: ['id', 'fullName', 'email', 'profileUrl'],
            }
        ]);
        console.log("readResponse", readResponse);
        // await redisClient.set(key, JSON.stringify(readResponse), { EX: 600 });
        (0, responseHandler_1.successHandler)(res, "Data read successfully...", readResponse.data, 200, readResponse.meta);
        return;
    }
    catch (error) {
        console.error("Error in getSharedFiles:", error);
        (0, responseHandler_1.errorHandler)(res, "An unexpected error occurred", 500, error.message || "Failed to fetch shared files");
    }
};
exports.getSharedFiles = getSharedFiles;
const getCollaborators = async (req, res) => {
    try {
        const fileId = parseInt(req.params.fileId, 10);
        if (isNaN(fileId)) {
            (0, responseHandler_1.errorHandler)(res, "Invalid file ID", 400, "Invalid file ID");
            return;
        }
        const ownerId = req.user?.userId;
        const collaborators = await ModelRelation_1.SharedFiles.findAll({
            where: { ownerId: ownerId, fileId: fileId },
            attributes: ["id", "sharedWithUserId", "role"],
            include: [
                {
                    model: ModelRelation_1.UserModel,
                    as: "sharedWithUser",
                    attributes: ['id', 'fullName', 'email', 'profileUrl', 'block'],
                    required: true,
                }
            ]
        });
        (0, responseHandler_1.successHandler)(res, "Collaborators retrieved successfully", collaborators, 200);
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "An unexpected error occurred", 500, "Failed to retrieve collaborators");
    }
};
exports.getCollaborators = getCollaborators;
const updateSharedFileCollaborators = async (req, res) => {
    try {
        const ownerId = req.user?.userId; // type it better if you have a custom RequestUser type
        const { fileId, collaborators } = ShareFilesValidator_1.updateSharedCollaboratorsValidator.parse(req.body);
        // const existing: {
        //   id: number;
        //   sharedWithUserId: number;
        //   role: 'Reader' | 'Editor';
        // }[] = await SharedFiles.findAll({
        //   where: { fileId, ownerId },
        //   raw: true
        // });
        const existing = await ModelRelation_1.SharedFiles.findAll({
            where: { fileId, ownerId },
            attributes: ["id", "sharedWithUserId", "role"],
            raw: true,
        });
        const incomingMap = new Map();
        for (const collab of collaborators) {
            incomingMap.set(collab.sharedWithUserId, collab);
        }
        const toInsert = [];
        const toUpdate = [];
        const toDelete = [];
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
            }
            else {
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
        await Connection_1.default.transaction(async (t) => {
            if (toInsert.length) {
                await ModelRelation_1.SharedFiles.bulkCreate(toInsert, { transaction: t });
            }
            for (const update of toUpdate) {
                await ModelRelation_1.SharedFiles.update({ role: update.role, updatedAt: new Date() }, { where: { id: update.id }, transaction: t });
            }
            if (toDelete.length) {
                await ModelRelation_1.SharedFiles.destroy({
                    where: { id: toDelete },
                    transaction: t
                });
            }
        });
        // return res.status(200).json({
        //   message: "Collaborators updated successfully"
        // });
        (0, responseHandler_1.successHandler)(res, "Collaborators updated successfully", {}, 200);
        return;
    }
    catch (error) {
        console.error("Error updating collaborators:", error);
        // return res.status(500).json({
        //   message: "Something went wrong",
        //   error: error.message
        // });
        if (error instanceof zod_1.z.ZodError) {
            (0, responseHandler_1.errorHandler)(res, error.errors[0].message || "Invalid request data", 400, "Invalid request data");
            return;
        }
        (0, responseHandler_1.errorHandler)(res, error.message || "Something went wrong", 500, "Internal Server Error");
    }
};
exports.updateSharedFileCollaborators = updateSharedFileCollaborators;
const getFileSignedUrl = async (req, res) => {
    try {
        const userId = req?.user?.userId;
        const fileId = req.params.id;
        const readResponse = await ModelRelation_1.SharedFiles.findOne({
            where: { fileId: fileId, sharedWithUserId: userId },
            attributes: ['id', 'fileId', 'sharedWithUserId', 'role'],
            // raw: true,
            include: [{
                    model: ModelRelation_1.FileAttributes,
                    attributes: ['id', 's3Key', 'fileName'],
                    required: true,
                }]
        });
        // const readResponse = await FileAttributes.findOne({
        // 	where: { id: fileId, userId: ownerId },
        // 	attributes: ['id', '	`s3Key', 'fileName']
        // })
        if (!readResponse) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        // console.log( "readResponse", readResponse?.dataValues);
        // console.log( "readResponse", readResponse.dataValues.FileAttribute.s3Key);
        if (!readResponse.dataValues.FileAttribute.s3Key) {
            (0, responseHandler_1.errorHandler)(res, "File not found", 404, {});
            return;
        }
        const key = `signedUrlShared:${fileId}:${userId}`;
        const signedUrlRedis = await redis_1.default.get(key);
        console.log;
        if (signedUrlRedis) {
            console.log("signedUrlRedis", signedUrlRedis);
            (0, responseHandler_1.successHandler)(res, "File fetched successfully...", signedUrlRedis, 200);
            return;
        }
        const getSignedUrl = await (0, s3Client_1.getObject)(readResponse.dataValues.FileAttribute.s3Key);
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
