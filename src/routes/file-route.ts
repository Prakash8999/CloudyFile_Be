import  express  from "express";
import { confirmFileUpload, getFileSignedUrl, readFiles, readFilesByDates, updateFavouriteStatus, uploadFileUrl } from "../controllers/FileAttributesCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express.Router()


router.post('/upload',authUser, uploadFileUrl)
router.post('/upload/confirm', authUser, confirmFileUpload);
router.get('/read',authUser, readFiles)
router.get('/read/:id',authUser, getFileSignedUrl)
router.patch('/change-status/:fileId',authUser,updateFavouriteStatus  )
router.get('/read-latest',authUser, readFilesByDates)


export default router;