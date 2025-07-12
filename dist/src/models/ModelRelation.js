"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.SharedFiles = exports.FolderFileMap = exports.FileAttributes = exports.FolderModel = void 0;
const FilesModel_1 = require("./FilesModel");
Object.defineProperty(exports, "FileAttributes", { enumerable: true, get: function () { return FilesModel_1.FileAttributes; } });
const FolderModel_1 = require("./FolderModel");
Object.defineProperty(exports, "FolderFileMap", { enumerable: true, get: function () { return FolderModel_1.FolderFileMap; } });
Object.defineProperty(exports, "FolderModel", { enumerable: true, get: function () { return FolderModel_1.FolderModel; } });
const SharedFilesModel_1 = require("./SharedFilesModel");
Object.defineProperty(exports, "SharedFiles", { enumerable: true, get: function () { return SharedFilesModel_1.SharedFiles; } });
const UserModel_1 = __importDefault(require("./UserModel"));
exports.UserModel = UserModel_1.default;
FolderModel_1.FolderModel.belongsToMany(FilesModel_1.FileAttributes, {
    through: FolderModel_1.FolderFileMap,
    foreignKey: 'folderUuid',
    as: 'files'
});
FilesModel_1.FileAttributes.belongsToMany(FolderModel_1.FolderModel, {
    through: FolderModel_1.FolderFileMap,
    foreignKey: 'fileId',
    as: 'folders'
});
FilesModel_1.FileAttributes.hasMany(SharedFilesModel_1.SharedFiles, {
    foreignKey: 'fileId', constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'
});
SharedFilesModel_1.SharedFiles.belongsTo(FilesModel_1.FileAttributes, {
    foreignKey: 'fileId', constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'
});
SharedFilesModel_1.SharedFiles.belongsTo(UserModel_1.default, {
    foreignKey: 'sharedWithUserId',
    targetKey: 'id',
    as: 'sharedWithUser'
});
SharedFilesModel_1.SharedFiles.belongsTo(UserModel_1.default, {
    foreignKey: 'ownerId',
    targetKey: 'id',
    as: 'owner'
});
