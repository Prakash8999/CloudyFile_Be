import express from 'express'
import { authUser } from '../helper/middleware/authUser'
import { insertFolder, readFolders, readOwnFolder, updateFolder } from '../controllers/folderCtrl'

const router = express.Router()

router.post('/insert', authUser, insertFolder)
router.get('/read', authUser, readFolders)
router.get('/read/:id', authUser, readOwnFolder)
router.patch('/update', authUser, updateFolder)
// router.get('/files', authUser, updateFolder)

export default router
