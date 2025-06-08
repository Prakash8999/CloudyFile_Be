import  express  from "express";
import { confirmFileUpload, uploadFileUrl } from "../controllers/FileAttributesCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express.Router()


router.post('/upload',authUser, uploadFileUrl)
router.post('/upload/confirm', authUser, confirmFileUpload);

export default router;