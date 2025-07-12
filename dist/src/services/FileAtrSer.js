"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteFileIds = exports.getSignedUrlSer = exports.getFileAttributes = exports.deleteFileData = void 0;
const sequelize_1 = require("sequelize");
const FilesModel_1 = require("../models/FilesModel");
const redis_1 = __importDefault(require("../utils/redis"));
const s3Client_1 = require("../utils/s3Client");
const deleteFileData = async (fileId, userId) => {
    await FilesModel_1.FileAttributes.destroy({
        where: {
            id: fileId,
            userId: userId,
        }
    });
    return { success: true, message: "File deleted successfully" };
};
exports.deleteFileData = deleteFileData;
const getFileAttributes = async (fileId, userId) => {
    const ifFileExist = await FilesModel_1.FileAttributes.findOne({
        where: {
            id: fileId,
            userId: userId
        }
    });
    if (!ifFileExist) {
        return { success: false, message: "File not found", data: null, status: 404 };
    }
    return {
        success: true,
        data: ifFileExist,
        message: "File found successfully",
        status: 200
    };
};
exports.getFileAttributes = getFileAttributes;
const getSignedUrlSer = async (s3Key, fileId) => {
    try {
        const key = `signedUrl:${"share"}:${fileId}`;
        const signedUrlRedis = await redis_1.default.get(key);
        console.log;
        if (signedUrlRedis) {
            console.log("signedUrlRedis", signedUrlRedis);
            // successHandler(res, "File fetched successfully...", signedUrlRedis, 200);
            return {
                error: false,
                data: signedUrlRedis,
                message: "File fetched successfully",
                status: 200
            };
        }
        const getSignedUrl = await (0, s3Client_1.getObject)(s3Key);
        if (getSignedUrl.error) {
            // errorHandler(res, "Failed to fetch file", 404, getSignedUrl.error);
            return {
                error: true,
                message: getSignedUrl.message,
                data: null,
                status: 404
            };
        }
        await redis_1.default.set(key, getSignedUrl.signedUrl, { EX: 300 });
        return {
            error: false,
            data: getSignedUrl.signedUrl,
            message: "File fetched successfully",
            status: 200
        };
    }
    catch (error) {
        console.log("Error during file read ", error);
        return {
            error: true,
            message: "Error during file read",
            data: error.message,
            status: 500
        };
    }
};
exports.getSignedUrlSer = getSignedUrlSer;
const validateDeleteFileIds = async (Ids, userId) => {
    try {
        if (!Array.isArray(Ids) ||
            Ids.length === 0 ||
            !Ids.every(id => typeof id === "number" && !isNaN(id))) {
            // errorHandler(res, "Invalid file IDs. Please provide a non-empty array of numbers.", 400, {});
            return {
                error: true,
                message: "Invalid file IDs. Please provide a non-empty array of numbers.",
                statusCode: 400,
                data: []
            };
        }
        const idSet = new Set(Ids);
        console.log(idSet + "id set");
        const ids = [...idSet];
        console.log(" ids ", ids);
        const filesBelongto = await FilesModel_1.FileAttributes.findAll({
            where: {
                userId: userId,
                id: {
                    [sequelize_1.Op.in]: ids
                }
            },
            attributes: ['id', 'fileUid', 's3Key', 'thumbnailKey'],
            raw: true,
            nest: true
        });
        if (filesBelongto.length === 0) {
            return {
                error: true,
                message: "No files found to delete",
                data: [],
                statusCode: 404
            };
        }
        return {
            error: false,
            message: "",
            data: filesBelongto,
            statusCode: 200
        };
    }
    catch (error) {
        return {
            error: true,
            message: error.message,
            data: [],
            statusCode: 500
        };
    }
};
exports.validateDeleteFileIds = validateDeleteFileIds;
