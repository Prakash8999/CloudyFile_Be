import { z } from "zod";

export const shareFilesWithUsersValidator = z.object({
	fileId: z.number({ required_error: "File ID is required" }).int().positive(),
	// sharedWithUsersData: z.array(z.number({ required_error: "Shared with User ID is required" }).int().positive()),
	collaborators: z.array(z.object({
		sharedWithUserId: z.number({ required_error: "Shared with User ID is required" }).int().positive(),
		sharedWithUserEmail: z.string({ required_error: "Shared with User Email is required" }).email({ message: "Invalid email address" }),
		role: z.enum(["Reader", "Editor"], { required_error: "Role is required" }),
	})),



}).strict();



export const updateSharedCollaboratorsValidator = z.object({
  fileId: z.number().int().positive(),
  collaborators: z.array(z.object({
    sharedWithUserId: z.number().int().positive(),
    sharedWithUserEmail: z.string().email(),
    role: z.enum(["Reader", "Editor"])
  }))
});
