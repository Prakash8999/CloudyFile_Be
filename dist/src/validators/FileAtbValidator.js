"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareLinkValidator = exports.fileStatus = exports.uploadConfirmSchema = exports.fileUrlSchema = exports.fileAttributesSchema = void 0;
const zod_1 = require("zod");
exports.fileAttributesSchema = zod_1.z.object({
    fileName: zod_1.z.string({
        required_error: "File name is required",
        invalid_type_error: "File name must be a string"
    }).min(1, "File name cannot be empty"),
    // fileUid: z.string({
    // 	required_error: "File UID is required",
    // 	invalid_type_error: "File UID must be a string"
    // }).min(1, "File UID cannot be empty"),
    // s3Key: z.string({
    // 	required_error: "File url is required",
    // 	// invalid_type_error: "S3 key must be a string"
    // }).min(1, "File url cannot be empty"),
    fileSize: zod_1.z.number({
        required_error: "File size is required",
        invalid_type_error: "File size must be a number"
    }).nonnegative("File size cannot be negative"),
    contentType: zod_1.z.string({
        required_error: "File type is required",
        invalid_type_error: "File type must be a string"
    }).min(1, "File type cannot be empty"),
    // fileType: z.string({
    // 	required_error: "File type is required",
    // 	invalid_type_error: "File type must be a string"
    // }).min(1, "File type cannot be empty"),
    fileExtension: zod_1.z.string({
        required_error: "File extension is required",
        invalid_type_error: "File extension must be a string"
    }).min(1, "File extension cannot be empty"),
    // isArchived: z.boolean({
    // 	required_error: "IsArchived is required",
    // 	invalid_type_error: "IsArchived must be a boolean"
    // }).default(false),
    // isFavorite: z.boolean({
    // 	invalid_type_error: "IsFavorite must be a boolean"
    // }).optional(),
    // isDeleted: z.boolean({
    // 	required_error: "IsDeleted is required",
    // 	invalid_type_error: "IsDeleted must be a boolean"
    // }).default(false),
    mimeType: zod_1.z.string({
        invalid_type_error: "Mime type must be a string"
    }).optional(),
    tags: zod_1.z.array(zod_1.z.any(), {
        invalid_type_error: "Tags must be an array"
    }).optional(),
    caption: zod_1.z.string({
        invalid_type_error: "Caption must be a string"
    }).optional(),
    embeddingVector: zod_1.z.string({
        invalid_type_error: "Embedding vector must be a string"
    }).optional(),
    dimensions: zod_1.z.string({
        invalid_type_error: "Dimensions must be a string"
    }).optional()
});
exports.fileUrlSchema = zod_1.z.object({
    fileSize: zod_1.z.number(),
    fileType: zod_1.z.string(),
    fileName: zod_1.z.string(),
    userId: zod_1.z.number(),
});
exports.uploadConfirmSchema = zod_1.z.object({
    success: zod_1.z.boolean({
        required_error: "Success status is required"
    }),
    fileId: zod_1.z.number({
        required_error: "File id is required",
        invalid_type_error: "File size must be a number"
    }).nonnegative("File size cannot be negative"),
    // s3Key: z.string({ required_error: "File key is required" }).trim().min(3, { message: "File key must be at least 3 characters long" }),
    folderUuid: zod_1.z.string().optional(),
});
exports.fileStatus = zod_1.z.object({
    isDeleted: zod_1.z.boolean().optional(),
    isFavorite: zod_1.z.boolean().optional(),
    isArchived: zod_1.z.boolean().optional(),
});
exports.shareLinkValidator = zod_1.z.object({
    fileId: zod_1.z.number({ required_error: "File id is required" }).nonnegative("File size cannot be negative"),
    expireAt: zod_1.z.string().optional(),
});
