import { FileAttributes } from "./FilesModel";
import { FolderFileMap, FolderModel } from "./FolderModel";




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


export { FolderModel, FileAttributes, FolderFileMap };