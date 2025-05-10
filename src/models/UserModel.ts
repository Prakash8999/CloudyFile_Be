import { DataTypes } from "sequelize";
import sequelize from "../db/Connection";

const UserModel = sequelize.define("userModel", {
	fullName: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'full_name'
	},
	email: {
		type: DataTypes.STRING,
		allowNull: false,
		field: 'email'
	},
	password: {
		type: DataTypes.STRING,
		allowNull: true,
		field: 'password'
	},
	timeZone: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "time_zone"
	},
	company: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "company"
	},
	twoFa: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false,
		field: "two_fa"
	},
	profileUrl: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "profile_url"
	},
	isEmailVerified: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		field: "is_email_verified"
	},
	role: {
		type: DataTypes.ENUM('user', 'admin'),
		allowNull: false,
		field: "role"
	},
	provider: {
		type: DataTypes.ENUM('email', 'google'),
		allowNull: false,
		field: "provider"
	},
	providerId: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "provider_id"
	},
	otp: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "otp"
	},
	createdAt: {
		type: DataTypes.DATE,
		allowNull: false,
		defaultValue: DataTypes.NOW,
		field: "created_at"
	},
	updatedAt: {
		type: DataTypes.DATE,
		allowNull: false,
		defaultValue: DataTypes.NOW,
		field: "updated_at"
	},
	block: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false,
		field: "block"
	},
	blockedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: "blocked_at"
	}
}, {
	underscored: true,
	timestamps: false,
	tableName: 'users'
})


export default UserModel