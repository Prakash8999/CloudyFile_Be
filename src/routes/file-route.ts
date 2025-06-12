import  express  from "express";
import { confirmFileUpload, getFileSignedUrl, readFiles, uploadFileUrl } from "../controllers/FileAttributesCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express.Router()


router.post('/upload',authUser, uploadFileUrl)
router.post('/upload/confirm', authUser, confirmFileUpload);
router.get('/read',authUser, readFiles)
router.get('/read/:id',authUser, getFileSignedUrl)

export default router;