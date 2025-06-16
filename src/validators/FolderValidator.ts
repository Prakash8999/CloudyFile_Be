import { z } from "zod";

export const folderSchema = z.object({
  name: z.string({
    required_error: "Folder name is required",
    invalid_type_error: "Folder name must be a string",
  }).trim().min(1, "Folder name cannot be empty"),


  parentId: z.string({
    invalid_type_error: "Parent ID must be a valid UUID",
  }).optional().nullable(),

  isShared: z.boolean({
    invalid_type_error: "isShared must be true or false",
  }).optional(),

  path: z.string({
    invalid_type_error: "Path must be a string",
  }).optional().nullable(),
  fileIds: z.array(z.number({invalid_type_error: "Invalid file id"})).optional()
});


export const folderFileMapSchema = z.object({
  folderId: z.number({
    required_error: "Folder ID is required",
    invalid_type_error: "Folder ID must be a number",
  }),

  fileId: z.number({
    required_error: "File ID is required",
    invalid_type_error: "File ID must be a number",
  }),

  addedBy: z.number({
    required_error: "AddedBy (user ID) is required",
    invalid_type_error: "AddedBy must be a number",
  })
});



export const folderUpdateSchema =   folderSchema.partial().extend({
    uuid: z.string({required_error: "Folder id is required", invalid_type_error:"Invalid id"}).uuid({message: "Invalid Id"}).trim(),

})