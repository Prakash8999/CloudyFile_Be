"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderUpdateSchema = exports.folderFileMapSchema = exports.folderSchema = void 0;
const zod_1 = require("zod");
exports.folderSchema = zod_1.z.object({
    name: zod_1.z.string({
        required_error: "Folder name is required",
        invalid_type_error: "Folder name must be a string",
    }).trim().min(1, "Folder name cannot be empty"),
    parentId: zod_1.z.string({
        invalid_type_error: "Parent ID must be a valid UUID",
    }).optional().nullable(),
    isShared: zod_1.z.boolean({
        invalid_type_error: "isShared must be true or false",
    }).optional(),
    path: zod_1.z.string({
        invalid_type_error: "Path must be a string",
    }).optional().nullable(),
    fileIds: zod_1.z.array(zod_1.z.number({ invalid_type_error: "Invalid file id" })).optional()
});
exports.folderFileMapSchema = zod_1.z.object({
    folderId: zod_1.z.number({
        required_error: "Folder ID is required",
        invalid_type_error: "Folder ID must be a number",
    }),
    fileId: zod_1.z.number({
        required_error: "File ID is required",
        invalid_type_error: "File ID must be a number",
    }),
    addedBy: zod_1.z.number({
        required_error: "AddedBy (user ID) is required",
        invalid_type_error: "AddedBy must be a number",
    })
});
exports.folderUpdateSchema = exports.folderSchema.partial().extend({
    uuid: zod_1.z.string({ required_error: "Folder id is required", invalid_type_error: "Invalid id" }).uuid({ message: "Invalid Id" }).trim(),
});
