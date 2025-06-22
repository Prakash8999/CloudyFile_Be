import  express  from "express";
import { confirmFileUpload, getFileSignedUrl, readFiles, readFilesByDates, readShareLink, shareLinkPublic, updateFavouriteStatus, uploadFileUrl } from "../controllers/FileAttributesCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express.Router()


router.post('/upload',authUser, uploadFileUrl)
router.post('/upload/confirm', authUser, confirmFileUpload);
router.get('/read',authUser, readFiles)
router.get('/read/:id',authUser, getFileSignedUrl)
router.patch('/change-status/:fileId',authUser,updateFavouriteStatus  )
router.get('/read-latest',authUser, readFilesByDates)

router.post('/share-link', authUser, shareLinkPublic)
router.get('/read-public-link/:fileId', readShareLink)



export default router;