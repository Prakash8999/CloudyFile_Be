import express from 'express';
import { authUser } from '../helper/middleware/authUser';
import { getCollaborators, getSharedFiles, shareFileWithUsers, updateSharedFileCollaborators , getFileSignedUrl} from '../controllers/fileShareCtrl';
const router = express.Router();


router.post('/insert', authUser, shareFileWithUsers)
router.get('/get-shared-files', authUser, getSharedFiles)
router.get('/get-shared-files-url/:id', authUser, getFileSignedUrl)
router.get('/get-collaborators/:fileId', authUser, getCollaborators)
router.patch('/update-shared-file-data', authUser, updateSharedFileCollaborators) 



export default router;