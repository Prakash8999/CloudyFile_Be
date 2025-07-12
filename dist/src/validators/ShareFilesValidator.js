"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSharedCollaboratorsValidator = exports.shareFilesWithUsersValidator = void 0;
const zod_1 = require("zod");
exports.shareFilesWithUsersValidator = zod_1.z.object({
    fileId: zod_1.z.number({ required_error: "File ID is required" }).int().positive(),
    // sharedWithUsersData: z.array(z.number({ required_error: "Shared with User ID is required" }).int().positive()),
    collaborators: zod_1.z.array(zod_1.z.object({
        sharedWithUserId: zod_1.z.number({ required_error: "Shared with User ID is required" }).int().positive(),
        sharedWithUserEmail: zod_1.z.string({ required_error: "Shared with User Email is required" }).email({ message: "Invalid email address" }),
        role: zod_1.z.enum(["Reader", "Editor"], { required_error: "Role is required" }),
    })),
}).strict();
exports.updateSharedCollaboratorsValidator = zod_1.z.object({
    fileId: zod_1.z.number().int().positive(),
    collaborators: zod_1.z.array(zod_1.z.object({
        sharedWithUserId: zod_1.z.number().int().positive(),
        sharedWithUserEmail: zod_1.z.string().email(),
        role: zod_1.z.enum(["Reader", "Editor"])
    }))
});
