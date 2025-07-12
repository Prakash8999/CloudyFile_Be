"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedFiles = void 0;
const sequelize_1 = require("sequelize");
const Connection_1 = __importDefault(require("../db/Connection"));
exports.SharedFiles = Connection_1.default.define("sharedFiles", {
    fileId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "file_id"
    },
    //sharedByUserId
    ownerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "owner_id"
    },
    sharedWithUserId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "shared_with_user_id"
    },
    sharedWithUserEmail: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: "shared_with_user_email"
    },
    role: {
        type: sequelize_1.DataTypes.ENUM("Reader", "Editor"),
        allowNull: false,
        field: "role",
        defaultValue: "Reader"
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "created_at",
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "updated_at",
    }
}, {
    timestamps: false,
    tableName: "shared_files",
});
