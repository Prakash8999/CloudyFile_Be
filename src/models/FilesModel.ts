import { DataTypes } from "sequelize";
import sequelize from "../db/Connection";

export const FileAttributes = sequelize.define('FileAttributes', {
	userId: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: 'user_id'
	},
	fileName: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'file_name'
	},
	fileUid: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'file_uid'
	},
	dimensions: {
		type: DataTypes.STRING,
		allowNull: true,
		field: 'dimensions'
	},
	thumbnailUrl: {
		type: DataTypes.STRING,
		allowNull: true,
		field: 'thumbnail_url'
	},
	thumbnailKey: {
		type: DataTypes.STRING,
		allowNull: true,
		field: 'thumbnail_key'
	},

	s3Key: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 's3_key'
	},
	fileSize: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: 'file_size'
	},
	fileType: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'file_type'
	},
	fileExtension: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'file_extension'
	},
	isArchived: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		field: 'is_archived',
		defaultValue: false
	},
	isFavorite: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		field: 'is_favorite',
	},

	isDeleted: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		field: 'is_deleted',
		defaultValue: false
	},
	deletedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: 'deleted_at',
	},
	mimeType: {
		type: DataTypes.STRING,
		allowNull: true,
		field: 'mime_type',
	},
	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: 'created_at'
	},
	updatedAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: 'updated_at'
	},

	// future part
	tags: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		allowNull: true
	},
	caption: {
		type: DataTypes.STRING,
		allowNull: true
	},
	embeddingVector: {
		type: DataTypes.STRING,
		allowNull: true
	}
}, {
	tableName: "file_attributes",
	timestamps: false,
})



// export const Thumbnail = sequelize.define('thumbnail',{
// 	fileId:{

// 	}
// })