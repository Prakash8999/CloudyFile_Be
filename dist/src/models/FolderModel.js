"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderFileMap = exports.FolderModel = void 0;
const sequelize_1 = require("sequelize");
const Connection_1 = __importDefault(require("../db/Connection"));
exports.FolderModel = Connection_1.default.define('folder', {
    uuid: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: "name"
    },
    ownerId: {
        type: sequelize_1.DataTypes.INTEGER, // or UUID, depending on your user table
        allowNull: false,
        field: "owner_id"
    },
    parentId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "parent_id"
    },
    isShared: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_shared"
    },
    path: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true, // optional: for folder hierarchy path like /folder1/folder2
        field: "path"
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "created_at"
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "updated_at"
    },
    isDeleted: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_deleted",
        defaultValue: false
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
    }
}, {
    timestamps: false,
    tableName: "folder"
});
exports.FolderFileMap = Connection_1.default.define('folder_file_map', {
    folderUuid: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: "folder_uuid"
    },
    fileId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "file_id"
    },
    addedBy: {
        type: sequelize_1.DataTypes.INTEGER, // user who added this file to the folder
        allowNull: false,
        field: "added_by"
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "created_at"
    },
}, {
    timestamps: false,
    tableName: "folder_file_map"
});
