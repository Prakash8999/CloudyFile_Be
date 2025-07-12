"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedLink = exports.FileAttributes = void 0;
const sequelize_1 = require("sequelize");
const Connection_1 = __importDefault(require("../db/Connection"));
exports.FileAttributes = Connection_1.default.define('FileAttributes', {
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_name'
    },
    fileUid: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_uid'
    },
    dimensions: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'dimensions'
    },
    thumbnailUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'thumbnail_url'
    },
    thumbnailKey: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'thumbnail_key'
    },
    s3Key: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 's3_key'
    },
    fileSize: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'file_size'
    },
    fileType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_type'
    },
    fileExtension: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_extension'
    },
    isArchived: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        field: 'is_archived',
        defaultValue: false
    },
    isFavorite: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true,
        field: 'is_favorite',
    },
    isDeleted: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        field: 'is_deleted',
        defaultValue: false
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'mime_type',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    },
    // future part
    tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: true
    },
    caption: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    embeddingVector: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "file_attributes",
    timestamps: false,
});
// export const Thumbnail = sequelize.define('thumbnail',{
// 	fileId:{
// 	}
// })
exports.SharedLink = Connection_1.default.define("sharedLink", {
    fileId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "file_id"
    },
    ownerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "owner_id"
    },
    token: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: "token"
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: sequelize_1.DataTypes.NOW
    },
    expireAt: {
        type: sequelize_1.DataTypes.DATE.toString(),
        allowNull: true,
        field: "expire_at"
    }
}, {
    tableName: "shared_links",
    timestamps: false,
});
