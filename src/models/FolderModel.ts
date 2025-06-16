import { DataTypes } from "sequelize";
import sequelize from "../db/Connection";

export const FolderModel = sequelize.define('folder', {

	uuid: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},

	name: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "name"
	},

	ownerId: {
		type: DataTypes.INTEGER, // or UUID, depending on your user table
		allowNull: false,
		field: "owner_id"
	},

	parentId: {
		type: DataTypes.UUID,
		allowNull: true,
		field: "parent_id"
	},

	isShared: {
		type: DataTypes.BOOLEAN,
		defaultValue: false,
		field: "is_shared"
	},

	path: {
		type: DataTypes.STRING,
		allowNull: true, // optional: for folder hierarchy path like /folder1/folder2
		field: "path"
	},

	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: "created_at"
	},
	updatedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: "updated_at"
	},
	isDeleted: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		field: "is_deleted",
		defaultValue: false
	},
	deletedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: "deleted_at"
	}
}, {
	timestamps: false,
	tableName: "folder"
});


export const FolderFileMap = sequelize.define('folder_file_map', {

	folderUuid: {
		type: DataTypes.UUID,
		allowNull: false,
		field: "folder_uuid"
	},

	fileId: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: "file_id"
	},

	addedBy: {
		type: DataTypes.INTEGER, // user who added this file to the folder
		allowNull: false,
		field: "added_by"
	},
	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: "created_at"
	},

}, {
	timestamps: false,
	tableName: "folder_file_map"
});
