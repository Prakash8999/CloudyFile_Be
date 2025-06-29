import { DataTypes } from "sequelize";
import sequelize from "../db/Connection";

export const SharedFiles = sequelize.define("sharedFiles", {
	fileId: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: "file_id"
	},

	//sharedByUserId
	ownerId: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: "owner_id"
	},
	sharedWithUserId: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: "shared_with_user_id"
	},
	sharedWithUserEmail: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "shared_with_user_email"
	},
	role: {
		type: DataTypes.ENUM("Reader", "Editor"),
		allowNull: false,
		field: "role",
		defaultValue: "Reader"
	},
	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: "created_at",
	},
	updatedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: "updated_at",
	}
}, {
	timestamps: false,
	tableName: "shared_files",
})