import { FileAttributes } from "./FilesModel";
import { FolderFileMap, FolderModel } from "./FolderModel";
import { SharedFiles } from "./SharedFilesModel";
import UserModel from "./UserModel";




FolderModel.belongsToMany(FileAttributes, {
	through: FolderFileMap,
	foreignKey: 'folderUuid',
	as: 'files'
});

FileAttributes.belongsToMany(FolderModel, {
	through: FolderFileMap,
	foreignKey: 'fileId',
	as: 'folders'
});

FileAttributes.hasMany(SharedFiles, {
	foreignKey: 'fileId', constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'
})

SharedFiles.belongsTo(FileAttributes, {
	foreignKey: 'fileId', constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'
});


SharedFiles.belongsTo(UserModel, {
  foreignKey: 'sharedWithUserId',
  targetKey: 'id',
  as: 'sharedWithUser'
});

SharedFiles.belongsTo(UserModel, {
  foreignKey: 'ownerId',
  targetKey: 'id',
  as: 'owner'
});

export { FolderModel, FileAttributes, FolderFileMap, SharedFiles, UserModel };