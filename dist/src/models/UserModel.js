"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Connection_1 = __importDefault(require("../db/Connection"));
const UserModel = Connection_1.default.define("userModel", {
    fullName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'full_name'
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'email'
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'password'
    },
    timeZone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "time_zone"
    },
    company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "company"
    },
    twoFa: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "two_fa"
    },
    profileUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "profile_url"
    },
    isEmailVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_email_verified"
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        field: "role"
    },
    provider: {
        type: sequelize_1.DataTypes.ENUM('email', 'google'),
        allowNull: false,
        field: "provider"
    },
    providerId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "provider_id"
    },
    otp: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "otp"
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "created_at"
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "updated_at"
    },
    block: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "block"
    },
    blockedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "blocked_at"
    }
}, {
    underscored: true,
    timestamps: false,
    tableName: 'users'
});
exports.default = UserModel;
