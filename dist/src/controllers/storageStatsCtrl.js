"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilesStats = void 0;
const FilesModel_1 = require("../models/FilesModel");
const responseHandler_1 = require("../helper/middleware/responseHandler");
const getFilesStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const files = await FilesModel_1.FileAttributes.findAll({
            where: {
                userId: userId
            },
            attributes: ['userId', 'fileSize', 'fileType', 'isFavorite', 'createdAt']
        });
        if (files.length === 0) {
            (0, responseHandler_1.successHandler)(res, "", [], 200);
            return;
        }
        const totalSize = files.reduce((total, file) => {
            return total + file.dataValues.fileSize;
        }, 0);
        const totalFiles = files.length;
        const favoriteFiles = files.filter(file => file.dataValues.isFavorite).length;
        const response = {
            totalSize,
            totalFiles,
            favoriteFiles,
            files
        };
        (0, responseHandler_1.successHandler)(res, "", files, 200);
    }
    catch (error) {
        console.error(error);
        (0, responseHandler_1.errorHandler)(res, "Failed to fetch storage stats", 500, error.message);
    }
};
exports.getFilesStats = getFilesStats;
