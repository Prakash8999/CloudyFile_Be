"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileSize = void 0;
const responseHandler_1 = require("./responseHandler");
const FilesModel_1 = require("../../models/FilesModel");
const fileSize_1 = require("../../utils/fileSize");
const validateFileSize = async (req, res, next) => {
    try {
        const fileSize = req.body.fileSize;
        if (!fileSize || isNaN(fileSize)) {
            (0, responseHandler_1.errorHandler)(res, "Failed to upload file", 400, {});
            return;
        }
        const fileSizeMb = fileSize / (1024 * 1024);
        console.log("file SizeMb", fileSizeMb);
        if (fileSizeMb > 100) {
            (0, responseHandler_1.errorHandler)(res, "File size is too large! Maximum allowed size is 100MB", 400, {});
            return;
        }
        const userId = req.user?.userId;
        const files = await FilesModel_1.FileAttributes.findAll({
            where: {
                userId: userId
            },
            attributes: ['userId', 'fileSize', 'fileType', 'isFavorite', 'createdAt']
        });
        if (files.length === 0) {
            next();
        }
        const totalUsedSize = files.reduce((total, file) => {
            return total + file.dataValues.fileSize;
        }, 0);
        const totalUsedSizeMb = totalUsedSize / (1024 * 1024);
        console.log("totalUsedSize", totalUsedSizeMb, fileSizeMb);
        if (totalUsedSizeMb + fileSizeMb > fileSize_1.freeFileSizeLimit) {
            (0, responseHandler_1.errorHandler)(res, "File size limit exceeded", 400, {});
            return;
        }
        if (totalUsedSizeMb >= fileSize_1.freeFileSizeLimit) {
            (0, responseHandler_1.errorHandler)(res, "You have reached your file size limit! Please upgrade your plan to upload more files.", 400, {});
            return;
        }
        next();
    }
    catch (error) {
        (0, responseHandler_1.errorHandler)(res, "Failed to upload file", 500, error.message);
        return;
    }
};
exports.validateFileSize = validateFileSize;
