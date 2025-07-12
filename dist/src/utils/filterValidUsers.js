"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterValidUsers = void 0;
const UserModel_1 = __importDefault(require("../models/UserModel"));
const filterValidUsers = async (users) => {
    // Step 1: Remove duplicate IDs (keep first occurrence)
    const uniqueMap = new Map();
    for (const user of users) {
        if (!uniqueMap.has(user.sharedWithUserId)) {
            uniqueMap.set(user.sharedWithUserId, user);
        }
    }
    const uniqueUsers = Array.from(uniqueMap.values());
    const idsToCheck = uniqueUsers.map(user => user.sharedWithUserId);
    // Step 2: Fetch valid IDs from the DB using Sequelize
    const existingUsers = await UserModel_1.default.findAll({
        where: { id: idsToCheck, block: false, isEmailVerified: true },
        attributes: ['id'],
        raw: true
    });
    const validIds = new Set(existingUsers.map((user) => user.id));
    // Step 3: Return only users whose ID exists in DB
    return uniqueUsers.filter(user => validIds.has(user.sharedWithUserId));
};
exports.filterValidUsers = filterValidUsers;
