import { z } from "zod";

export const fileAttributesSchema = z.object({

	fileName: z.string({
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

	fileSize: z.number({
		required_error: "File size is required",
		invalid_type_error: "File size must be a number"
	}).nonnegative("File size cannot be negative"),

	contentType: z.string({
		required_error: "File type is required",
		invalid_type_error: "File type must be a string"
	}).min(1, "File type cannot be empty"),
	// fileType: z.string({
	// 	required_error: "File type is required",
	// 	invalid_type_error: "File type must be a string"
	// }).min(1, "File type cannot be empty"),

	fileExtension: z.string({
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

	
	mimeType: z.string({
		invalid_type_error: "Mime type must be a string"
	}).optional(),

	
	tags: z.array(z.any(), {
		invalid_type_error: "Tags must be an array"
	}).optional(),

	caption: z.string({
		invalid_type_error: "Caption must be a string"
	}).optional(),

	embeddingVector: z.string({
		invalid_type_error: "Embedding vector must be a string"
	}).optional(),
	dimensions: z.string({
		invalid_type_error: "Dimensions must be a string"
	}).optional()
});




export const fileUrlSchema = z.object({
	fileSize : z.number(),
	fileType: z.string(),
	fileName: z.string(),
	userId : z.number(),
	
})