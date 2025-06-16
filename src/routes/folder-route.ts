import express from 'express'
import { authUser } from '../helper/middleware/authUser'
import { insertFolder, readFolders, readOwnFolder } from '../controllers/folderCtrl'

const router = express.Router()

router.post('/insert', authUser, insertFolder)
router.get('/read', authUser, readFolders)
router.get('/read/:id', authUser, readOwnFolder)

export default router
